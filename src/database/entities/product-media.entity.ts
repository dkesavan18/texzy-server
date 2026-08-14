import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Product } from './product.entity';

@Entity({ name: 'product_media' })
export class ProductMedia {
  @PrimaryGeneratedColumn({ name: 'product_media_id', type: 'bigint' })
  productMediaId: string;

  @Column({ name: 'product_id', type: 'bigint', nullable: true })
  productId: string | null;

  @Column({ name: 'media_type', type: 'varchar', nullable: true })
  mediaType: string | null;

  @Column({ name: 'storage_key', type: 'varchar', nullable: true })
  storageKey: string | null;

  @Column({ name: 'media_url', type: 'text', nullable: true })
  mediaUrl: string | null;

  @Column({ name: 'thumbnail_url', type: 'text', nullable: true })
  thumbnailUrl: string | null;

  @Column({ name: 'display_order', type: 'int', nullable: true })
  displayOrder: number | null;

  @Column({ name: 'is_primary', type: 'boolean', nullable: true })
  isPrimary: boolean | null;

  @Column({ name: 'created_at', type: 'timetz', nullable: true })
  createdAt: string | null;

  @Column({ name: 'updated_at', type: 'timetz', nullable: true })
  updatedAt: string | null;

  @Column({ name: 'is_active', type: 'boolean', nullable: true })
  isActive: boolean | null;

  @ManyToOne(() => Product, (product) => product.media, { nullable: true })
  @JoinColumn({ name: 'product_id' })
  product: Product | null;
}
