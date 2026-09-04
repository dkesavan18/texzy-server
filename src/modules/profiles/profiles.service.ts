import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { dbTimetzNow } from '../../common/utils/auth.utils';
import { Profile } from '../../database/entities';
import { CategoriesService } from '../categories/categories.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfilesService {
  constructor(
    @InjectRepository(Profile)
    private readonly profilesRepository: Repository<Profile>,
    private readonly categoriesService: CategoriesService,
  ) {}

  findAll(take = 50) {
    return this.profilesRepository.find({
      take,
      order: { profileId: 'DESC' },
    });
  }

  async findOne(profileId: string) {
    const profile = await this.profilesRepository.findOne({
      where: { profileId },
    });
    if (!profile) {
      throw new NotFoundException(`Profile ${profileId} not found`);
    }
    // Fire-and-forget — never slow the detail response for analytics counters.
    void this.profilesRepository
      .increment({ profileId }, 'totalViews', 1)
      .catch(() => undefined);
    return { ...profile, totalViews: (profile.totalViews ?? 0) + 1 };
  }

  async findByUserId(userId: string) {
    const profile = await this.profilesRepository.findOne({
      where: { userId },
    });
    if (!profile) {
      throw new NotFoundException(`Profile for user ${userId} not found`);
    }
    return profile;
  }

  /** Unlike findByUserId, returns null instead of 404 — a business account may not have a profile row yet. */
  findMine(userId: string) {
    return this.profilesRepository.findOne({
      where: { userId },
      relations: { businessType: true, businessMode: true },
    });
  }

  async upsertMine(userId: string, dto: UpdateProfileDto) {
    const now = dbTimetzNow();
    let profile = await this.profilesRepository.findOne({ where: { userId } });

    const payload: Partial<Profile> = {
      ...dto,
      updatedAt: now,
    };

    if (dto.businessTypeId != null) {
      payload.businessTypeId = await this.categoriesService.validateBusinessTypeId(
        dto.businessTypeId,
      );
    }

    if (dto.businessModeId != null) {
      payload.businessModeId = await this.categoriesService.validateBusinessModeId(
        dto.businessModeId,
      );
    }

    if (dto.businessCategoryIds != null) {
      payload.businessCategoryIds =
        await this.categoriesService.validateBusinessCategoryIds(
          dto.businessCategoryIds,
        );
    }

    if (!profile) {
      profile = this.profilesRepository.create({
        userId,
        ...payload,
        createdAt: now,
      });
    } else {
      Object.assign(profile, payload);
    }

    await this.profilesRepository.save(profile);
    return this.findMine(userId);
  }
}
