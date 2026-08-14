import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { dbTimetzNow } from '../../common/utils/auth.utils';
import { Conversation, ConversationEvent } from '../../database/entities';
import {
  CreateConversationDto,
  CreateConversationEventDto,
} from './dto/conversation.dto';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationsRepository: Repository<Conversation>,
    @InjectRepository(ConversationEvent)
    private readonly eventsRepository: Repository<ConversationEvent>,
  ) {}

  findMine(userId: string) {
    return this.conversationsRepository.find({
      where: [{ buyerUserId: userId }, { sellerUserId: userId }],
      order: { conversationId: 'DESC' },
      take: 50,
    });
  }

  async findOne(conversationId: string) {
    const conversation = await this.conversationsRepository.findOne({
      where: { conversationId },
      relations: { events: true },
    });
    if (!conversation) {
      throw new NotFoundException(`Conversation ${conversationId} not found`);
    }
    return conversation;
  }

  create(buyerUserId: string, dto: CreateConversationDto) {
    const now = dbTimetzNow();
    return this.conversationsRepository.save(
      this.conversationsRepository.create({
        buyerUserId,
        sellerUserId: dto.sellerUserId,
        sourceType: dto.sourceType ?? null,
        sourceId: dto.sourceId ?? null,
        statusCategoryId: dto.statusCategoryId ?? null,
        createdAt: now,
        updatedAt: now,
      }),
    );
  }

  async addEvent(
    senderUserId: string,
    conversationId: string,
    dto: CreateConversationEventDto,
  ) {
    await this.findOne(conversationId);
    return this.eventsRepository.save(
      this.eventsRepository.create({
        conversationId,
        senderUserId,
        senderType: dto.senderType ?? 'user',
        eventType: dto.eventType,
        eventCode: dto.eventCode ?? null,
        payload: dto.payload ?? null,
        createdAt: dbTimetzNow(),
      }),
    );
  }
}
