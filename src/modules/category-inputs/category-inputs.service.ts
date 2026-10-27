import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { isUniqueViolation } from '../../common/utils/code.utils';
import {
  Category,
  CategoryInputMapping,
  CategoryType,
} from '../../database/entities';
import type {
  ValidationRules,
  VisibilityRule,
} from '../../database/entities/category-input-mapping.entity';
import {
  CreateCategoryInputDto,
  UpdateCategoryInputDto,
} from './dto/category-input.dto';
import {
  FormConfig,
  FormFieldConfig,
  FormOption,
  PRODUCT_CATEGORY_TYPE_CODE,
} from './category-inputs.types';

const SELECT_TYPES = new Set(['SINGLE_SELECT', 'MULTI_SELECT', 'COLOR_SELECT']);

@Injectable()
export class CategoryInputsService {
  constructor(
    @InjectRepository(CategoryInputMapping)
    private readonly mappingRepository: Repository<CategoryInputMapping>,
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
    @InjectRepository(CategoryType)
    private readonly categoryTypesRepository: Repository<CategoryType>,
  ) {}

  // ---------------------------------------------------------------------------
  // Form config (read) — what the web app renders
  // ---------------------------------------------------------------------------

  /** Resolves global -> group -> product-type inputs for one product category. */
  async resolveConfig(categoryId: string): Promise<FormConfig> {
    const category = await this.findProductCategory(categoryId);
    const parent = category.parentId
      ? await this.categoriesRepository.findOne({ where: { categoryId: category.parentId } })
      : null;

    const scopeIds = [category.categoryId, ...(parent ? [parent.categoryId] : [])];
    const rows = await this.mappingRepository.find({
      where: [{ categoryId: IsNull() }, { categoryId: In(scopeIds) }],
    });

    // Most specific definition wins: type > group > global.
    const rank = (row: CategoryInputMapping) =>
      row.categoryId === null ? 0 : row.categoryId === category.categoryId ? 2 : 1;
    const byKey = new Map<string, CategoryInputMapping>();
    for (const row of [...rows].sort((a, b) => rank(a) - rank(b))) {
      byKey.set(row.inputKey, row);
    }

    const active = [...byKey.values()]
      .filter((row) => row.isActive)
      .sort(
        (a, b) =>
          (a.stepKey === b.stepKey ? 0 : a.stepKey === 'details' ? -1 : 1) ||
          a.displayOrder - b.displayOrder ||
          Number(a.id) - Number(b.id),
      );

    const fields = active.map((row): FormFieldConfig => {
      const rowRank = rank(row);
      const optionType = SELECT_TYPES.has(row.inputType) ? row.optionCategoryType : null;
      return {
        id: row.id,
        key: row.inputKey,
        label: row.inputLabel,
        type: row.inputType,
        optionType,
        optionSetKey: optionType ? this.optionSetKey(optionType, row) : null,
        stepKey: row.stepKey,
        sectionKey: row.sectionKey,
        sectionLabel: row.sectionLabel,
        required: row.isRequired,
        isVariantAttribute: row.isVariantAttribute,
        order: row.displayOrder,
        rules: row.validationRules ?? {},
        visibility: row.visibilityRule,
        unit: row.unit,
        units: row.unitOptions,
        defaultValue: row.defaultValue,
        placeholder: row.placeholder,
        helpText: row.helpText,
        scope: rowRank === 0 ? 'GLOBAL' : rowRank === 1 ? 'GROUP' : 'TYPE',
      };
    });

    const optionSets = await this.loadOptionSets(active);

    const group = parent ?? (category.parentId === null ? category : null);
    return {
      category: {
        categoryId: category.categoryId,
        code: category.code,
        name: category.categoryName,
        groupId: group?.categoryId ?? null,
        groupCode: group?.code ?? null,
        groupName: group?.categoryName ?? null,
      },
      fields,
      optionSets,
    };
  }

  private optionSetKey(optionType: string, row: CategoryInputMapping): string {
    let key = optionType;
    if (row.optionParentId) key += `:p${row.optionParentId}`;
    if (row.validationRules?.optionsRootOnly) key += ':root';
    return key;
  }

