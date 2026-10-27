import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Product } from './product.entity';

/** Bulk / wholesale price break: `price` applies from `minQuantity` upwards. */
@Entity({ name: 'product_price_tiers' })
export class ProductPriceTier {
  @PrimaryGeneratedColumn({ name: 'product_price_tier_id', type: 'bigint' })
  productPriceTierId: string;

  @Column({ name: 'product_id', type: 'bigint' })
  productId: string;

  @Column({ name: 'product_variant_id', type: 'bigint', nullable: true })
  productVariantId: string | null;

  @Column({ name: 'min_quantity', type: 'int' })
  minQuantity: number;

  @Column({ name: 'max_quantity', type: 'int', nullable: true })
  maxQuantity: number | null;

  @Column({ name: 'price', type: 'float8' })
  price: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'NOW()' })
  updatedAt: Date;

  @ManyToOne(() => Product, (product) => product.priceTiers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;
}
