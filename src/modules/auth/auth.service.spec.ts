import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Profile, User, UserSession } from '../../database/entities';
import { CategoriesService } from '../categories/categories.service';
import { AuthService } from './auth.service';
import { GoogleAuthService } from './google-auth.service';

describe('AuthService Google Sign-In', () => {
  let authService: AuthService;
  let googleAuthService: { verifyIdToken: jest.Mock };
  let usersRepository: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let sessionsRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
  };
  let jwtService: { signAsync: jest.Mock; verifyAsync: jest.Mock };

  const activeGoogleUser: Partial<User> = {
    userId: '10',
    email: 'biz@texzy.com',
    googleId: 'google-sub-123',
    isActive: true,
    isCustomer: false,
    loginProvider: 'google',
    phone: null,
    roleId: null,
    createdAt: null,
    updatedAt: null,
  };

  beforeEach(async () => {
    googleAuthService = {
      verifyIdToken: jest.fn(),
    };
    usersRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    sessionsRepository = {
      create: jest.fn((v) => v),
      save: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    };
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('signed-token'),
      verifyAsync: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: GoogleAuthService, useValue: googleAuthService },
        { provide: getRepositoryToken(User), useValue: usersRepository },
        {
          provide: getRepositoryToken(UserSession),
          useValue: sessionsRepository,
        },
        { provide: getRepositoryToken(Profile), useValue: { save: jest.fn() } },
        {
          provide: CategoriesService,
          useValue: {
            resolveRoleIdForAccountType: jest.fn().mockResolvedValue(2),
            resolveAdminRoleId: jest.fn().mockResolvedValue(1),
            validateBusinessTypeId: jest.fn().mockResolvedValue(1),
            validateBusinessModeId: jest.fn().mockResolvedValue(2),
            validateBusinessCategoryIds: jest.fn().mockResolvedValue([3]),
          },
        },
        { provide: JwtService, useValue: jwtService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, fallback?: string) => {
              const map: Record<string, string> = {
                'jwt.accessExpiresIn': '15m',
                'jwt.refreshExpiresIn': '7d',
                'jwt.googleRegistrationExpiresIn': '10m',
              };
              return map[key] ?? fallback;
            }),
            getOrThrow: jest.fn((key: string) => {
              const map: Record<string, string> = {
                'jwt.accessSecret': 'access-secret',
                'jwt.refreshSecret': 'refresh-secret',
                'jwt.googleRegistrationSecret': 'google-reg-secret',
              };
              return map[key];
            }),
          },
        },
      ],
    }).compile();

    authService = module.get(AuthService);
  });

  it('authenticates an existing Google user', async () => {
    googleAuthService.verifyIdToken.mockResolvedValue({
      googleId: 'google-sub-123',
      email: 'biz@texzy.com',
      emailVerified: true,
      name: 'Biz',
      picture: null,
    });
    usersRepository.findOne.mockResolvedValueOnce(activeGoogleUser);

    const result = await authService.googleSignIn({ idToken: 'valid-token' });

    expect(result.status).toBe('authenticated');
    expect(result).toMatchObject({
      accessToken: 'signed-token',
      refreshToken: 'signed-token',
    });
    expect(sessionsRepository.save).toHaveBeenCalled();
  });

  it('rejects inactive Google users', async () => {
    googleAuthService.verifyIdToken.mockResolvedValue({
      googleId: 'google-sub-123',
      email: 'biz@texzy.com',
      emailVerified: true,
      name: 'Biz',
      picture: null,
    });
    usersRepository.findOne.mockResolvedValueOnce({
      ...activeGoogleUser,
      isActive: false,
    });

    await expect(
      authService.googleSignIn({ idToken: 'valid-token' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('returns registration required for a new Google user', async () => {
    googleAuthService.verifyIdToken.mockResolvedValue({
      googleId: 'new-google-sub',
      email: 'new@texzy.com',
      emailVerified: true,
      name: 'New Biz',
      picture: 'https://example.com/a.png',
    });
    usersRepository.findOne
      .mockResolvedValueOnce(null) // by google_id
      .mockResolvedValueOnce(null); // by email

    const result = await authService.googleSignIn({ idToken: 'valid-token' });

    expect(result).toMatchObject({
      status: 'registration_required',
      requiresBusinessRegistration: true,
      registrationToken: 'signed-token',
      googleProfile: {
        email: 'new@texzy.com',
        name: 'New Biz',
      },
    });
    expect(jwtService.signAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        typ: 'google_registration',
        googleId: 'new-google-sub',
      }),
      expect.any(Object),
    );
  });

  it('returns account conflict when email exists without google_id', async () => {
    googleAuthService.verifyIdToken.mockResolvedValue({
      googleId: 'new-google-sub',
      email: 'existing@texzy.com',
      emailVerified: true,
      name: 'Existing',
      picture: null,
    });
    usersRepository.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({
      userId: '55',
      email: 'existing@texzy.com',
      googleId: null,
      isActive: true,
    });

    const result = await authService.googleSignIn({ idToken: 'valid-token' });

    expect(result).toEqual({
      status: 'account_conflict',
      code: 'ACCOUNT_CONFLICT',
      message: expect.stringContaining('already exists'),
      email: 'existing@texzy.com',
    });
  });

  it('propagates invalid/expired Google token errors', async () => {
    googleAuthService.verifyIdToken.mockRejectedValue(
      new UnauthorizedException('Invalid or expired Google ID token'),
    );

    await expect(
      authService.googleSignIn({ idToken: 'bad-token' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
