import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { dbTimetzNow } from '../../common/utils/auth.utils';
import { Profile } from '../../database/entities';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfilesService {
  constructor(
    @InjectRepository(Profile)
    private readonly profilesRepository: Repository<Profile>,
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
    return profile;
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
      relations: { businessType: true },
    });
  }

  async upsertMine(userId: string, dto: UpdateProfileDto) {
    const now = dbTimetzNow();
    let profile = await this.profilesRepository.findOne({ where: { userId } });

    if (!profile) {
      profile = this.profilesRepository.create({
        userId,
        ...dto,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      Object.assign(profile, dto, { updatedAt: now });
    }

    await this.profilesRepository.save(profile);
    return this.findMine(userId);
  }
}