  private async loadOptionSets(
    rows: CategoryInputMapping[],
  ): Promise<Record<string, FormOption[]>> {
    const wanted = new Map<string, CategoryInputMapping>();
    for (const row of rows) {
      if (!SELECT_TYPES.has(row.inputType) || !row.optionCategoryType) continue;
      wanted.set(this.optionSetKey(row.optionCategoryType, row), row);
    }
    if (wanted.size === 0) return {};

    const typeCodes = [...new Set([...wanted.values()].map((row) => row.optionCategoryType!))];
    const options = await this.categoriesRepository
      .createQueryBuilder('category')
      .innerJoinAndSelect('category.categoryType', 'categoryType')
      .where('category.isActive = true')
      .andWhere('categoryType.isActive = true')
      .andWhere('categoryType.code IN (:...typeCodes)', { typeCodes })
      .orderBy('category.displayOrder', 'ASC')
      .addOrderBy('category.categoryId', 'ASC')
      .getMany();

    const sets: Record<string, FormOption[]> = {};
    for (const [key, row] of wanted) {
      sets[key] = options
        .filter((option) => option.categoryType?.code === row.optionCategoryType)
        .filter((option) =>
          row.optionParentId ? option.parentId === row.optionParentId : true,
        )
        .filter((option) =>
          row.validationRules?.optionsRootOnly ? option.parentId === null : true,
        )
        .filter((option) => Boolean(option.code))
        .map((option) => ({
          categoryId: option.categoryId,
          code: option.code!,
          name: option.categoryName ?? option.code!,
          parentId: option.parentId,
          hex: typeof option.metadata?.hex === 'string' ? option.metadata.hex : null,
        }));
    }
    return sets;
  }

  /** The category must be an active PRODUCT_CATEGORY row (group or product type). */
  async findProductCategory(categoryId: string): Promise<Category> {
    if (!/^\d+$/.test(String(categoryId))) {
      throw new BadRequestException('categoryId must be a number');
    }
    const category = await this.categoriesRepository.findOne({
      where: { categoryId: String(categoryId), isActive: true },
      relations: { categoryType: true },
    });
    if (!category || category.categoryType?.code !== PRODUCT_CATEGORY_TYPE_CODE) {
      throw new NotFoundException(`Product category ${categoryId} not found`);
    }
    return category;
  }

  // ---------------------------------------------------------------------------
  // CRUD (admin)
  // ---------------------------------------------------------------------------

  async list(filters: { categoryId?: string; includeInactive?: boolean } = {}) {
    const query = this.mappingRepository
      .createQueryBuilder('mapping')
      .orderBy('mapping.stepKey', 'ASC')
      .addOrderBy('mapping.displayOrder', 'ASC')
      .addOrderBy('mapping.id', 'ASC');

    if (filters.categoryId === 'global') {
      query.andWhere('mapping.categoryId IS NULL');
    } else if (filters.categoryId) {
      query.andWhere('mapping.categoryId = :categoryId', { categoryId: filters.categoryId });
    }
    if (!filters.includeInactive) {
      query.andWhere('mapping.isActive = true');
    }
    return query.getMany();
  }

  async findOne(id: string) {
    const row = await this.mappingRepository.findOne({ where: { id } });
    if (!row) throw new NotFoundException(`Category input ${id} not found`);
    return row;
  }

