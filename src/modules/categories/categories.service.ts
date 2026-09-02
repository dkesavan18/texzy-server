import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ROLE_CATEGORY_IDS } from '../../common/constants/role.constants';
import { dbTimetzNow } from '../../common/utils/auth.utils';
import { Category, CategoryType } from '../../database/entities';
import { RegisterAccountType } from '../auth/dto/register.dto';
import {
  CreateCategoryDto,
  CreateCategoryTypeDto,
  UpdateCategoryDto,
} from './dto/category.dto';

export type CategoryTypeGroup = {
  categoryTypeId: number;
  categoryType: string | null;
  categories: {
    categoryId: number;
    categoryName: string | null;
  }[];
};

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
        categoryType: dto.categoryType,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      }),
    );
  }

  async findAllGrouped(): Promise<{ items: CategoryTypeGroup[] }> {
    const types = await this.categoryTypesRepository.find({
      where: { isActive: true },
      order: { categoryTypeId: 'ASC' },
    });

    const categories = await this.categoriesRepository.find({
      where: { isActive: true },
      order: { categoryId: 'ASC' },
    });

    const items: CategoryTypeGroup[] = types.map((type) => ({
      categoryTypeId: type.categoryTypeId,
      categoryType: type.categoryType,
      categories: categories
        .filter((category) => category.categoryTypeId === type.categoryTypeId)
        .map((category) => ({
          categoryId: Number(category.categoryId),
          categoryName: category.categoryName,
        })),
    }));

    return { items };
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
        categoryName: dto.categoryName,
        categoryTypeId: dto.categoryTypeId,
        isActive: true,
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

  isAdminRole(roleId: number | null): boolean {
    return roleId === ROLE_CATEGORY_IDS.ADMIN;
  }

  async validateRoleCategoryId(roleId: number): Promise<number> {
    const category = await this.categoriesRepository.findOne({
      where: { categoryId: String(roleId), isActive: true },
    });

    if (!category) {
      throw new BadRequestException(
        `Role category ${roleId} not found or inactive`,
      );
    }

    return roleId;
  }

  async resolveRoleIdForAccountType(
    accountType: RegisterAccountType,
  ): Promise<number> {
    const roleId =
      accountType === RegisterAccountType.CUSTOMER
        ? ROLE_CATEGORY_IDS.BUYER
        : ROLE_CATEGORY_IDS.SELLER;

    return this.validateRoleCategoryId(roleId);
  }

  async resolveAdminRoleId(): Promise<number> {
    return this.validateRoleCategoryId(ROLE_CATEGORY_IDS.ADMIN);
  }

  async validateBusinessTypeId(businessTypeId: number): Promise<number> {
    return this.validateCategoryByType(businessTypeId, 'business_type');
  }

  async validateBusinessModeId(businessModeId: number): Promise<number> {
    return this.validateCategoryByType(businessModeId, 'business_mode');
  }

  async validateBusinessCategoryIds(businessCategoryIds: number[]): Promise<number[]> {
    const uniqueIds = [...new Set(businessCategoryIds)];
    await Promise.all(
      uniqueIds.map((id) => this.validateCategoryByType(id, 'business_category')),
    );
    return uniqueIds;
  }

  private async findActiveCategoryByType(
    categoryId: number,
    typePattern: string,
  ): Promise<Category | null> {
    return this.categoriesRepository
      .createQueryBuilder('category')
      .leftJoin('category.categoryType', 'categoryType')
      .where('category.category_id = :id', { id: categoryId })
      .andWhere('category.is_active = true')
      .andWhere('categoryType.category_type ILIKE :type', {
        type: `%${typePattern}%`,
      })
      .getOne();
  }

  private async validateCategoryByType(
    categoryId: number,
    typePattern: string,
  ): Promise<number> {
    const category = await this.findActiveCategoryByType(categoryId, typePattern);

    if (!category) {
      throw new BadRequestException(
        `Category ${categoryId} is not a valid ${typePattern} category`,
      );
    }

    return categoryId;
  }
}
