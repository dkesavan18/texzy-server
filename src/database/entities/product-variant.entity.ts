import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Product } from './product.entity';

@Entity({ name: 'product_variants' })
export class ProductVariant {
  @PrimaryGeneratedColumn({ name: 'product_variant_id', type: 'bigint' })
  productVariantId: string;

  @Column({ name: 'product_id', type: 'bigint' })
  productId: string;

  @Column({ name: 'variant_name', type: 'varchar', length: 100 })
  variantName: string;

  @Column({ name: 'price', type: 'float8', nullable: true })
  price: number | null;

  @Column({ name: 'quantity', type: 'int', nullable: true })
  quantity: number | null;

  /** Array of product_media_id strings linked to this variant. */
  @Column({ name: 'media_ids', type: 'jsonb', default: () => "'[]'" })
  mediaIds: string[];

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'created_at', type: 'timestamptz', nullable: true })
  createdAt: Date | null;

  @Column({ name: 'updated_at', type: 'timestamptz', nullable: true })
  updatedAt: Date | null;

  @ManyToOne(() => Product, (product) => product.variants, { nullable: false })
  @JoinColumn({ name: 'product_id' })
  product: Product;
}
