import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { User } from './user.entity';

@Entity({ name: 'payments' })
export class Payment {
  @PrimaryGeneratedColumn({ name: 'payment_id', type: 'bigint' })
  paymentId: string;

  @Column({ name: 'order_id', type: 'bigint' })
  orderId: string;

  @Column({ name: 'user_id', type: 'bigint' })
  userId: string;

  @Column({ name: 'razorpay_order_id', type: 'varchar', length: 64 })
  razorpayOrderId: string;

  @Column({
    name: 'razorpay_payment_id',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  razorpayPaymentId: string | null;

  @Column({
    name: 'razorpay_signature',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  razorpaySignature: string | null;

  /** Rupees (matches orders.total_amount) — converted to paise only when calling Razorpay. */
  @Column({ name: 'amount', type: 'float8' })
  amount: number;

  @Column({ name: 'currency', type: 'varchar', length: 10, default: 'INR' })
  currency: string;

  /** 'created' | 'paid' | 'failed'. */
  @Column({ name: 'status', type: 'varchar', length: 20, default: 'created' })
  status: string;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Order, (order) => order.payments, { nullable: false })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
