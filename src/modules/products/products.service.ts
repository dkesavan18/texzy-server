import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, EntityManager, Not, Repository } from 'typeorm';
import { dbTimetzNow } from '../../common/utils/auth.utils';
import {
  Product,
  ProductAttributeValue,
  ProductPriceTier,
  ProductVariant,
} from '../../database/entities';
import { CategoryInputsService } from '../category-inputs/category-inputs.service';
import type { FormConfig } from '../category-inputs/category-inputs.types';
import { PRODUCT_STATUS } from './constants/product-status.constant';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { ProductAttributesService, type AttributeMap } from './product-attributes.service';
import { ProductVariantsService } from './product-variants.service';

export type ProductWithDiscount = Product & {
  discountPercentage: number | null;
};

type SerializeOptions = {
  /** Owner views keep disabled variants so sellers can re-enable them. */
  owner: boolean;
};

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(ProductVariant)
    private readonly variantsRepository: Repository<ProductVariant>,
    private readonly categoryInputs: CategoryInputsService,
    private readonly attributesService: ProductAttributesService,
    private readonly variantsService: ProductVariantsService,
  ) {}

  /**
   * Public / owner lists include media + variants so product cards can show
   * colour swatches and variant pricing without N+1 detail fetches.
   * When `excludeUserId` is set (authenticated seller browsing explore), that user's own products are omitted.
   */
  async findAll(take = 50, excludeUserId?: string) {
    const products = await this.productsRepository.find({
      where: {
        isActive: true,
        status: PRODUCT_STATUS.ACTIVE,
        ...(excludeUserId ? { userId: Not(excludeUserId) } : {}),
      },
      take,
      order: { productId: 'DESC' },
      relations: { media: true, variants: true },
    });
    return products.map((product) => this.serialize(product, { owner: false }));
  }

  /**
   * Ranked catalogue search. Matches name, description, category, and variant
   * text in Postgres (full-text rank + partial match) — not in the browser.
   */
  async search(query: string, excludeUserId?: string, take = 60) {
    const q = query.trim().slice(0, 80);
    if (!q) return [];

    const like = `%${q.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
    const document = `to_tsvector('simple', concat_ws(' ', product.product_name, product.short_description, product.description, category.category_name, subcategory.category_name))`;

    const qb = this.productsRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.media', 'media')
      .leftJoinAndSelect('product.variants', 'variants')
      .leftJoin('product.productCategory', 'category')
      .leftJoin('product.productSubcategory', 'subcategory')
      .where('product.isActive = :active', { active: true })
      .andWhere('product.status = :status', { status: PRODUCT_STATUS.ACTIVE })
      .andWhere(
        new Brackets((sub) => {
          sub
            .where(`product.productName ILIKE :like ESCAPE '\\'`, { like })
            .orWhere(`product.shortDescription ILIKE :like ESCAPE '\\'`, { like })
            .orWhere(`product.description ILIKE :like ESCAPE '\\'`, { like })
            .orWhere(`category.categoryName ILIKE :like ESCAPE '\\'`, { like })
            .orWhere(`subcategory.categoryName ILIKE :like ESCAPE '\\'`, { like })
            .orWhere(`variants.variantName ILIKE :like ESCAPE '\\'`, { like })
            .orWhere(`${document} @@ websearch_to_tsquery('simple', :q)`, { q });
        }),
      );

    if (excludeUserId) {
      qb.andWhere('(product.userId IS NULL OR product.userId != :excludeUserId)', {
        excludeUserId,
      });
    }

    qb.addSelect(
      `ts_rank(${document}, websearch_to_tsquery('simple', :q))`,
      'search_rank',
    )
      .orderBy('search_rank', 'DESC')
      .addOrderBy('product.productId', 'DESC')
      .take(take)
      .setParameter('q', q);

    const products = await qb.getMany();
    return products.map((product) => this.serialize(product, { owner: false }));
  }

  async findAllByUser(userId: string, take = 100) {
    const products = await this.productsRepository.find({
      where: { userId, status: Not(PRODUCT_STATUS.DELETED) },
      take,
      order: { productId: 'DESC' },
      relations: { media: true, variants: true },
    });
    return products.map((product) => this.serialize(product, { owner: true }));
  }

  /** Public lookup — published products only. Drafts are only visible to their owner via findOneMine. */
  async findOne(productId: string) {
    const product = await this.productsRepository.findOne({
      where: { productId, status: PRODUCT_STATUS.ACTIVE, isActive: true },
      relations: this.detailRelations(),
    });
    if (!product) {
      throw new NotFoundException(`Product ${productId} not found`);
    }
    // Fire-and-forget — never slow the detail response for analytics counters.
    void this.productsRepository
      .increment({ productId }, 'totalViews', 1)
      .catch(() => undefined);
    product.totalViews = (product.totalViews ?? 0) + 1;
    return this.serializeDetail(this.productsRepository.manager, product, { owner: false });
  }

  /** Owner lookup — works for drafts and published products alike, used to resume editing. */
  async findOneMine(userId: string, productId: string) {
    const product = await this.findProductOrThrow(this.productsRepository.manager, productId, true);
    this.assertOwner(product, userId, 'view');
    this.assertNotDeleted(product);
    return this.serializeDetail(this.productsRepository.manager, product, { owner: true });
  }

  /** Step 1 of the Add Product flow — creates an empty DRAFT immediately and returns its id. */
  async createDraft(userId: string) {
    const now = dbTimetzNow();
    const product = this.productsRepository.create({
      userId,
      status: PRODUCT_STATUS.DRAFT,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      lastActivityAt: new Date(),
    });
    const saved = await this.productsRepository.save(product);
    return this.serialize(saved, { owner: true });
  }

  /** One-shot create + publish (legacy API) — validated exactly like publish(). */
  async create(userId: string, dto: CreateProductDto) {
    const now = dbTimetzNow();
    const productId = await this.productsRepository.manager.transaction(async (manager) => {
      const created = await manager.save(
        Product,
        manager.create(Product, {
          userId,
          status: PRODUCT_STATUS.DRAFT,
          isActive: true,
          createdAt: now,
          updatedAt: now,
          lastActivityAt: new Date(),
        }),
      );
      const product = await this.findProductOrThrow(manager, created.productId, false);
      await this.applyChanges(manager, product, dto);
      await this.assertPublishable(manager, product);
      product.status = PRODUCT_STATUS.ACTIVE;
      await manager.save(Product, product);
      return product.productId;
    });

    return this.findOneMine(userId, productId);
  }

  /** Autosave-friendly partial update. Cannot change `status` — use publish() for that. */
  async update(userId: string, productId: string, dto: UpdateProductDto) {
    await this.productsRepository.manager.transaction(async (manager) => {
      const product = await this.findProductOrThrow(manager, productId, false);
      this.assertOwner(product, userId, 'update');
      this.assertNotDeleted(product);
      await this.applyChanges(manager, product, dto);
      await manager.save(Product, product);
    });

    return this.findOneMine(userId, productId);
  }

  /** Validates the draft is complete, then flips DRAFT -> ACTIVE. Idempotent for already-active products. */
  async publish(userId: string, productId: string) {
    await this.productsRepository.manager.transaction(async (manager) => {
      const product = await this.findProductOrThrow(manager, productId, false);
      this.assertOwner(product, userId, 'publish');
      this.assertNotDeleted(product);

      await this.assertPublishable(manager, product);

      product.status = PRODUCT_STATUS.ACTIVE;
      product.isActive = true;
      product.updatedAt = dbTimetzNow();
      product.lastActivityAt = new Date();
      await manager.save(Product, product);
    });

    return this.findOneMine(userId, productId);
  }

  /** Soft-hide from buyers while keeping the product in the seller catalogue (Active / Inactive). */
  async setActive(userId: string, productId: string, isActive: boolean) {
    const product = await this.findProductOrThrow(
      this.productsRepository.manager,
      productId,
      false,
    );
    this.assertOwner(product, userId, isActive ? 'activate' : 'deactivate');
    this.assertNotDeleted(product);
    product.isActive = isActive;
    product.updatedAt = dbTimetzNow();
    product.lastActivityAt = new Date();
    const saved = await this.productsRepository.save(product);
    return this.serialize(saved, { owner: true });
  }

  /** Soft-delete: keep the row, hide from Active/Inactive lists and from buyers. */
  async remove(userId: string, productId: string) {
    const product = await this.findProductOrThrow(
      this.productsRepository.manager,
      productId,
      false,
    );
    this.assertOwner(product, userId, 'delete');
    if (product.status !== PRODUCT_STATUS.DELETED) {
      product.status = PRODUCT_STATUS.DELETED;
      product.isActive = false;
      product.updatedAt = dbTimetzNow();
      product.lastActivityAt = new Date();
      await this.productsRepository.save(product);
    }
    return { success: true };
  }

  /** Bumps last_activity_at without loading the full entity — used by the uploads flow. */
  async touchActivity(productId: string): Promise<void> {
    await this.productsRepository.update(
      { productId },
      { lastActivityAt: new Date() },
    );
  }

  // ---------------------------------------------------------------------------
  // Writes
  // ---------------------------------------------------------------------------

  /**
   * Applies a create/update payload inside the caller's transaction:
   * plain columns -> dynamic attributes (+ core columns) -> variants -> price tiers.
   * The caller saves `product` afterwards.
   */
  private async applyChanges(
    manager: EntityManager,
    product: Product,
    dto: CreateProductDto | UpdateProductDto,
  ) {
    const previousCategoryId = product.productCategoryId;

    if (dto.productCategoryId !== undefined && dto.productCategoryId !== null) {
      await this.assertProductType(dto.productCategoryId);
    }

    Object.assign(product, this.toEntityFields(dto), {
      updatedAt: dbTimetzNow(),
      lastActivityAt: new Date(),
    });

    const config = await this.resolveConfig(product.productCategoryId);
    const categoryChanged = previousCategoryId !== product.productCategoryId;

    if (config && (dto.attributes !== undefined || categoryChanged)) {
      await this.attributesService.apply(manager, product, config, dto.attributes ?? {}, {
        strict: product.status === PRODUCT_STATUS.ACTIVE,
      });
    } else if (!config && categoryChanged) {
      await manager.delete(ProductAttributeValue, { productId: product.productId });
    }

    // Persist the product row before children reference it / read derived columns.
    await manager.save(Product, product);

    if (dto.variants !== undefined) {
      await this.variantsService.syncVariants(manager, product, config, dto.variants);
    }
    if (dto.priceTiers !== undefined) {
      await this.variantsService.syncPriceTiers(manager, product.productId, dto.priceTiers);
    }
    if (dto.variants !== undefined) {
      await this.deriveFromVariants(manager, product);
    }
  }

  /** A product may only point at a product type (leaf) — never at a group or an option value. */
  private async assertProductType(categoryId: number) {
    const category = await this.categoryInputs.findProductCategory(String(categoryId));
    if (category.parentId === null) {
      throw new BadRequestException(
        'Select a product type (e.g. Kanchipuram Silk Saree), not only a product group',
      );
    }
  }

  private async resolveConfig(categoryId: number | null): Promise<FormConfig | null> {
    if (categoryId == null) return null;
    try {
      return await this.categoryInputs.resolveConfig(String(categoryId));
    } catch (error) {
      if (error instanceof NotFoundException) return null;
      throw error;
    }
  }

  /** When the seller prices only via variants, mirror the lowest price / total stock onto the product. */
  private async deriveFromVariants(manager: EntityManager, product: Product) {
    const variants = await manager.find(ProductVariant, {
      where: { productId: product.productId, isActive: true },
    });
    const enabled = variants.filter((variant) => variant.isEnabled !== false);
    let changed = false;

    if (product.price == null) {
      const prices = enabled
        .map((variant) => variant.price)
        .filter((price): price is number => typeof price === 'number' && price > 0);
      if (prices.length > 0) {
        product.price = Math.min(...prices);
        changed = true;
      }
    }
    if (product.quantity == null) {
      const quantities = enabled
        .map((variant) => variant.quantity)
        .filter((quantity): quantity is number => typeof quantity === 'number');
      if (quantities.length > 0) {
        product.quantity = quantities.reduce((sum, quantity) => sum + quantity, 0);
        changed = true;
      }
    }
    if (changed) await manager.save(Product, product);
  }

  private async assertPublishable(manager: EntityManager, product: Product) {
    const errors: string[] = [];

    if (!product.productName || !product.productName.trim()) {
      errors.push('Product name is required');
    }

    const config = await this.resolveConfig(product.productCategoryId);
    if (product.productCategoryId == null) {
      errors.push('Product category is required');
    } else if (!config) {
      errors.push('Selected product category is no longer available');
    } else if (!config.category.groupId || config.category.groupId === config.category.categoryId) {
      errors.push('Select a product type, not only a product group');
    }

    const activeMedia = (product.media ?? []).filter(
      (media) => media.isActive !== false && media.mediaType !== 'video',
    );
    if (activeMedia.length === 0) {
      errors.push('At least one product photo is required');
    }

    await this.deriveFromVariants(manager, product);
    if (product.price == null || product.price <= 0) {
      errors.push('Price is required and must be greater than 0');
    }

    if (config) {
      const values = await this.attributesService.load(manager, product, config);
      errors.push(...this.attributesService.validateForPublish(config, values, product));
    }

    if (errors.length > 0) {
      throw new BadRequestException([...new Set(errors)]);
    }
  }

  private async findProductOrThrow(
    manager: EntityManager,
    productId: string,
    detail: boolean,
  ): Promise<Product> {
    const product = await manager.findOne(Product, {
      where: { productId },
      relations: detail ? this.detailRelations() : { media: true },
    });
    if (!product) {
      throw new NotFoundException(`Product ${productId} not found`);
    }
    return product;
  }

  private detailRelations() {
    return {
      media: true,
      variants: { attributes: true },
      priceTiers: true,
    } as const;
  }

  private assertOwner(product: Product, userId: string, action: string) {
    if (product.userId && product.userId !== userId) {
      throw new ForbiddenException(`You can only ${action} your own products`);
    }
  }

  private assertNotDeleted(product: Product) {
    if (product.status === PRODUCT_STATUS.DELETED) {
      throw new NotFoundException(`Product ${product.productId} not found`);
    }
  }

  private toEntityFields(dto: CreateProductDto | UpdateProductDto) {
    const fields: Partial<Product> = {};
    if (dto.productName !== undefined) fields.productName = dto.productName;
    if (dto.shortDescription !== undefined)
      fields.shortDescription = dto.shortDescription ?? null;
    if (dto.description !== undefined) fields.description = dto.description ?? null;
    if (dto.productCategoryId !== undefined)
      fields.productCategoryId = dto.productCategoryId ?? null;
    if (dto.productSubcategoryId !== undefined)
      fields.productSubcategoryId = dto.productSubcategoryId ?? null;
    if (dto.textileAttributes !== undefined)
      fields.textileAttributes = dto.textileAttributes
        ? { ...dto.textileAttributes }
        : null;
    if (dto.price !== undefined) fields.price = dto.price ?? null;
    if (dto.compareAtPrice !== undefined)
      fields.compareAtPrice = dto.compareAtPrice ?? null;
    if (dto.priceType !== undefined) fields.priceType = dto.priceType ?? null;
    if (dto.unit !== undefined) fields.unit = dto.unit ?? null;
    if (dto.quantity !== undefined) fields.quantity = dto.quantity ?? null;
    if (dto.minOrderQuantity !== undefined)
      fields.minOrderQuantity = dto.minOrderQuantity ?? null;
    if (dto.allowBulkOrder !== undefined)
      fields.allowBulkOrder = dto.allowBulkOrder ?? null;
    if (dto.isCustomerSale !== undefined)
      fields.isCustomerSale = dto.isCustomerSale ?? null;
    return fields;
  }

  // ---------------------------------------------------------------------------
  // Serialisation
  // ---------------------------------------------------------------------------

  private serialize(product: Product, options: SerializeOptions): ProductWithDiscount {
    const variants = (product.variants ?? [])
      .filter((variant) => variant.isActive !== false)
      .filter((variant) => options.owner || variant.isEnabled !== false)
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

    return {
      ...product,
      variants,
      discountPercentage: this.computeDiscountPercentage(
        product.price,
        product.compareAtPrice,
      ),
    };
  }

  /** Detail payload: list shape + dynamic attribute values, display specs, price tiers and variant attributes. */
  private async serializeDetail(manager: EntityManager, product: Product, options: SerializeOptions) {
    const base = this.serialize(product, options);
    const config = await this.resolveConfig(product.productCategoryId);

    let attributes: AttributeMap = {};
    let attributeSpecs: ReturnType<ProductAttributesService['describe']> = [];
    if (config) {
      attributes = await this.attributesService.load(manager, product, config);
      attributeSpecs = this.attributesService.describe(config, attributes);
    }

    const variants = base.variants.map((variant) => {
      const { attributes: rows, ...rest } = variant;
      const variantAttributes: Record<string, string> = {};
      for (const row of rows ?? []) {
        const value = row.optionCategoryId ?? row.valueText;
        if (value !== null && value !== undefined) variantAttributes[row.inputKey] = value;
      }
      return { ...rest, attributes: variantAttributes };
    });

    const priceTiers: ProductPriceTier[] = (product.priceTiers ?? [])
      .filter((tier) => tier.isActive !== false)
      .sort((a, b) => a.minQuantity - b.minQuantity);

    return {
      ...base,
      variants,
      attributes,
      attributeSpecs,
      priceTiers,
    };
  }

  private computeDiscountPercentage(
    price: number | null,
    compareAtPrice: number | null,
  ): number | null {
    if (
      price == null ||
      compareAtPrice == null ||
      compareAtPrice <= 0 ||
      compareAtPrice <= price
    ) {
      return null;
    }
    return Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
  }
}
