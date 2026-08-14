import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { GoogleAuthService } from './google-auth.service';

const mockVerifyIdToken = jest.fn();

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: mockVerifyIdToken,
  })),
}));

describe('GoogleAuthService', () => {
  let service: GoogleAuthService;

  beforeEach(async () => {
    mockVerifyIdToken.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleAuthService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const map: Record<string, string> = {
                'google.clientId': 'web-client-id',
                'google.androidClientId': 'android-client-id',
                'google.iosClientId': 'ios-client-id',
              };
              return map[key] ?? '';
            }),
          },
        },
      ],
    }).compile();

    service = module.get(GoogleAuthService);
  });

  it('verifies a valid Google token and returns sub as googleId', async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: 'google-sub-abc',
        email: 'user@gmail.com',
        email_verified: true,
        name: 'User',
        picture: 'https://lh3.googleusercontent.com/a',
        iss: 'https://accounts.google.com',
        aud: 'web-client-id',
      }),
    });

    const result = await service.verifyIdToken('valid-id-token');

    expect(result).toEqual({
      googleId: 'google-sub-abc',
      email: 'user@gmail.com',
      emailVerified: true,
      name: 'User',
      picture: 'https://lh3.googleusercontent.com/a',
    });
    expect(mockVerifyIdToken).toHaveBeenCalledWith({
      idToken: 'valid-id-token',
      audience: ['web-client-id', 'android-client-id', 'ios-client-id'],
    });
  });

  it('rejects invalid or expired tokens', async () => {
    mockVerifyIdToken.mockRejectedValue(new Error('Token used too late'));

    await expect(service.verifyIdToken('expired')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects tokens with invalid audience', async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: 'google-sub-abc',
        email: 'user@gmail.com',
        email_verified: true,
        iss: 'https://accounts.google.com',
        aud: 'wrong-audience',
      }),
    });

    await expect(service.verifyIdToken('token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects when Google client IDs are not configured', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleAuthService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(''),
          },
        },
      ],
    }).compile();

    const unconfigured = module.get(GoogleAuthService);

    await expect(unconfigured.verifyIdToken('token')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
