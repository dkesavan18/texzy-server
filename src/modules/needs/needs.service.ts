import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { dbTimetzNow } from '../../common/utils/auth.utils';
import { Need, NeedResponse, Profile } from '../../database/entities';
import {
  NOTIFICATION_REFERENCE_TYPE,
  NOTIFICATION_TYPE,
} from '../notifications/constants/notification-type.constant';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CreateNeedDto,
  CreateNeedResponseDto,
  UpdateNeedDto,
} from './dto/need.dto';

/**
 * Needs use the existing `needs` / `need_media` / `need_responses` / `response_media` tables.
 * Same ownership pattern as products:
 * - mine  → rows where user_id = caller
 * - market → open rows where user_id != caller
 */
@Injectable()
export class NeedsService {
  constructor(
    @InjectRepository(Need)
    private readonly needsRepository: Repository<Need>,
    @InjectRepository(NeedResponse)
    private readonly responsesRepository: Repository<NeedResponse>,
    @InjectRepository(Profile)
    private readonly profilesRepository: Repository<Profile>,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Market feed — other users' open needs (excludes the caller's own, same as product explore).
   */
  async findPublic(take = 50, excludeUserId?: string) {
    const needs = await this.needsRepository.find({
      where: {
        isActive: true,
        status: 'open',
        ...(excludeUserId ? { userId: Not(excludeUserId) } : {}),
      },
      take,
      order: { needId: 'DESC' },
      relations: { media: true },
    });
    return this.withUsers(needs);
  }

  /** Caller's own posted needs. */
  async findMine(userId: string, take = 100) {
    const needs = await this.needsRepository.find({
      where: { userId, isActive: true },
      take,
      order: { needId: 'DESC' },
      relations: { media: true },
    });
    return this.withUsers(needs);
  }

  async findOne(needId: string) {
    const need = await this.needsRepository.findOne({
      where: { needId, isActive: true },
      relations: {
        media: true,
        responses: { media: true },
      },
    });
    if (!need) {
      throw new NotFoundException(`Need ${needId} not found`);
    }

    void this.needsRepository
      .increment({ needId }, 'totalViews', 1)
      .catch(() => undefined);

    const [withUser] = await this.withUsers([need]);
    const responses = (need.responses ?? [])
      .filter((response) => response.isActive !== false)
      .sort((a, b) => Number(b.needResponseId) - Number(a.needResponseId));

    const responseUsers = await this.sanitizeUsersByIds(
      responses
        .map((response) => response.reponsedBy)
        .filter(Boolean) as string[],
    );

    return {
      ...withUser,
      responses: responses.map((response) => ({
        ...this.sanitizeResponse(response),
        respondedByUser: response.reponsedBy
          ? (responseUsers.get(response.reponsedBy) ?? null)
          : null,
      })),
    };
  }

  async create(userId: string, dto: CreateNeedDto) {
    const now = dbTimetzNow();
    const need = this.needsRepository.create({
      title: dto.title.trim(),
      needDescription: dto.needDescription?.trim() || null,
      needTypeId: dto.needTypeId ?? null,
      needCategoryId: dto.needCategoryId ?? null,
      quantity: dto.quantity ?? null,
      budgetMin: dto.budgetMin ?? null,
      budgetMax: dto.budgetMax ?? null,
      address: dto.address?.trim() || null,
      priority: dto.priority?.trim() || 'normal',
      unit: dto.unit?.trim() || null,
      requiredBefore: dto.requiredBefore?.trim() || null,
      userId,
      isActive: true,
      isCustomer: false,
      status: 'open',
      totalViews: 0,
      totalResponses: 0,
      createdAt: now,
      updatedAt: now,
    });
    const saved = await this.needsRepository.save(need);
    return this.findOne(saved.needId);
  }

