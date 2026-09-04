import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { OrderItem } from './order-item.entity';

/**
 * Fulfillment timeline for a single order item — one row per status transition.
 * Mirrors the `deal_status` history pattern used by the Deals module, scoped to
 * order_item (not order) so a multi-seller cart tracks each seller's shipment separately.
 */
@Entity({ name: 'order_item_status_history' })
export class OrderItemStatus {
  @PrimaryGeneratedColumn({ name: 'order_item_status_id', type: 'bigint' })
  orderItemStatusId: string;

  @Column({ name: 'order_item_id', type: 'bigint' })
  orderItemId: string;

  /** 'pending' | 'packed' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled'. */
  @Column({ name: 'status', type: 'varchar', length: 30 })
  status: string;

  @Column({ name: 'note', type: 'text', nullable: true })
  note: string | null;

  /** Delivery/packing proof photo attached at this status step, if any. */
  @Column({ name: 'image_url', type: 'text', nullable: true })
  imageUrl: string | null;

  /** Seller (product owner) who made this update. */
  @Column({ name: 'changed_by', type: 'bigint', nullable: true })
  changedBy: string | null;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => OrderItem, (item) => item.statusHistory, { nullable: false })
  @JoinColumn({ name: 'order_item_id' })
  orderItem: OrderItem;
}