  async create(dto: CreateCategoryInputDto) {
    await this.validateDefinition(dto);
    const now = new Date();

    try {
      return await this.mappingRepository.save(
        this.mappingRepository.create({
          categoryId: dto.categoryId != null ? String(dto.categoryId) : null,
          inputKey: dto.inputKey,
          inputLabel: dto.inputLabel,
          inputType: dto.inputType,
          optionCategoryType: dto.optionCategoryType ?? null,
          optionParentId: dto.optionParentId != null ? String(dto.optionParentId) : null,
          stepKey: dto.stepKey ?? 'details',
          sectionKey: dto.sectionKey ?? 'basic',
          sectionLabel: dto.sectionLabel ?? 'Basic Information',
          isRequired: dto.isRequired ?? false,
          isVariantAttribute: dto.isVariantAttribute ?? false,
          displayOrder: dto.displayOrder ?? 0,
          validationRules: (dto.validationRules ?? {}) as ValidationRules,
          visibilityRule: (dto.visibilityRule ?? null) as VisibilityRule | null,
          unit: dto.unit ?? null,
          unitOptions: dto.unitOptions ?? null,
          defaultValue: dto.defaultValue ?? null,
          placeholder: dto.placeholder ?? null,
          helpText: dto.helpText ?? null,
          isActive: dto.isActive ?? true,
          createdAt: now,
          updatedAt: now,
        }),
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          `Input "${dto.inputKey}" is already defined for this category`,
        );
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateCategoryInputDto) {
    const row = await this.findOne(id);
    const merged = {
      categoryId: row.categoryId != null ? Number(row.categoryId) : null,
      inputKey: row.inputKey,
      inputLabel: row.inputLabel,
      inputType: row.inputType,
      optionCategoryType: row.optionCategoryType,
      unit: row.unit,
      ...dto,
    } as CreateCategoryInputDto;
    await this.validateDefinition(merged);

    if (dto.categoryId !== undefined) {
      row.categoryId = dto.categoryId != null ? String(dto.categoryId) : null;
    }
    if (dto.inputKey !== undefined) row.inputKey = dto.inputKey;
    if (dto.inputLabel !== undefined) row.inputLabel = dto.inputLabel;
    if (dto.inputType !== undefined) row.inputType = dto.inputType;
    if (dto.optionCategoryType !== undefined) row.optionCategoryType = dto.optionCategoryType;
    if (dto.optionParentId !== undefined) {
      row.optionParentId = dto.optionParentId != null ? String(dto.optionParentId) : null;
    }
    if (dto.stepKey !== undefined) row.stepKey = dto.stepKey;
    if (dto.sectionKey !== undefined) row.sectionKey = dto.sectionKey;
    if (dto.sectionLabel !== undefined) row.sectionLabel = dto.sectionLabel;
    if (dto.isRequired !== undefined) row.isRequired = dto.isRequired;
    if (dto.isVariantAttribute !== undefined) row.isVariantAttribute = dto.isVariantAttribute;
    if (dto.displayOrder !== undefined) row.displayOrder = dto.displayOrder;
    if (dto.validationRules !== undefined) row.validationRules = dto.validationRules as ValidationRules;
    if (dto.visibilityRule !== undefined) {
      row.visibilityRule = dto.visibilityRule as VisibilityRule | null;
    }
    if (dto.unit !== undefined) row.unit = dto.unit;
    if (dto.unitOptions !== undefined) row.unitOptions = dto.unitOptions;
    if (dto.defaultValue !== undefined) row.defaultValue = dto.defaultValue;
    if (dto.placeholder !== undefined) row.placeholder = dto.placeholder;
    if (dto.helpText !== undefined) row.helpText = dto.helpText;
    if (dto.isActive !== undefined) row.isActive = dto.isActive;
    row.updatedAt = new Date();

    try {
      return await this.mappingRepository.save(row);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          `Input "${row.inputKey}" is already defined for this category`,
        );
      }
      throw error;
    }
  }

  /** Soft-delete: stored product values keep their meaning, the field just stops being offered. */
  async remove(id: string) {
    const row = await this.findOne(id);
    row.isActive = false;
    row.updatedAt = new Date();
    await this.mappingRepository.save(row);
    return { success: true };
  }

  private async validateDefinition(dto: CreateCategoryInputDto): Promise<void> {
    if (dto.categoryId != null) {
      await this.findProductCategory(String(dto.categoryId));
    }

    if (SELECT_TYPES.has(dto.inputType)) {
      if (!dto.optionCategoryType) {
        throw new BadRequestException(`${dto.inputType} inputs require optionCategoryType`);
      }
      const type = await this.categoryTypesRepository.findOne({
        where: { code: dto.optionCategoryType, isActive: true },
      });
      if (!type) {
        throw new BadRequestException(
          `optionCategoryType "${dto.optionCategoryType}" is not an active category type code`,
        );
      }
    }

    if (dto.inputType === 'MEASUREMENT' && !dto.unit) {
      throw new BadRequestException('MEASUREMENT inputs require a default unit');
    }
  }
}
