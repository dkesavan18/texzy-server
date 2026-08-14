import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { dbTimetzNow } from '../../common/utils/auth.utils';
import { Collection } from '../../database/entities';
import {
  CreateCollectionDto,
  UpdateCollectionDto,
} from './dto/collection.dto';

@Injectable()
export class CollectionsService {
  constructor(
    @InjectRepository(Collection)
    private readonly collectionsRepository: Repository<Collection>,
  ) {}

  findAll(take = 50) {
    return this.collectionsRepository.find({
      where: { isActive: true },
      take,
      order: { collectionId: 'DESC' },
    });
  }

  async findOne(collectionId: string) {
    const collection = await this.collectionsRepository.findOne({
      where: { collectionId },
    });
    if (!collection) {
      throw new NotFoundException(`Collection ${collectionId} not found`);
    }
    return collection;
  }

  create(userId: string, dto: CreateCollectionDto) {
    const now = dbTimetzNow();
    return this.collectionsRepository.save(
      this.collectionsRepository.create({
        ...dto,
        userId,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      }),
    );
  }

  async update(userId: string, collectionId: string, dto: UpdateCollectionDto) {
    const collection = await this.findOne(collectionId);
    if (collection.userId && collection.userId !== userId) {
      throw new ForbiddenException('You can only update your own collections');
    }
    Object.assign(collection, dto, { updatedAt: dbTimetzNow() });
    return this.collectionsRepository.save(collection);
  }

  async remove(userId: string, collectionId: string) {
    const collection = await this.findOne(collectionId);
    if (collection.userId && collection.userId !== userId) {
      throw new ForbiddenException('You can only delete your own collections');
    }
    collection.isActive = false;
    collection.updatedAt = dbTimetzNow();
    await this.collectionsRepository.save(collection);
    return { success: true };
  }
}