  async update(userId: string, needId: string, dto: UpdateNeedDto) {
    const need = await this.requireOwnedNeed(userId, needId);
    Object.assign(need, {
      ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
      ...(dto.needDescription !== undefined
        ? { needDescription: dto.needDescription.trim() || null }
        : {}),
      ...(dto.needTypeId !== undefined ? { needTypeId: dto.needTypeId } : {}),
      ...(dto.needCategoryId !== undefined
        ? { needCategoryId: dto.needCategoryId }
        : {}),
      ...(dto.quantity !== undefined ? { quantity: dto.quantity } : {}),
      ...(dto.budgetMin !== undefined ? { budgetMin: dto.budgetMin } : {}),
      ...(dto.budgetMax !== undefined ? { budgetMax: dto.budgetMax } : {}),
      ...(dto.address !== undefined
        ? { address: dto.address.trim() || null }
        : {}),
      ...(dto.priority !== undefined
        ? { priority: dto.priority.trim() || null }
        : {}),
      ...(dto.unit !== undefined ? { unit: dto.unit.trim() || null } : {}),
      ...(dto.requiredBefore !== undefined
        ? { requiredBefore: dto.requiredBefore.trim() || null }
        : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      updatedAt: dbTimetzNow(),
    });
    await this.needsRepository.save(need);
    return this.findOne(needId);
  }

  async remove(userId: string, needId: string) {
    const need = await this.requireOwnedNeed(userId, needId);
    need.isActive = false;
    need.status = 'cancelled';
    need.updatedAt = dbTimetzNow();
    await this.needsRepository.save(need);
    return { success: true };
  }

  async createResponse(
    userId: string,
    needId: string,
    dto: CreateNeedResponseDto,
  ) {
    const need = await this.needsRepository.findOne({
      where: { needId, isActive: true },
    });
    if (!need) {
      throw new NotFoundException(`Need ${needId} not found`);
    }
    if (need.status && need.status !== 'open') {
      throw new BadRequestException(
        'This request is no longer open for responses',
      );
    }
    if (need.userId === userId) {
      throw new BadRequestException('You cannot respond to your own request');
    }

    const existing = await this.responsesRepository.findOne({
      where: { needId, reponsedBy: userId, isActive: true },
    });
    if (existing) {
      throw new BadRequestException(
        'You have already responded to this request',
      );
    }

    const now = dbTimetzNow();
    const response = this.responsesRepository.create({
      needId,
      // Legacy column FK targets needs.need_id (see NeedResponse entity).
      needUserId: need.needId,
      reponsedBy: userId,
      message: dto.message.trim(),
      availableQuantity: dto.availableQuantity ?? null,
      estimatedPrice: dto.estimatedPrice ?? null,
      unit: dto.unit?.trim() || need.unit || null,
      estimatedDelivery: dto.estimatedDelivery?.trim() || null,
      contactPhone: dto.contactPhone?.trim() || null,
      status: 'pending',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    const saved = await this.responsesRepository.save(response);

    await this.needsRepository
      .increment({ needId }, 'totalResponses', 1)
      .catch(() => undefined);

    const full = await this.responsesRepository.findOne({
      where: { needResponseId: saved.needResponseId },
      relations: { media: true },
    });
    const users = await this.sanitizeUsersByIds([userId]);

    if (need.userId) {
      void this.notificationsService.notify({
        userId: need.userId,
        type: NOTIFICATION_TYPE.REQUEST_RESPONSE,
        title: 'New response to your request',
        message: `${users.get(userId)?.displayName ?? 'A business'} responded to "${need.title ?? 'your request'}".`,
        referenceId: need.needId,
        referenceType: NOTIFICATION_REFERENCE_TYPE.NEED,
        data: { link: `/requests/${need.needId}` },
      });
    }

    return {
      ...this.sanitizeResponse(full ?? saved),
      respondedByUser: users.get(userId) ?? null,
    };
  }

  async listResponses(needId: string) {
    const need = await this.needsRepository.findOne({
      where: { needId, isActive: true },
    });
    if (!need) {
      throw new NotFoundException(`Need ${needId} not found`);
    }

    const responses = await this.responsesRepository.find({
      where: { needId, isActive: true },
      order: { needResponseId: 'DESC' },
      relations: { media: true },
    });
    const users = await this.sanitizeUsersByIds(
      responses
        .map((response) => response.reponsedBy)
        .filter(Boolean) as string[],
    );
    return responses.map((response) => ({
      ...this.sanitizeResponse(response),
      respondedByUser: response.reponsedBy
        ? (users.get(response.reponsedBy) ?? null)
        : null,
    }));
  }

  async acceptResponse(userId: string, needId: string, responseId: string) {
    const need = await this.requireOwnedNeed(userId, needId);
    const response = await this.responsesRepository.findOne({
      where: { needResponseId: responseId, needId, isActive: true },
    });
    if (!response) {
      throw new NotFoundException(`Response ${responseId} not found`);
    }

    const now = dbTimetzNow();
    response.status = 'accepted';
    response.updatedAt = now;
    await this.responsesRepository.save(response);

    await this.responsesRepository
      .createQueryBuilder()
      .update(NeedResponse)
      .set({ status: 'rejected', updatedAt: now })
      .where('need_id = :needId', { needId })
      .andWhere('need_response_id != :responseId', { responseId })
      .andWhere('is_active = true')
      .execute();

    need.acceptedResponseId = responseId;
    need.status = 'fulfilled';
    need.updatedAt = now;
    await this.needsRepository.save(need);

    return this.findOne(needId);
  }

  private async requireOwnedNeed(userId: string, needId: string) {
    const need = await this.needsRepository.findOne({ where: { needId } });
    if (!need || need.isActive === false) {
      throw new NotFoundException(`Need ${needId} not found`);
    }
    if (!need.userId || need.userId !== userId) {
      throw new ForbiddenException('You can only manage your own requests');
    }
    return need;
  }

  private async withUsers(needs: Need[]) {
    const users = await this.sanitizeUsersByIds(
      needs.map((need) => need.userId).filter(Boolean) as string[],
    );
    return needs.map((need) => ({
      ...this.sanitizeNeed(need),
      user: need.userId ? (users.get(need.userId) ?? null) : null,
    }));
  }

  private async sanitizeUsersByIds(userIds: string[]) {
    const unique = [...new Set(userIds.filter(Boolean))];
    const map = new Map<
      string,
      {
        userId: string;
        displayName: string | null;
        profileUrl: string | null;
        location: string | null;
      }
    >();
    if (!unique.length) return map;

    const profiles = await this.profilesRepository
      .createQueryBuilder('profile')
      .where('profile.user_id IN (:...ids)', { ids: unique })
      .getMany();

    for (const userId of unique) {
      const profile = profiles.find((item) => item.userId === userId);
      map.set(userId, {
        userId,
        displayName: profile?.displayName ?? null,
        profileUrl: profile?.profileUrl ?? null,
        location: profile?.location ?? null,
      });
    }
    return map;
  }

  private sanitizeNeed(need: Need) {
    const {
      user: _user,
      responses: _responses,
      tags: _tags,
      needType: _needType,
      needCategory: _needCategory,
      needTagMapping: _needTagMapping,
      ...rest
    } = need;
    return {
      ...rest,
      media: (need.media ?? []).filter((item) => item.isActive !== false),
    };
  }

  private sanitizeResponse(response: NeedResponse) {
    const {
      respondedByUser: _respondedByUser,
      needUser: _needUser,
      need: _need,
      ...rest
    } = response;
    return {
      ...rest,
      media: (response.media ?? []).filter((item) => item.isActive !== false),
    };
  }
}
