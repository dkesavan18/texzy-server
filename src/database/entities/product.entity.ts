import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Category } from './category.entity';
import { User } from './user.entity';
import { ProductMedia } from './product-media.entity';
import { ProductAttributeValue } from './product-attribute-value.entity';
import { ProductPriceTier } from './product-price-tier.entity';
import { ProductVariant } from './product-variant.entity';

@Entity({ name: 'products' })
export class Product {
  @PrimaryGeneratedColumn({ name: 'product_id', type: 'bigint' })
  productId: string;

  @Column({ name: 'product_category_id', type: 'int', nullable: true })
  productCategoryId: number | null;

  @Column({ name: 'product_subcategory_id', type: 'int', nullable: true })
  productSubcategoryId: number | null;

  @Column({ name: 'user_id', type: 'bigint', nullable: true })
  userId: string | null;

  @Column({ name: 'price', type: 'float8', nullable: true })
  price: number | null;

  @Column({ name: 'compare_at_price', type: 'float8', nullable: true })
  compareAtPrice: number | null;

  @Column({ name: 'price_type', type: 'varchar', length: 30, nullable: true })
  priceType: string | null;

  @Column({ name: 'unit', type: 'varchar', length: 30, nullable: true })
  unit: string | null;

  @Column({ name: 'quantity', type: 'int', nullable: true })
  quantity: number | null;

  @Column({ name: 'min_order_quantity', type: 'int', nullable: true })
  minOrderQuantity: number | null;

  @Column({ name: 'allow_bulk_order', type: 'boolean', nullable: true })
  allowBulkOrder: boolean | null;

  @Column({ name: 'is_customer_sale', type: 'boolean', nullable: true })
  isCustomerSale: boolean | null;

  /** Legacy manual discount column — superseded by the dynamically computed discountPercentage. */
  @Column({ name: 'discount', type: 'int', nullable: true })
  discount: number | null;

  /** Full product description. */
  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'short_description', type: 'text', nullable: true })
  shortDescription: string | null;

  /** Textile-specific attributes that vary by category (material, color, size, weaving type, etc). */
  @Column({ name: 'textile_attributes', type: 'jsonb', nullable: true })
  textileAttributes: Record<string, unknown> | null;

  @Column({ name: 'sku', type: 'varchar', length: 100, nullable: true })
  sku: string | null;

  @Column({ name: 'hsn_code', type: 'varchar', length: 20, nullable: true })
  hsnCode: string | null;

  @Column({ name: 'gst_rate', type: 'float8', nullable: true })
  gstRate: number | null;

  @Column({ name: 'lead_time_days', type: 'int', nullable: true })
  leadTimeDays: number | null;

  @Column({ name: 'is_made_to_order', type: 'boolean', nullable: true })
  isMadeToOrder: boolean | null;

  @Column({ name: 'low_stock_threshold', type: 'int', nullable: true })
  lowStockThreshold: number | null;

  @Column({ name: 'wholesale_price', type: 'float8', nullable: true })
  wholesalePrice: number | null;

  /** Package weight in grams. */
  @Column({ name: 'package_weight', type: 'float8', nullable: true })
  packageWeight: number | null;

  /** `{ length, width, height }` in centimetres. */
  @Column({ name: 'package_dimensions', type: 'jsonb', nullable: true })
  packageDimensions: { length?: number; width?: number; height?: number } | null;

  @Column({ name: 'ratings', type: 'int', nullable: true })
  ratings: number | null;

  @Column({ name: 'orders_count', type: 'bigint', nullable: true })
  ordersCount: string | null;

  /** Public product-detail views — incremented on GET /products/:id only. */
  @Column({ name: 'total_views', type: 'int', default: 0 })
  totalViews: number;

  @Column({ name: 'product_name', type: 'varchar', nullable: true })
  productName: string | null;

  /** Publish lifecycle — 'draft' | 'active' | 'deleted'. Independent from the isActive visibility flag. */
  @Column({ name: 'status', type: 'varchar', length: 20, default: 'active' })
  status: string;

  @Column({ name: 'is_active', type: 'boolean', nullable: true })
  isActive: boolean | null;

  @Column({ name: 'created_at', type: 'timetz', nullable: true })
  createdAt: string | null;

  @Column({ name: 'updated_at', type: 'timetz', nullable: true })
  updatedAt: string | null;

  /**
   * Proper timestamptz used only to detect draft-abandonment (createdAt/updatedAt are
   * `timetz` — time-of-day only, with no date — so they can't express "24 hours old").
   * Bumped on every product write and on every image add/remove/reorder for this product.
   */
  @Column({ name: 'last_activity_at', type: 'timestamptz', nullable: true })
  lastActivityAt: Date | null;

  @ManyToOne(() => Category, (category) => category.products, {
    nullable: true,
  })
  @JoinColumn({ name: 'product_category_id' })
  productCategory: Category | null;

  @ManyToOne(() => Category, { nullable: true })
  @JoinColumn({ name: 'product_subcategory_id' })
  productSubcategory: Category | null;

  @ManyToOne(() => User, (user) => user.products, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @OneToMany(() => ProductMedia, (media) => media.product)
  media: ProductMedia[];

  @OneToMany(() => ProductVariant, (variant) => variant.product)
  variants: ProductVariant[];

  @OneToMany(() => ProductAttributeValue, (value) => value.product)
  attributeValues: ProductAttributeValue[];

  @OneToMany(() => ProductPriceTier, (tier) => tier.product)
  priceTiers: ProductPriceTier[];
}
