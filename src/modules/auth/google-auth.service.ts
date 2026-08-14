import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client, TokenPayload } from 'google-auth-library';

export type VerifiedGoogleIdentity = {
  googleId: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
  picture: string | null;
};

@Injectable()
export class GoogleAuthService {
  private readonly client: OAuth2Client;
  private readonly audiences: string[];

  constructor(private readonly configService: ConfigService) {
    this.client = new OAuth2Client();
    this.audiences = [
      this.configService.get<string>('google.clientId', ''),
      this.configService.get<string>('google.androidClientId', ''),
      this.configService.get<string>('google.iosClientId', ''),
    ].filter((id) => Boolean(id));
  }

  /**
   * Verifies Google ID token server-side (signature, issuer, audience, expiry).
   * Never trust client-supplied googleId/email. Never log the raw idToken.
   */
  async verifyIdToken(idToken: string): Promise<VerifiedGoogleIdentity> {
    if (!this.audiences.length) {
      throw new BadRequestException(
        'Google Sign-In is not configured. Set GOOGLE_CLIENT_ID / ANDROID / IOS client IDs.',
      );
    }

    let payload: TokenPayload | undefined;

    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: this.audiences,
      });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Invalid or expired Google ID token');
    }

    if (!payload?.sub) {
      throw new UnauthorizedException('Google token missing subject (sub)');
    }

    const issuer = payload.iss;
    if (
      issuer !== 'accounts.google.com' &&
      issuer !== 'https://accounts.google.com'
    ) {
      throw new UnauthorizedException('Invalid Google token issuer');
    }

    if (payload.aud && !this.audiences.includes(String(payload.aud))) {
      throw new UnauthorizedException('Invalid Google token audience');
    }

    return {
      googleId: payload.sub,
      email: payload.email ?? null,
      emailVerified: Boolean(payload.email_verified),
      name: payload.name ?? null,
      picture: payload.picture ?? null,
    };
  }
}
