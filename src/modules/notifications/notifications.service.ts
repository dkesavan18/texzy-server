import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Notification, NotificationToken, User } from '../../database/entities';
import { ROLE_CATEGORY_IDS } from '../../common/constants/role.constants';
import {
  NotificationReferenceTypeValue,
  NotificationTypeValue,
  typesForSection,
  type NotificationSectionValue,
} from './constants/notification-type.constant';
import { FirebasePushService } from './firebase-push.service';

export interface CreateNotificationInput {
  userId: string;
  type: NotificationTypeValue;
  title: string;
  message?: string | null;
  referenceId?: string | null;
  referenceType?: NotificationReferenceTypeValue | null;
  /** Extra key/value pairs merged into the push payload's `data` (e.g. a deep-link path). */
  data?: Record<string, string>;
}

/**
 * Single, reusable entry point for creating Texzy Inbox notifications. Any module (Orders,
 * Needs, Deals, Products, Admin) calls `notify()` / `notifyMany()` instead of writing to the
 * `notifications` table directly — this keeps notification creation + push sending logic
 * in exactly one place.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationsRepository: Repository<Notification>,
    @InjectRepository(NotificationToken)
    private readonly tokensRepository: Repository<NotificationToken>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly firebasePushService: FirebasePushService,
  ) {}

  /**
   * Creates one Inbox notification + best-effort push. Never throws to the caller — a
   * notification failure must never break the order/need/deal flow that triggered it.
   */
  async notify(input: CreateNotificationInput): Promise<Notification | null> {
    try {
      const saved = await this.notificationsRepository.save(
        this.notificationsRepository.create({
          userId: input.userId,
          type: input.type,
          title: input.title,
          message: input.message ?? null,
          referenceId: input.referenceId ?? null,
          referenceType: input.referenceType ?? null,
          isRead: false,
        }),
      );

      await this.sendPush(input);
      return saved;
    } catch (error) {
      this.logger.error(
        `Failed to create notification for user ${input.userId} (${input.type})`,
        error as Error,
      );
      return null;
    }
  }

  /** Fan-out helper for admin broadcasts / multi-recipient events. */
  async notifyMany(
    inputs: CreateNotificationInput[],
  ): Promise<PromiseSettledResult<Notification | null>[]> {
    return Promise.allSettled(inputs.map((input) => this.notify(input)));
  }

  private async sendPush(input: CreateNotificationInput): Promise<void> {
    const tokens = await this.tokensRepository.find({
      where: { userId: input.userId },
    });
    if (tokens.length === 0) return;

    const invalidTokens = await this.firebasePushService.sendToTokens(
      tokens.map((t) => t.token),
      {
        title: input.title,
        body: input.message ?? '',
        data: {
          type: input.type,
          referenceId: input.referenceId ?? '',
          referenceType: input.referenceType ?? '',
          ...(input.data ?? {}),
        },
      },
    );

    if (invalidTokens.length > 0) {
      await this.tokensRepository
        .delete({ token: In(invalidTokens) })
        .catch(() => undefined);
    }
  }

  async findMine(
    userId: string,
    section?: NotificationSectionValue,
    take = 20,
    skip = 0,
  ) {
    const types = typesForSection(section);
    const cappedTake = Math.min(Math.max(take || 20, 1), 100);
    const [items, total] = await this.notificationsRepository.findAndCount({
      where: { userId, ...(types ? { type: In(types) } : {}) },
      order: { notificationId: 'DESC' },
      take: cappedTake,
      skip: Math.max(skip || 0, 0),
    });
    return {
      items,
      total,
      take: cappedTake,
      skip: Math.max(skip || 0, 0),
      hasMore: Math.max(skip || 0, 0) + items.length < total,
    };
  }

  async unreadCount(userId: string) {
    const count = await this.notificationsRepository.count({
      where: { userId, isRead: false },
    });
    return { count };
  }

  async markRead(userId: string, notificationId: string) {
    const notification = await this.notificationsRepository.findOne({
      where: { notificationId, userId },
    });
    if (!notification) {
      throw new NotFoundException(`Notification ${notificationId} not found`);
    }
    if (!notification.isRead) {
      notification.isRead = true;
      await this.notificationsRepository.save(notification);
    }
    return notification;
  }

  async markAllRead(userId: string) {
    await this.notificationsRepository
      .createQueryBuilder()
      .update(Notification)
      .set({ isRead: true })
      .where('user_id = :userId', { userId })
      .andWhere('is_read = false')
      .execute();
    return { success: true };
  }

  async registerToken(userId: string, token: string, platform?: string) {
    const now = new Date();
    const existing = await this.tokensRepository.findOne({ where: { token } });
    if (existing) {
      existing.userId = userId;
      existing.platform = platform ?? existing.platform;
      existing.updatedAt = now;
      return this.tokensRepository.save(existing);
    }
    return this.tokensRepository.save(
      this.tokensRepository.create({
        userId,
        token,
        platform: platform ?? null,
        createdAt: now,
        updatedAt: now,
      }),
    );
  }

  async removeToken(userId: string, token: string) {
    await this.tokensRepository.delete({ userId, token });
    return { success: true };
  }

  /**
   * Admin-only fan-out for "new textile/product" style announcements. Never runs
   * automatically from product creation — always an explicit admin action.
   */
  async resolveAudience(
    audience: 'all' | 'buyers' | 'sellers' | 'users' = 'all',
    userIds?: string[],
  ): Promise<string[]> {
    if (audience === 'users') {
      return [...new Set(userIds ?? [])];
    }
    const roleId =
      audience === 'buyers'
        ? ROLE_CATEGORY_IDS.BUYER
        : audience === 'sellers'
          ? ROLE_CATEGORY_IDS.SELLER
          : undefined;

    const users = await this.usersRepository.find({
      where: { isActive: true, ...(roleId ? { roleId } : {}) },
      select: ['userId'],
    });
    return users.map((u) => u.userId);
  }
}
