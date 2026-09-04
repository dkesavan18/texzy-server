import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { dbTimetzNow } from '../../common/utils/auth.utils';
import { Product, ProductVariant } from '../../database/entities';
import { PRODUCT_STATUS } from './constants/product-status.constant';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { ProductVariantDto } from './dto/product-variant.dto';

export type ProductWithDiscount = Product & {
  discountPercentage: number | null;
};

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(ProductVariant)
    private readonly variantsRepository: Repository<ProductVariant>,
  ) {}

  /**
   * List endpoints intentionally skip the variants relation — variants only matter for a single product's add/edit/detail view.
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
      relations: { media: true },
    });
    return products.map((product) => this.serialize(product));
  }

  async findAllByUser(userId: string, take = 100) {
    const products = await this.productsRepository.find({
      where: { userId, isActive: true },
      take,
      order: { productId: 'DESC' },
      relations: { media: true },
    });
    return products.map((product) => this.serialize(product));
  }

  /** Public lookup — published products only. Drafts are only visible to their owner via findOneMine. */
  async findOne(productId: string) {
    const product = await this.productsRepository.findOne({
      where: { productId, status: PRODUCT_STATUS.ACTIVE, isActive: true },
      relations: { media: true, variants: true },
    });
    if (!product) {
      throw new NotFoundException(`Product ${productId} not found`);
    }
    // Fire-and-forget — never slow the detail response for analytics counters.
    void this.productsRepository
      .increment({ productId }, 'totalViews', 1)
      .catch(() => undefined);
    return this.serialize({
      ...product,
      totalViews: (product.totalViews ?? 0) + 1,
    });
  }

  /** Owner lookup — works for drafts and published products alike, used to resume editing. */
  async findOneMine(userId: string, productId: string) {
    const product = await this.findProductOrThrow(productId);
    this.assertOwner(product, userId, 'view');
    return this.serialize(product);
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
    return this.serialize(saved);
  }

  async create(userId: string, dto: CreateProductDto) {
    const now = dbTimetzNow();
    const product = this.productsRepository.create({
      ...this.toEntityFields(dto),
      userId,
      status: PRODUCT_STATUS.ACTIVE,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      lastActivityAt: new Date(),
    });
    const saved = await this.productsRepository.save(product);
    return this.serialize(saved);
  }

  /** Autosave-friendly partial update. Cannot change `status` — use publish() for that. */
  async update(userId: string, productId: string, dto: UpdateProductDto) {
    const product = await this.findProductOrThrow(productId);
    this.assertOwner(product, userId, 'update');

    Object.assign(product, this.toEntityFields(dto), {
      updatedAt: dbTimetzNow(),
      lastActivityAt: new Date(),
    });
    const saved = await this.productsRepository.save(product);

    if (dto.variants !== undefined) {
      await this.syncVariants(productId, dto.variants);
    }

    const refreshed = await this.findProductOrThrow(productId);
    return this.serialize(refreshed);
  }

  /** Validates the draft is complete, then flips DRAFT -> ACTIVE. Idempotent for already-active products. */
  async publish(userId: string, productId: string) {
    const product = await this.productsRepository.findOne({
      where: { productId },
      relations: { media: true, variants: true },
    });
    if (!product) {
      throw new NotFoundException(`Product ${productId} not found`);
    }
    this.assertOwner(product, userId, 'publish');

    const errors: string[] = [];
    if (!product.productName || !product.productName.trim()) {
      errors.push('productName is required');
    }
    if (product.price == null || product.price <= 0) {
      errors.push('price is required and must be greater than 0');
    }
    if (product.productCategoryId == null) {
      errors.push('productCategoryId is required');
    }
    const activeMedia = (product.media ?? []).filter(
      (media) => media.isActive !== false,
    );
    if (activeMedia.length === 0) {
      errors.push('At least one product photo is required');
    }

    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }

    product.status = PRODUCT_STATUS.ACTIVE;
    product.updatedAt = dbTimetzNow();
    product.lastActivityAt = new Date();
    const saved = await this.productsRepository.save(product);
    return this.serialize(saved);
  }

  async remove(userId: string, productId: string) {
    const product = await this.findProductOrThrow(productId);
    this.assertOwner(product, userId, 'delete');
    product.isActive = false;
    product.updatedAt = dbTimetzNow();
    product.lastActivityAt = new Date();
    await this.productsRepository.save(product);
    return { success: true };
  }

  /** Bumps last_activity_at without loading the full entity — used by the uploads flow. */
  async touchActivity(productId: string): Promise<void> {
    await this.productsRepository.update(
      { productId },
      { lastActivityAt: new Date() },
    );
  }

  private async findProductOrThrow(productId: string): Promise<Product> {
    const product = await this.productsRepository.findOne({
      where: { productId },
      relations: { media: true, variants: true },
    });
    if (!product) {
      throw new NotFoundException(`Product ${productId} not found`);
    }
    return product;
  }

  private assertOwner(product: Product, userId: string, action: string) {
    if (product.userId && product.userId !== userId) {
      throw new ForbiddenException(`You can only ${action} your own products`);
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

  private async syncVariants(productId: string, variants: ProductVariantDto[]) {
    const now = new Date();
    const existing = await this.variantsRepository.find({
      where: { productId, isActive: true },
    });

    const incomingIds = new Set(
      variants
        .map((variant) => variant.productVariantId)
        .filter((id): id is string => Boolean(id)),
    );

    for (const row of existing) {
      if (!incomingIds.has(row.productVariantId)) {
        row.isActive = false;
        row.updatedAt = now;
        await this.variantsRepository.save(row);
      }
    }

    for (let index = 0; index < variants.length; index++) {
      const dto = variants[index];
      const payload = {
        productId,
        variantName: dto.variantName.trim(),
        price: dto.price ?? null,
        compareAtPrice: dto.compareAtPrice ?? null,
        quantity: dto.quantity ?? null,
        mediaIds: dto.mediaIds ?? [],
        displayOrder: dto.displayOrder ?? index,
        isActive: true,
        updatedAt: now,
      };

      if (dto.productVariantId) {
        const row = existing.find(
          (item) => item.productVariantId === dto.productVariantId,
        );
        if (row) {
          Object.assign(row, payload);
          await this.variantsRepository.save(row);
          continue;
        }
      }

      await this.variantsRepository.save(
        this.variantsRepository.create({
          ...payload,
          createdAt: now,
        }),
      );
    }
  }

  private serialize(product: Product): ProductWithDiscount {
    const activeVariants = (product.variants ?? [])
      .filter((variant) => variant.isActive !== false)
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

    return {
      ...product,
      variants: activeVariants,
      discountPercentage: this.computeDiscountPercentage(
        product.price,
        product.compareAtPrice,
      ),
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
