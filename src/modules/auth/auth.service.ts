import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import type { StringValue } from 'ms';
import { Repository } from 'typeorm';
import { dbTimetzNow, sanitizeUser } from '../../common/utils/auth.utils';
import { Profile, User, UserSession } from '../../database/entities';
import { GoogleAuthService } from './google-auth.service';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { parseIdentifier } from '../../common/utils/identifier.utils';
import { RegisterAccountType, RegisterDto } from './dto/register.dto';

type TokenPair = {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
};

type AuthSuccessResponse = {
  user: ReturnType<typeof sanitizeUser>;
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
};

type GoogleRegistrationPayload = {
  typ: 'google_registration';
  googleId: string;
  email: string | null;
  name: string | null;
  picture: string | null;
};

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(UserSession)
    private readonly sessionsRepository: Repository<UserSession>,
    @InjectRepository(Profile)
    private readonly profilesRepository: Repository<Profile>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly googleAuthService: GoogleAuthService,
  ) {}

  /** Registers either a customer or a business account, based on dto.accountType. */
  async register(dto: RegisterDto): Promise<AuthSuccessResponse> {
    const parsed = parseIdentifier(dto.identifier);
    if (!parsed) {
      throw new BadRequestException(
        'Enter a valid email or 10–15 digit mobile number',
      );
    }

    const isCustomer = dto.accountType === RegisterAccountType.CUSTOMER;
    const existing =
      parsed.kind === 'email'
        ? await this.usersRepository.findOne({ where: { email: parsed.email } })
        : await this.usersRepository.findOne({
            where: { phone: parsed.phone },
          });

    if (existing) {
      throw new ConflictException(
        parsed.kind === 'email'
          ? 'Email is already registered'
          : 'Phone number is already registered',
      );
    }

    let googleId: string | null = null;
    let loginProvider = parsed.kind === 'phone' ? 'phone' : 'email';

    if (dto.googleRegistrationToken) {
      if (parsed.kind !== 'email') {
        throw new BadRequestException(
          'Google registration requires the verified Google account email',
        );
      }

      const googleClaims = await this.verifyGoogleRegistrationToken(
        dto.googleRegistrationToken,
      );
      googleId = googleClaims.googleId;

      const byGoogle = await this.usersRepository.findOne({
        where: { googleId },
      });
      if (byGoogle) {
        throw new ConflictException('Google account is already linked');
      }

      if (
        googleClaims.email &&
        googleClaims.email.toLowerCase() !== parsed.email
      ) {
        throw new BadRequestException(
          'Registration email must match the verified Google account email',
        );
      }

      loginProvider = 'google';
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const now = dbTimetzNow();

    const user = this.usersRepository.create({
      email: parsed.email,
      phone: parsed.phone,
      passwordHash,
      googleId,
      loginProvider,
      isActive: true,
      isCustomer,
      createdAt: now,
      updatedAt: now,
    });

    const saved = await this.usersRepository.save(user);

    if (!isCustomer && dto.displayName) {
      await this.profilesRepository.save(
        this.profilesRepository.create({
          userId: saved.userId,
          displayName: dto.displayName,
          businessTypeId: dto.businessTypeId ?? null,
          contactEmail: parsed.email,
          contactPhone: parsed.phone,
          createdAt: now,
          updatedAt: now,
        }),
      );
    }

    return this.issueAuthResponse(saved, loginProvider);
  }

  async login(dto: LoginDto): Promise<AuthSuccessResponse> {
    const parsed = parseIdentifier(dto.identifier);
    if (!parsed) {
      throw new UnauthorizedException('Invalid email, phone, or password');
    }

    const user =
      parsed.kind === 'email'
        ? await this.usersRepository.findOne({ where: { email: parsed.email } })
        : await this.usersRepository.findOne({
            where: { phone: parsed.phone },
          });

    if (!user?.passwordHash) {
      throw new UnauthorizedException('Invalid email, phone, or password');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email, phone, or password');
    }

    if (user.isActive === false) {
      throw new UnauthorizedException('Account is inactive');
    }

    return this.issueAuthResponse(user, user.loginProvider ?? 'email');
  }

  async refresh(dto: RefreshTokenDto): Promise<AuthSuccessResponse> {
    let payload: { sub: string; typ?: string };

    try {
      payload = await this.jwtService.verifyAsync(dto.refreshToken, {
        secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (payload.typ !== 'refresh' || !payload.sub) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const session = await this.sessionsRepository.findOne({
      where: {
        refreshToken: dto.refreshToken,
        userId: payload.sub,
        isActive: true,
      },
    });

    if (!session) {
      throw new UnauthorizedException('Session not found or revoked');
    }

    const user = await this.usersRepository.findOne({
      where: { userId: payload.sub },
    });

    if (!user || user.isActive === false) {
      throw new UnauthorizedException('User is inactive or not found');
    }

    session.isActive = false;
    session.logoutAt = dbTimetzNow();
    session.logoutReason = 'refreshed';
    session.updatedAt = dbTimetzNow();
    await this.sessionsRepository.save(session);

    return this.issueAuthResponse(user, user.loginProvider ?? 'email');
  }

  async me(userId: string) {
    const user = await this.usersRepository.findOne({
      where: { userId },
      relations: { profiles: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      user: sanitizeUser(user),
      profile: user.profiles?.[0] ?? null,
    };
  }

  async logout(userId: string, refreshToken?: string) {
    const now = dbTimetzNow();

    if (refreshToken) {
      await this.sessionsRepository.update(
        { userId, refreshToken, isActive: true },
        {
          isActive: false,
          logoutAt: now,
          logoutReason: 'logout',
          updatedAt: now,
        },
      );
    } else {
      await this.sessionsRepository.update(
        { userId, isActive: true },
        {
          isActive: false,
          logoutAt: now,
          logoutReason: 'logout_all',
          updatedAt: now,
        },
      );
    }

    return { success: true };
  }

  /**
   * Google Sign-In for customer and business accounts alike.
   * - Existing google_id → normal JWT login
   * - New Google user → requiresBusinessRegistration + short-lived registration token
   * - Email exists with null google_id → controlled conflict (no auto-link)
   */
  async googleSignIn(dto: GoogleAuthDto) {
    const identity = await this.googleAuthService.verifyIdToken(dto.idToken);

    const byGoogle = await this.usersRepository.findOne({
      where: { googleId: identity.googleId },
    });

    if (byGoogle) {
      if (byGoogle.isActive === false) {
        throw new UnauthorizedException('Account is inactive');
      }

      const auth = await this.issueAuthResponse(byGoogle, 'google');
      return {
        status: 'authenticated' as const,
        ...auth,
      };
    }

    if (identity.email) {
      const byEmail = await this.usersRepository.findOne({
        where: { email: identity.email.toLowerCase() },
      });

      if (byEmail && !byEmail.googleId) {
        return {
          status: 'account_conflict' as const,
          code: 'ACCOUNT_CONFLICT',
          message:
            'An account with this email already exists. Sign in with email/password to link Google from settings.',
          email: identity.email.toLowerCase(),
        };
      }
    }

    const registrationToken = await this.jwtService.signAsync(
      {
        typ: 'google_registration',
        googleId: identity.googleId,
        email: identity.email,
        name: identity.name,
        picture: identity.picture,
      } satisfies GoogleRegistrationPayload,
      {
        secret: this.configService.getOrThrow<string>(
          'jwt.googleRegistrationSecret',
        ),
        expiresIn: this.configService.get<string>(
          'jwt.googleRegistrationExpiresIn',
          '10m',
        ) as StringValue,
      },
    );

    return {
      status: 'registration_required' as const,
      requiresBusinessRegistration: true,
      registrationToken,
      googleProfile: {
        email: identity.email,
        name: identity.name,
        picture: identity.picture,
      },
    };
  }

  private async verifyGoogleRegistrationToken(
    token: string,
  ): Promise<GoogleRegistrationPayload> {
    try {
      const payload =
        await this.jwtService.verifyAsync<GoogleRegistrationPayload>(token, {
          secret: this.configService.getOrThrow<string>(
            'jwt.googleRegistrationSecret',
          ),
        });

      if (payload.typ !== 'google_registration' || !payload.googleId) {
        throw new BadRequestException('Invalid Google registration token');
      }

      return payload;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new UnauthorizedException(
        'Invalid or expired Google registration token',
      );
    }
  }

  private async issueAuthResponse(
    user: User,
    loginProvider: string,
  ): Promise<AuthSuccessResponse> {
    const tokens = await this.createTokenPair(user);
    await this.persistSession(user, tokens, loginProvider);

    return {
      user: sanitizeUser(user),
      ...tokens,
    };
  }

  private async createTokenPair(user: User): Promise<TokenPair> {
    const accessExpiresIn = this.configService.get<string>(
      'jwt.accessExpiresIn',
      '15m',
    ) as StringValue;
    const refreshExpiresIn = this.configService.get<string>(
      'jwt.refreshExpiresIn',
      '7d',
    ) as StringValue;

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          sub: user.userId,
          email: user.email,
          typ: 'access',
        },
        {
          secret: this.configService.getOrThrow<string>('jwt.accessSecret'),
          expiresIn: accessExpiresIn,
        },
      ),
      this.jwtService.signAsync(
        {
          sub: user.userId,
          email: user.email,
          typ: 'refresh',
        },
        {
          secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
          expiresIn: refreshExpiresIn,
        },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: String(accessExpiresIn),
    };
  }

  private async persistSession(
    user: User,
    tokens: TokenPair,
    loginProvider: string,
  ) {
    const now = dbTimetzNow();

    await this.sessionsRepository.save(
      this.sessionsRepository.create({
        userId: user.userId,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        loginProvider,
        loginAt: now,
        lastActivityAt: now,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      }),
    );
  }
}
