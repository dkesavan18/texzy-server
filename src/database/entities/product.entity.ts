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

@Entity({ name: 'products' })
export class Product {
  @PrimaryGeneratedColumn({ name: 'product_id', type: 'bigint' })
  productId: string;

  @Column({ name: 'product_category_id', type: 'int', nullable: true })
  productCategoryId: number | null;

  @Column({ name: 'user_id', type: 'bigint', nullable: true })
  userId: string | null;

  @Column({ name: 'price', type: 'float8', nullable: true })
  price: number | null;

  @Column({ name: 'quantity', type: 'int', nullable: true })
  quantity: number | null;

  @Column({ name: 'is_customer_sale', type: 'boolean', nullable: true })
  isCustomerSale: boolean | null;

  @Column({ name: 'discount', type: 'int', nullable: true })
  discount: number | null;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'ratings', type: 'int', nullable: true })
  ratings: number | null;

  @Column({ name: 'orders_count', type: 'bigint', nullable: true })
  ordersCount: string | null;

  @Column({ name: 'product_name', type: 'varchar', nullable: true })
  productName: string | null;

  @Column({ name: 'is_active', type: 'boolean', nullable: true })
  isActive: boolean | null;

  @Column({ name: 'created_at', type: 'timetz', nullable: true })
  createdAt: string | null;

  @Column({ name: 'updated_at', type: 'timetz', nullable: true })
  updatedAt: string | null;

  @ManyToOne(() => Category, (category) => category.products, {
    nullable: true,
  })
  @JoinColumn({ name: 'product_category_id' })
  productCategory: Category | null;

  @ManyToOne(() => User, (user) => user.products, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @OneToMany(() => ProductMedia, (media) => media.product)
  media: ProductMedia[];
}
