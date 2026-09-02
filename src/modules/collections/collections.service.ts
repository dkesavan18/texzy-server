import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { R2StorageService } from '../../common/storage/r2-storage.service';
import { dbTimetzNow } from '../../common/utils/auth.utils';
import { Collection } from '../../database/entities';
import { CreateCollectionDto, UpdateCollectionDto } from './dto/collection.dto';

@Injectable()
export class CollectionsService {
  constructor(
    @InjectRepository(Collection)
    private readonly collectionsRepository: Repository<Collection>,
    private readonly storageService: R2StorageService,
  ) {}

  findAll(take = 50) {
    return this.collectionsRepository.find({
      where: { isActive: true },
      take,
      order: { collectionId: 'DESC' },
    });
  }

  findAllByUser(userId: string, take = 100) {
    return this.collectionsRepository.find({
      where: { userId, isActive: true },
      take,
      order: { collectionId: 'DESC' },
    });
  }

  async findOne(collectionId: string) {
    const collection = await this.collectionsRepository.findOne({
      where: { collectionId, isActive: true },
    });
    if (!collection) {
      throw new NotFoundException(`Collection ${collectionId} not found`);
    }
    return collection;
  }

  async findOneMine(userId: string, collectionId: string) {
    const collection = await this.collectionsRepository.findOne({
      where: { collectionId },
    });
    if (!collection || collection.isActive === false) {
      throw new NotFoundException(`Collection ${collectionId} not found`);
    }
    if (collection.userId && collection.userId !== userId) {
      throw new ForbiddenException('You can only view your own collections');
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
    const collection = await this.findOneMine(userId, collectionId);
    Object.assign(collection, dto, { updatedAt: dbTimetzNow() });
    return this.collectionsRepository.save(collection);
  }

  async remove(userId: string, collectionId: string) {
    const collection = await this.findOneMine(userId, collectionId);

    await this.deleteCoverFromStorage(collection.coverImageUrl);

    collection.isActive = false;
    collection.coverImageUrl = null;
    collection.updatedAt = dbTimetzNow();
    await this.collectionsRepository.save(collection);
    return { success: true };
  }

  private async deleteCoverFromStorage(coverImageUrl: string | null) {
    if (!coverImageUrl) {
      return;
    }
    const key = this.storageService.getKeyFromUrl(coverImageUrl);
    if (key) {
      await this.storageService.deleteObject(key).catch(() => undefined);
    }
  }
}
