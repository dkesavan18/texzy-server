import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ROLE_CATEGORY_IDS } from '../../common/constants/role.constants';
import { dbTimetzNow } from '../../common/utils/auth.utils';
import { isUniqueViolation, toUpperSnakeCode } from '../../common/utils/code.utils';
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
  code: string | null;
  categories: {
    categoryId: number;
    categoryName: string | null;
    code: string | null;
    parentId: number | null;
    displayOrder: number;
    metadata: Record<string, unknown> | null;
  }[];
};

export type CategoryOptionItem = {
  categoryId: number;
  code: string | null;
  name: string | null;
  parentId: number | null;
  displayOrder: number;
  hex: string | null;
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

  async createType(dto: CreateCategoryTypeDto) {
    const now = dbTimetzNow();
    const code = dto.code ?? toUpperSnakeCode(dto.categoryType);
    if (!code) {
      throw new BadRequestException('categoryType must contain letters or digits');
    }

    try {
      return await this.categoryTypesRepository.save(
        this.categoryTypesRepository.create({
          categoryType: dto.categoryType,
          code,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        }),
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(`Category type code "${code}" already exists`);
      }
      throw error;
    }
  }

  async findAllGrouped(): Promise<{ items: CategoryTypeGroup[] }> {
    const types = await this.categoryTypesRepository.find({
      where: { isActive: true },
      order: { categoryTypeId: 'ASC' },
    });

    const categories = await this.categoriesRepository.find({
      where: { isActive: true },
      order: { displayOrder: 'ASC', categoryId: 'ASC' },
    });

    const items: CategoryTypeGroup[] = types.map((type) => ({
      categoryTypeId: type.categoryTypeId,
      categoryType: type.categoryType,
      code: type.code,
      categories: categories
        .filter((category) => category.categoryTypeId === type.categoryTypeId)
        .map((category) => ({
          categoryId: Number(category.categoryId),
          categoryName: category.categoryName,
          code: category.code,
          parentId: category.parentId != null ? Number(category.parentId) : null,
          displayOrder: category.displayOrder,
          metadata: category.metadata,
        })),
    }));

    return { items };
  }

  /** `type` matches the category type name or code exactly (case-insensitive). */
  findAll(type?: string) {
    if (!type) {
      return this.categoriesRepository.find({
        relations: { categoryType: true },
        order: { displayOrder: 'ASC', categoryId: 'ASC' },
      });
    }

    return this.categoriesRepository
      .createQueryBuilder('category')
      .leftJoinAndSelect('category.categoryType', 'categoryType')
      .where('category.isActive = true')
      .andWhere(
        '(LOWER(categoryType.categoryType) = LOWER(:type) OR categoryType.code = :code)',
        { type, code: toUpperSnakeCode(type) },
      )
      .orderBy('category.displayOrder', 'ASC')
      .addOrderBy('category.categoryId', 'ASC')
      .getMany();
  }

  /**
   * Dropdown options of one option set (e.g. COLOUR, MATERIAL). `parentId` narrows to the
   * children of one option; `rootOnly` returns only top-level options.
   */
  async findOptions(
    typeCode: string,
    filters: { parentId?: string; rootOnly?: boolean } = {},
  ): Promise<CategoryOptionItem[]> {
    const query = this.categoriesRepository
      .createQueryBuilder('category')
      .innerJoin('category.categoryType', 'categoryType')
      .where('category.isActive = true')
      .andWhere('categoryType.isActive = true')
      .andWhere('categoryType.code = :code', { code: toUpperSnakeCode(typeCode) });

    if (filters.parentId) {
      query.andWhere('category.parentId = :parentId', { parentId: filters.parentId });
    } else if (filters.rootOnly) {
      query.andWhere('category.parentId IS NULL');
    }

    const rows = await query
      .orderBy('category.displayOrder', 'ASC')
      .addOrderBy('category.categoryId', 'ASC')
      .getMany();

    return rows.map((row) => ({
      categoryId: Number(row.categoryId),
      code: row.code,
      name: row.categoryName,
      parentId: row.parentId != null ? Number(row.parentId) : null,
      displayOrder: row.displayOrder,
      hex: typeof row.metadata?.hex === 'string' ? row.metadata.hex : null,
    }));
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

  async create(dto: CreateCategoryDto) {
    const now = dbTimetzNow();
    const code = dto.code ?? toUpperSnakeCode(dto.categoryName);
    if (!code) {
      throw new BadRequestException('categoryName must contain letters or digits');
    }
    await this.assertValidParent(dto.parentId, dto.categoryTypeId ?? null);

    try {
      return await this.categoriesRepository.save(
        this.categoriesRepository.create({
          categoryName: dto.categoryName,
          categoryTypeId: dto.categoryTypeId,
          code,
          parentId: dto.parentId != null ? String(dto.parentId) : null,
          displayOrder: dto.displayOrder ?? 0,
          metadata: dto.metadata ?? null,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        }),
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(`Category code "${code}" already exists in this category type`);
      }
      throw error;
    }
  }

  async update(categoryId: string, dto: UpdateCategoryDto) {
    const category = await this.findOne(categoryId);

    if (dto.parentId !== undefined) {
      if (dto.parentId != null && String(dto.parentId) === category.categoryId) {
        throw new BadRequestException('A category cannot be its own parent');
      }
      await this.assertValidParent(
        dto.parentId,
        dto.categoryTypeId ?? category.categoryTypeId,
      );
      category.parentId = dto.parentId != null ? String(dto.parentId) : null;
    }
    if (dto.categoryName !== undefined) category.categoryName = dto.categoryName;
    if (dto.categoryTypeId !== undefined) category.categoryTypeId = dto.categoryTypeId;
    if (dto.code !== undefined) category.code = dto.code;
    if (dto.displayOrder !== undefined) category.displayOrder = dto.displayOrder;
    if (dto.metadata !== undefined) category.metadata = dto.metadata;
    if (dto.isActive !== undefined) category.isActive = dto.isActive;
    category.updatedAt = dbTimetzNow();

    try {
      return await this.categoriesRepository.save(category);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          `Category code "${category.code}" already exists in this category type`,
        );
      }
      throw error;
    }
  }

  async remove(categoryId: string) {
    const category = await this.findOne(categoryId);
    category.isActive = false;
    category.updatedAt = dbTimetzNow();
    await this.categoriesRepository.save(category);
    return { success: true };
  }

  /** A parent must exist and live in the same category type as the child. */
  private async assertValidParent(
    parentId: number | null | undefined,
    categoryTypeId: number | null,
  ): Promise<void> {
    if (parentId == null) return;
    const parent = await this.categoriesRepository.findOne({
      where: { categoryId: String(parentId) },
    });
    if (!parent) {
      throw new BadRequestException(`Parent category ${parentId} not found`);
    }
    if (categoryTypeId != null && parent.categoryTypeId !== categoryTypeId) {
      throw new BadRequestException('Parent category must belong to the same category type');
    }
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
