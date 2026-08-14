import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { dbTimetzNow } from '../../common/utils/auth.utils';
import { Need } from '../../database/entities';
import { CreateNeedDto, UpdateNeedDto } from './dto/need.dto';

@Injectable()
export class NeedsService {
  constructor(
    @InjectRepository(Need)
    private readonly needsRepository: Repository<Need>,
  ) {}

  findAll(take = 50) {
    return this.needsRepository.find({
      where: { isActive: true },
      take,
      order: { needId: 'DESC' },
      relations: { media: true, tags: true },
    });
  }

  async findOne(needId: string) {
    const need = await this.needsRepository.findOne({
      where: { needId },
      relations: { media: true, responses: true, tags: true },
    });
    if (!need) {
      throw new NotFoundException(`Need ${needId} not found`);
    }
    return need;
  }

  create(userId: string, dto: CreateNeedDto) {
    const now = dbTimetzNow();
    const need = this.needsRepository.create({
      ...dto,
      userId,
      isActive: true,
      isCustomer: false,
      status: 'open',
      totalViews: 0,
      totalResponses: 0,
      createdAt: now,
      updatedAt: now,
    });
    return this.needsRepository.save(need);
  }

  async update(userId: string, needId: string, dto: UpdateNeedDto) {
    const need = await this.findOne(needId);
    if (need.userId && need.userId !== userId) {
      throw new ForbiddenException('You can only update your own needs');
    }
    Object.assign(need, dto, { updatedAt: dbTimetzNow() });
    return this.needsRepository.save(need);
  }

  async remove(userId: string, needId: string) {
    const need = await this.findOne(needId);
    if (need.userId && need.userId !== userId) {
      throw new ForbiddenException('You can only delete your own needs');
    }
    need.isActive = false;
    need.updatedAt = dbTimetzNow();
    await this.needsRepository.save(need);
    return { success: true };
  }
}
