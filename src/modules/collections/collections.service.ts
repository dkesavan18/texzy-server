import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { dbTimetzNow } from '../../common/utils/auth.utils';
import { Category, Collection } from '../../database/entities';
import { CreateCollectionDto, UpdateCollectionDto } from './dto/collection.dto';

@Injectable()
export class CollectionsService {
  constructor(
    @InjectRepository(Collection)
    private readonly collectionsRepository: Repository<Collection>,
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
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
      where: { userId },
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
    if (!collection) {
      throw new NotFoundException(`Collection ${collectionId} not found`);
    }
    if (collection.userId && collection.userId !== userId) {
      throw new ForbiddenException('You can only view your own collections');
    }
    return collection;
  }

  async create(userId: string, dto: CreateCollectionDto) {
    const collectionType = await this.resolveCollectionType(dto.collectionCategoryId);
    const now = dbTimetzNow();
    // Created inactive (draft) until the seller publishes from the preview screen.
    return this.collectionsRepository.save(
      this.collectionsRepository.create({
        ...dto,
        collectionCategoryId: collectionType.categoryId,
        collectionTitle: collectionType.categoryName,
        userId,
        isActive: false,
        createdAt: now,
        updatedAt: now,
      }),
    );
  }

  async update(userId: string, collectionId: string, dto: UpdateCollectionDto) {
    const collection = await this.findOneMine(userId, collectionId);
    const nextCategoryId = dto.collectionCategoryId ?? collection.collectionCategoryId;
    if (nextCategoryId == null) {
      throw new BadRequestException('collectionCategoryId is required');
    }
    const collectionType = await this.resolveCollectionType(nextCategoryId);
    Object.assign(collection, dto, {
      collectionCategoryId: collectionType.categoryId,
      collectionTitle: collectionType.categoryName,
      updatedAt: dbTimetzNow(),
    });
    return this.collectionsRepository.save(collection);
  }

  private async resolveCollectionType(categoryId: number) {
    const category = await this.categoriesRepository
      .createQueryBuilder('category')
      .leftJoinAndSelect('category.categoryType', 'categoryType')
      .where('category.category_id = :id', { id: categoryId })
      .andWhere('category.is_active = true')
      .andWhere('categoryType.category_type = :type', { type: 'collection_type' })
      .getOne();

    if (!category || !category.categoryName?.trim()) {
      throw new BadRequestException('Select a valid collection type');
    }

    return {
      categoryId: Number(category.categoryId),
      categoryName: category.categoryName.trim(),
    };
  }

  /** Publish collection so buyers can see it. */
  async publish(userId: string, collectionId: string) {
    return this.setActive(userId, collectionId, true);
  }

  async setActive(userId: string, collectionId: string, isActive: boolean) {
    const collection = await this.findOneMine(userId, collectionId);
    collection.isActive = isActive;
    collection.updatedAt = dbTimetzNow();
    return this.collectionsRepository.save(collection);
  }

  async remove(userId: string, collectionId: string) {
    // Soft-delete = inactive; keep cover so the seller can reactivate later.
    await this.setActive(userId, collectionId, false);
    return { success: true };
  }
}
