import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { dbTimetzNow } from '../../common/utils/auth.utils';
import { Deal, DealStatus } from '../../database/entities';
import { CreateDealDto, UpdateDealStatusDto } from './dto/deal.dto';

@Injectable()
export class DealsService {
  constructor(
    @InjectRepository(Deal)
    private readonly dealsRepository: Repository<Deal>,
    @InjectRepository(DealStatus)
    private readonly dealStatusRepository: Repository<DealStatus>,
  ) {}

  findMine(userId: string) {
    return this.dealsRepository.find({
      where: [{ buyerUserId: userId }, { sellerUserId: userId }],
      order: { dealId: 'DESC' },
      take: 50,
      relations: { statusHistory: true },
    });
  }

  async findOne(dealId: string) {
    const deal = await this.dealsRepository.findOne({
      where: { dealId },
      relations: { statusHistory: true },
    });
    if (!deal) {
      throw new NotFoundException(`Deal ${dealId} not found`);
    }
    return deal;
  }

  async create(buyerUserId: string, dto: CreateDealDto) {
    const now = dbTimetzNow();
    const deal = await this.dealsRepository.save(
      this.dealsRepository.create({
        conversationId: dto.conversationId,
        buyerUserId,
        sellerUserId: dto.sellerUserId,
        sourceCategoryId: dto.sourceCategoryId ?? null,
        sourceId: dto.sourceId ?? null,
        finalPrice: dto.finalPrice ?? null,
        quantity: dto.quantity ?? null,
        deliverAddress: dto.deliverAddress ?? null,
        notes: dto.notes ?? null,
        status: 'pending',
        contactShared: false,
        createdAt: now,
      }),
    );

    await this.dealStatusRepository.save(
      this.dealStatusRepository.create({
        dealId: deal.dealId,
        status: 'pending',
        changedBy: buyerUserId,
        createdAt: now,
      }),
    );

    return this.findOne(deal.dealId);
  }

  async updateStatus(
    changedBy: string,
    dealId: string,
    dto: UpdateDealStatusDto,
  ) {
    const deal = await this.findOne(dealId);
    const now = dbTimetzNow();

    deal.status = dto.status;
    if (dto.contactShared !== undefined) {
      deal.contactShared = dto.contactShared;
    }
    if (dto.status === 'completed') {
      deal.completedAt = now;
    }
    await this.dealsRepository.save(deal);

    await this.dealStatusRepository.save(
      this.dealStatusRepository.create({
        dealId,
        status: dto.status,
        changedBy,
        createdAt: now,
      }),
    );

    return this.findOne(dealId);
  }
}
