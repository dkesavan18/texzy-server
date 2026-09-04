import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { OrderItemStatus } from './order-item-status.entity';
import { Product } from './product.entity';
import { ProductVariant } from './product-variant.entity';

@Entity({ name: 'order_items' })
export class OrderItem {
  @PrimaryGeneratedColumn({ name: 'order_item_id', type: 'bigint' })
  orderItemId: string;

  @Column({ name: 'order_id', type: 'bigint' })
  orderId: string;

  @Column({ name: 'product_id', type: 'bigint' })
  productId: string;

  /** Optional — set when the buyer picked a specific colour/variant at checkout. */
  @Column({ name: 'product_variant_id', type: 'bigint', nullable: true })
  productVariantId: string | null;

  @Column({ name: 'quantity', type: 'int' })
  quantity: number;

  /** Price per unit at the time of purchase — captured from the DB, never trusted from the client. */
  @Column({ name: 'unit_price', type: 'float8' })
  unitPrice: number;

  @Column({ name: 'total_price', type: 'float8' })
  totalPrice: number;

  /**
   * Per-item fulfillment status (independent of `orders.status`, which only reflects
   * payment/creation). Lets a multi-seller cart track each seller's shipment separately.
   * 'pending' | 'packed' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled'.
   */
  @Column({
    name: 'fulfillment_status',
    type: 'varchar',
    length: 30,
    default: 'pending',
  })
  fulfillmentStatus: string;

  @Column({
    name: 'tracking_number',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  trackingNumber: string | null;

  @Column({
    name: 'courier_name',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  courierName: string | null;

  @Column({ name: 'expected_delivery_date', type: 'date', nullable: true })
  expectedDeliveryDate: string | null;

  /** Seller-uploaded proof of delivery photo — set when status flips to 'delivered'. */
  @Column({ name: 'delivery_photo_url', type: 'text', nullable: true })
  deliveryPhotoUrl: string | null;

  @Column({ name: 'packed_at', type: 'timestamptz', nullable: true })
  packedAt: Date | null;

  @Column({ name: 'shipped_at', type: 'timestamptz', nullable: true })
  shippedAt: Date | null;

  @Column({ name: 'delivered_at', type: 'timestamptz', nullable: true })
  deliveredAt: Date | null;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt: Date | null;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', nullable: true })
  updatedAt: Date | null;

  @ManyToOne(() => Order, (order) => order.items, { nullable: false })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @ManyToOne(() => Product, { nullable: false })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ManyToOne(() => ProductVariant, { nullable: true })
  @JoinColumn({ name: 'product_variant_id' })
  variant: ProductVariant | null;

  @OneToMany(() => OrderItemStatus, (status) => status.orderItem)
  statusHistory: OrderItemStatus[];
}
