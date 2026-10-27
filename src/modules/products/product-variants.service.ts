import { BadRequestException, Injectable } from '@nestjs/common';
import { EntityManager, In } from 'typeorm';
import {
  Product,
  ProductPriceTier,
  ProductVariant,
  ProductVariantAttribute,
} from '../../database/entities';
import type { FormConfig, FormFieldConfig } from '../category-inputs/category-inputs.types';
import { ProductPriceTierDto, ProductVariantDto } from './dto/product-variant.dto';

export const MAX_VARIANTS_PER_PRODUCT = 300;
export const MAX_PRICE_TIERS_PER_PRODUCT = 20;

const SELECT_TYPES = new Set(['SINGLE_SELECT', 'COLOR_SELECT']);

type NormalisedAttribute = {
  key: string;
  optionCategoryId: string | null;
  valueText: string | null;
  /** `key=value` token used for the combination signature. */
  token: string;
};

@Injectable()
export class ProductVariantsService {
  /** Keys of the inputs that sellers may turn into variants for this category. */
  variantFields(config: FormConfig | null): FormFieldConfig[] {
    return (config?.fields ?? []).filter((field) => field.isVariantAttribute);
  }

  /**
   * Replaces the product's variants with `dtos` (matching by `productVariantId`), keeping
   * attribute rows and the combination signature in step. Variants missing from the payload are
   * soft-deleted (`is_active = false`) so historical cart / order references survive.
   */
  async syncVariants(
    manager: EntityManager,
    product: Product,
    config: FormConfig | null,
    dtos: ProductVariantDto[],
  ): Promise<ProductVariant[]> {
    if (dtos.length > MAX_VARIANTS_PER_PRODUCT) {
      throw new BadRequestException(
        `A product can have at most ${MAX_VARIANTS_PER_PRODUCT} variants`,
      );
    }

    const productId = product.productId;
    const fields = new Map(this.variantFields(config).map((field) => [field.key, field]));
    const optionIds = this.optionIdsByKey(config, fields);
    const errors: string[] = [];

    const seenCombinations = new Set<string>();
    const seenSkus = new Set<string>();
    const mediaIds = new Set(
      (product.media ?? [])
        .filter((media) => media.mediaType !== 'video')
        .map((media) => media.productMediaId),
    );

    const prepared = dtos.map((dto, index) => {
      const label = `Variant ${index + 1}`;
      const attributes = this.normaliseAttributes(dto, fields, optionIds, label, errors);
      const combinationKey =
        attributes.length > 0
          ? attributes
              .map((attribute) => attribute.token)
              .sort()
              .join('|')
          : null;

      if (combinationKey) {
        if (seenCombinations.has(combinationKey)) {
          errors.push(`${label}: duplicate combination of attributes`);
        }
        seenCombinations.add(combinationKey);
      }

      const sku = dto.sku?.trim() || null;
      if (sku) {
        const skuKey = sku.toLowerCase();
        if (seenSkus.has(skuKey)) errors.push(`${label}: duplicate SKU "${sku}"`);
        seenSkus.add(skuKey);
      }

      if (
        dto.price != null &&
        dto.compareAtPrice != null &&
        dto.compareAtPrice > 0 &&
        dto.compareAtPrice < dto.price
      ) {
        errors.push(`${label}: MRP must be greater than or equal to the price`);
      }

      return { dto, index, attributes, combinationKey, sku };
    });

    if (errors.length > 0) throw new BadRequestException(errors);

    const existing = await manager.find(ProductVariant, {
      where: { productId, isActive: true },
    });
    const existingById = new Map(existing.map((row) => [row.productVariantId, row]));
    const keptIds = new Set(
      prepared
        .map((item) => item.dto.productVariantId)
        .filter((id): id is string => Boolean(id) && existingById.has(id as string)),
    );
    const now = new Date();

    const removedIds = existing
      .filter((row) => !keptIds.has(row.productVariantId))
      .map((row) => row.productVariantId);
    if (removedIds.length > 0) {
      await manager.update(
        ProductVariant,
        { productVariantId: In(removedIds) },
        { isActive: false, combinationKey: null, sku: null, updatedAt: now },
      );
    }

    // Free every unique key first so rows can swap SKUs / combinations inside one transaction.
    if (keptIds.size > 0) {
      await manager.update(
        ProductVariant,
        { productVariantId: In([...keptIds]) },
        { combinationKey: null, sku: null },
      );
    }

    const saved: ProductVariant[] = [];
    for (const item of prepared) {
      const { dto, index } = item;
      const payload = {
        productId,
        variantName: dto.variantName.trim(),
        sku: item.sku,
        price: dto.price ?? null,
        compareAtPrice: dto.compareAtPrice ?? null,
        quantity: dto.quantity ?? null,
        moq: dto.moq ?? null,
        weight: dto.weight ?? null,
        barcode: dto.barcode?.trim() || null,
        combinationKey: item.combinationKey,
        mediaIds: (dto.mediaIds ?? []).filter((id) => mediaIds.size === 0 || mediaIds.has(id)),
        displayOrder: dto.displayOrder ?? index,
        isActive: true,
        isEnabled: dto.isEnabled ?? true,
        updatedAt: now,
      };

      const row =
        dto.productVariantId && existingById.has(dto.productVariantId)
          ? Object.assign(existingById.get(dto.productVariantId)!, payload)
          : manager.create(ProductVariant, { ...payload, createdAt: now });

      const persisted = await manager.save(ProductVariant, row);
      saved.push(persisted);

      await manager.delete(ProductVariantAttribute, {
        productVariantId: persisted.productVariantId,
      });
      if (item.attributes.length > 0) {
        await manager.insert(
          ProductVariantAttribute,
          item.attributes.map((attribute) => ({
            productVariantId: persisted.productVariantId,
            inputKey: attribute.key,
            optionCategoryId: attribute.optionCategoryId,
            valueText: attribute.valueText,
          })),
        );
      }
    }
    return saved;
  }

