import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Category } from './category.entity';
import { User } from './user.entity';

@Entity({ name: 'collections' })
export class Collection {
  @PrimaryGeneratedColumn({ name: 'collection_id', type: 'bigint' })
  collectionId: string;

  @Column({ name: 'collection_category_id', type: 'int', nullable: true })
  collectionCategoryId: number | null;

  @Column({ name: 'product_id', type: 'int', array: true, nullable: true })
  productId: number[] | null;

  @Column({ name: 'created_at', type: 'timetz', nullable: true })
  createdAt: string | null;

  @Column({ name: 'updated_at', type: 'timetz', nullable: true })
  updatedAt: string | null;

  @Column({ name: 'is_active', type: 'boolean', nullable: true })
  isActive: boolean | null;

  @Column({ name: 'collection_title', type: 'varchar', nullable: true })
  collectionTitle: string | null;

  @Column({ name: 'is_primary', type: 'boolean', nullable: true })
  isPrimary: boolean | null;

  @Column({ name: 'user_id', type: 'bigint', nullable: true })
  userId: string | null;

  @Column({ name: 'is_advertisement', type: 'boolean', nullable: true })
  isAdvertisement: boolean | null;

  @Column({ name: 'advertisement_startdate', type: 'timetz', nullable: true })
  advertisementStartdate: string | null;

  @Column({ name: 'advertisement_enddate', type: 'timetz', nullable: true })
  advertisementEnddate: string | null;

  @Column({ name: 'cover_image_url', type: 'text', nullable: true })
  coverImageUrl: string | null;

  @ManyToOne(() => Category, (category) => category.collections, {
    nullable: true,
  })
  @JoinColumn({ name: 'collection_category_id' })
  collectionCategory: Category | null;

  @ManyToOne(() => User, (user) => user.collections, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;
}
