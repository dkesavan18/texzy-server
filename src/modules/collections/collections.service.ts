import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { R2StorageService } from '../../common/storage/r2-storage.service';
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

  async create(userId: string, dto: CreateCollectionDto) {
    const collectionType = await this.resolveCollectionType(dto.collectionCategoryId);
    const now = dbTimetzNow();
    return this.collectionsRepository.save(
      this.collectionsRepository.create({
        ...dto,
        collectionCategoryId: collectionType.categoryId,
        collectionTitle: collectionType.categoryName,
        userId,
        isActive: true,
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
