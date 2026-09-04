import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Cart } from './cart.entity';
import { Product } from './product.entity';
import { ProductVariant } from './product-variant.entity';

@Entity({ name: 'cart_items' })
export class CartItem {
  @PrimaryGeneratedColumn({ name: 'cart_item_id', type: 'bigint' })
  cartItemId: string;

  @Column({ name: 'cart_id', type: 'bigint' })
  cartId: string;

  @Column({ name: 'product_id', type: 'bigint' })
  productId: string;

  /** Optional — set when the buyer picked a specific colour/variant. */
  @Column({ name: 'product_variant_id', type: 'bigint', nullable: true })
  productVariantId: string | null;

  @Column({ name: 'quantity', type: 'int', default: 1 })
  quantity: number;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Cart, (cart) => cart.items, { nullable: false })
  @JoinColumn({ name: 'cart_id' })
  cart: Cart;

  @ManyToOne(() => Product, { nullable: false })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ManyToOne(() => ProductVariant, { nullable: true })
  @JoinColumn({ name: 'product_variant_id' })
  variant: ProductVariant | null;
}