  /** Replaces the product's bulk-pricing tiers. */
  async syncPriceTiers(
    manager: EntityManager,
    productId: string,
    dtos: ProductPriceTierDto[],
  ): Promise<void> {
    if (dtos.length > MAX_PRICE_TIERS_PER_PRODUCT) {
      throw new BadRequestException(
        `At most ${MAX_PRICE_TIERS_PER_PRODUCT} price tiers are allowed`,
      );
    }

    const activeVariantIds = new Set(
      (
        await manager.find(ProductVariant, {
          where: { productId, isActive: true },
          select: { productVariantId: true },
        })
      ).map((variant) => variant.productVariantId),
    );

    const errors: string[] = [];
    const seen = new Set<string>();
    dtos.forEach((tier, index) => {
      const label = `Price tier ${index + 1}`;
      if (tier.maxQuantity != null && tier.maxQuantity < tier.minQuantity) {
        errors.push(`${label}: maximum quantity must be at least the minimum quantity`);
      }
      if (tier.productVariantId && !activeVariantIds.has(tier.productVariantId)) {
        errors.push(`${label}: unknown variant`);
      }
      const signature = `${tier.productVariantId ?? ''}:${tier.minQuantity}`;
      if (seen.has(signature)) errors.push(`${label}: duplicate minimum quantity`);
      seen.add(signature);
    });
    if (errors.length > 0) throw new BadRequestException(errors);

    await manager.delete(ProductPriceTier, { productId });
    if (dtos.length === 0) return;

    const now = new Date();
    await manager.insert(
      ProductPriceTier,
      [...dtos]
        .sort((a, b) => a.minQuantity - b.minQuantity)
        .map((tier) => ({
          productId,
          productVariantId: tier.productVariantId ?? null,
          minQuantity: tier.minQuantity,
          maxQuantity: tier.maxQuantity ?? null,
          price: tier.price,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        })),
    );
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  private optionIdsByKey(
    config: FormConfig | null,
    fields: Map<string, FormFieldConfig>,
  ): Map<string, Set<string>> {
    const result = new Map<string, Set<string>>();
    for (const [key, field] of fields) {
      if (!SELECT_TYPES.has(field.type) || !field.optionSetKey) continue;
      const options = config?.optionSets[field.optionSetKey] ?? [];
      result.set(key, new Set(options.map((option) => option.categoryId)));
    }
    return result;
  }

  private normaliseAttributes(
    dto: ProductVariantDto,
    fields: Map<string, FormFieldConfig>,
    optionIds: Map<string, Set<string>>,
    label: string,
    errors: string[],
  ): NormalisedAttribute[] {
    const result: NormalisedAttribute[] = [];
    for (const [key, raw] of Object.entries(dto.attributes ?? {})) {
      if (raw === undefined || raw === null || raw === '') continue;
      const field = fields.get(key);
      if (!field) {
        // Not a variant attribute of this category (e.g. category changed) — drop it.
        continue;
      }
      const value = String(raw).trim();
      if (!value) continue;

      if (SELECT_TYPES.has(field.type)) {
        if (!optionIds.get(key)?.has(value)) {
          errors.push(`${label}: invalid option for ${field.label}`);
          continue;
        }
        result.push({ key, optionCategoryId: value, valueText: null, token: `${key}=${value}` });
      } else {
        if (value.length > 200) {
          errors.push(`${label}: ${field.label} must be at most 200 characters`);
          continue;
        }
        result.push({
          key,
          optionCategoryId: null,
          valueText: value,
          token: `${key}=${value.toLowerCase()}`,
        });
      }
    }
    return result;
  }
}
