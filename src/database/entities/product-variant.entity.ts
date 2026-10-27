import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ProductVariantAttribute } from './product-variant-attribute.entity';
import { Product } from './product.entity';

@Entity({ name: 'product_variants' })
export class ProductVariant {
  @PrimaryGeneratedColumn({ name: 'product_variant_id', type: 'bigint' })
  productVariantId: string;

  @Column({ name: 'product_id', type: 'bigint' })
  productId: string;

  @Column({ name: 'variant_name', type: 'varchar', length: 255 })
  variantName: string;

  @Column({ name: 'price', type: 'float8', nullable: true })
  price: number | null;

  @Column({ name: 'compare_at_price', type: 'float8', nullable: true })
  compareAtPrice: number | null;

  @Column({ name: 'quantity', type: 'int', nullable: true })
  quantity: number | null;

  @Column({ name: 'sku', type: 'varchar', length: 100, nullable: true })
  sku: string | null;

  /** Minimum order quantity for this variant. */
  @Column({ name: 'moq', type: 'int', nullable: true })
  moq: number | null;

  /** Package weight in grams. */
  @Column({ name: 'weight', type: 'float8', nullable: true })
  weight: number | null;

  @Column({ name: 'barcode', type: 'varchar', length: 64, nullable: true })
  barcode: string | null;

  /** Deterministic signature of the selected attributes — unique per product while active. */
  @Column({ name: 'combination_key', type: 'varchar', length: 500, nullable: true })
  combinationKey: string | null;

  /** Array of product_media_id strings linked to this variant. */
  @Column({ name: 'media_ids', type: 'jsonb', default: () => "'[]'" })
  mediaIds: string[];

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  /** Seller switch — a disabled variant stays in the seller's list but cannot be bought. */
  @Column({ name: 'is_enabled', type: 'boolean', default: true })
  isEnabled: boolean;

  @Column({ name: 'created_at', type: 'timestamptz', nullable: true })
  createdAt: Date | null;

  @Column({ name: 'updated_at', type: 'timestamptz', nullable: true })
  updatedAt: Date | null;

  @ManyToOne(() => Product, (product) => product.variants, { nullable: false })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @OneToMany(() => ProductVariantAttribute, (attribute) => attribute.variant)
  attributes: ProductVariantAttribute[];
}
