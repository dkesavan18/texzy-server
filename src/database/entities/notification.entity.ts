import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

/**
 * Centralized Texzy Inbox notification row. `userId` is the sole ownership field
 * (no business_id) — a notification always belongs to exactly one recipient user.
 * `referenceType` + `referenceId` are a lightweight polymorphic pointer the frontend
 * uses to build the click-through deep link (e.g. referenceType='order_item').
 */
@Entity({ name: 'notifications' })
@Index(['userId', 'createdAt'])
@Index(['userId', 'isRead'])
export class Notification {
  @PrimaryGeneratedColumn({ name: 'notification_id', type: 'bigint' })
  notificationId: string;

  @Column({ name: 'user_id', type: 'bigint' })
  userId: string;

  @Column({ name: 'type', type: 'varchar', length: 64 })
  type: string;

  @Column({ name: 'title', type: 'varchar', length: 255 })
  title: string;

  @Column({ name: 'message', type: 'text', nullable: true })
  message: string | null;

  @Column({ name: 'reference_id', type: 'varchar', length: 64, nullable: true })
  referenceId: string | null;

  @Column({
    name: 'reference_type',
    type: 'varchar',
    length: 32,
    nullable: true,
  })
  referenceType: string | null;

  @Column({ name: 'is_read', type: 'boolean', default: false })
  isRead: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
