import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { App } from 'firebase-admin/app';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging, type SendResponse } from 'firebase-admin/messaging';

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * Thin wrapper around the Firebase Admin SDK. Never exposes credentials to the client —
 * this service only runs server-side. If Firebase env vars are not configured, push sending
 * becomes a safe no-op (DB notifications + Inbox keep working without web push).
 */
@Injectable()
export class FirebasePushService {
  private readonly logger = new Logger(FirebasePushService.name);
  private app: App | null = null;
  private initAttempted = false;

  constructor(private readonly configService: ConfigService) {}

  private getApp(): App | null {
    if (this.app) return this.app;
    if (this.initAttempted) return null;
    this.initAttempted = true;

    const projectId = this.configService.get<string>('firebase.projectId');
    const clientEmail = this.configService.get<string>('firebase.clientEmail');
    const privateKey = this.configService.get<string>('firebase.privateKey');

    if (!projectId || !clientEmail || !privateKey) {
      this.logger.warn(
        'Firebase Admin credentials not configured — web push notifications are disabled (Inbox DB records still work).',
      );
      return null;
    }

    try {
      const existing = getApps();
      this.app =
        existing.length > 0
          ? existing[0]
          : initializeApp({
              credential: cert({
                projectId,
                clientEmail,
                // .env stores literal \n — convert back to real newlines for the PEM key.
                privateKey: privateKey.replace(/\\n/g, '\n'),
              }),
            });
      return this.app;
    } catch (error) {
      this.logger.error(
        'Failed to initialize Firebase Admin SDK',
        error as Error,
      );
      return null;
    }
  }

  /** Returns tokens that Firebase reported as invalid/unregistered, so callers can prune them. */
  async sendToTokens(
    tokens: string[],
    payload: PushPayload,
  ): Promise<string[]> {
    const app = this.getApp();
    if (!app || tokens.length === 0) return [];

    try {
      const response = await getMessaging(app).sendEachForMulticast({
        tokens,
        notification: { title: payload.title, body: payload.body },
        data: payload.data ?? {},
        webpush: {
          fcmOptions: payload.data?.link
            ? { link: payload.data.link }
            : undefined,
          notification: { icon: '/texzy-icon-v2.png' },
        },
      });

      const invalidTokens: string[] = [];
      response.responses.forEach((result: SendResponse, index: number) => {
        if (result.success) return;
        const code = result.error?.code;
        if (
          code === 'messaging/invalid-registration-token' ||
          code === 'messaging/registration-token-not-registered'
        ) {
          invalidTokens.push(tokens[index]);
        } else {
          this.logger.warn(`FCM send failed: ${code ?? result.error?.message}`);
        }
      });
      return invalidTokens;
    } catch (error) {
      this.logger.error('Failed to send FCM push', error as Error);
      return [];
    }
  }
}
