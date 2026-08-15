import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { dbTimetzNow } from '../../common/utils/auth.utils';
import { Category, CategoryType } from '../../database/entities';
import {
  CreateCategoryDto,
  CreateCategoryTypeDto,
  UpdateCategoryDto,
} from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
    @InjectRepository(CategoryType)
    private readonly categoryTypesRepository: Repository<CategoryType>,
  ) {}

  findAllTypes() {
    return this.categoryTypesRepository.find({
      order: { categoryTypeId: 'ASC' },
    });
  }

  createType(dto: CreateCategoryTypeDto) {
    const now = dbTimetzNow();
    return this.categoryTypesRepository.save(
      this.categoryTypesRepository.create({
        ...dto,
        isActive: dto.isActive ?? true,
        createdAt: now,
        updatedAt: now,
      }),
    );
  }

  findAll(type?: string) {
    if (!type) {
      return this.categoriesRepository.find({
        relations: { categoryType: true },
        order: { categoryId: 'ASC' },
      });
    }

    return this.categoriesRepository
      .createQueryBuilder('category')
      .leftJoinAndSelect('category.categoryType', 'categoryType')
      .where('category.isActive = true')
      .andWhere('categoryType.categoryType ILIKE :type', { type: `%${type}%` })
      .orderBy('category.categoryId', 'ASC')
      .getMany();
  }

  async findOne(categoryId: string) {
    const category = await this.categoriesRepository.findOne({
      where: { categoryId },
      relations: { categoryType: true },
    });
    if (!category) {
      throw new NotFoundException(`Category ${categoryId} not found`);
    }
    return category;
  }

  create(dto: CreateCategoryDto) {
    const now = dbTimetzNow();
    return this.categoriesRepository.save(
      this.categoriesRepository.create({
        ...dto,
        isActive: dto.isActive ?? true,
        createdAt: now,
        updatedAt: now,
      }),
    );
  }

  async update(categoryId: string, dto: UpdateCategoryDto) {
    const category = await this.findOne(categoryId);
    Object.assign(category, dto, { updatedAt: dbTimetzNow() });
    return this.categoriesRepository.save(category);
  }

  async remove(categoryId: string) {
    const category = await this.findOne(categoryId);
    category.isActive = false;
    category.updatedAt = dbTimetzNow();
    await this.categoriesRepository.save(category);
    return { success: true };
  }
}
