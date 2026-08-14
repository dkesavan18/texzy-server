import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Category } from './category.entity';
import { Conversation } from './conversation.entity';
import { DealStatus } from './deal-status.entity';
import { User } from './user.entity';

@Entity({ name: 'deals' })
export class Deal {
  @PrimaryGeneratedColumn({ name: 'deal_id', type: 'bigint' })
  dealId: string;

  @Column({ name: 'conversation_id', type: 'bigint', nullable: true })
  conversationId: string | null;

  @Column({ name: 'buyer_user_id', type: 'bigint', nullable: true })
  buyerUserId: string | null;

  @Column({ name: 'seller_user_id', type: 'bigint', nullable: true })
  sellerUserId: string | null;

  @Column({ name: 'source_category_id', type: 'bigint', nullable: true })
  sourceCategoryId: string | null;

  @Column({ name: 'source_id', type: 'bigint', nullable: true })
  sourceId: string | null;

  @Column({ name: 'final_price', type: 'float8', nullable: true })
  finalPrice: number | null;

  @Column({ name: 'quantity', type: 'int', nullable: true })
  quantity: number | null;

  @Column({ name: 'deliver_address', type: 'text', nullable: true })
  deliverAddress: string | null;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'status', type: 'varchar', nullable: true })
  status: string | null;

  @Column({ name: 'contact_shared', type: 'boolean', nullable: true })
  contactShared: boolean | null;

  @Column({ name: 'completed_at', type: 'timetz', nullable: true })
  completedAt: string | null;

  @Column({ name: 'created_at', type: 'timetz', nullable: true })
  createdAt: string | null;

  @ManyToOne(() => Conversation, (conversation) => conversation.deals, {
    nullable: true,
  })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation | null;

  @ManyToOne(() => User, (user) => user.buyerDeals, { nullable: true })
  @JoinColumn({ name: 'buyer_user_id' })
  buyer: User | null;

  @ManyToOne(() => User, (user) => user.sellerDeals, { nullable: true })
  @JoinColumn({ name: 'seller_user_id' })
  seller: User | null;

  @ManyToOne(() => Category, (category) => category.deals, { nullable: true })
  @JoinColumn({ name: 'source_category_id' })
  sourceCategory: Category | null;

  @OneToMany(() => DealStatus, (status) => status.deal)
  statusHistory: DealStatus[];
}
