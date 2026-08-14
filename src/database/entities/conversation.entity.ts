import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Category } from './category.entity';
import { ConversationEvent } from './conversation-event.entity';
import { Deal } from './deal.entity';
import { User } from './user.entity';

@Entity({ name: 'conversations' })
export class Conversation {
  @PrimaryGeneratedColumn({ name: 'conversation_id', type: 'bigint' })
  conversationId: string;

  @Column({ name: 'buyer_user_id', type: 'bigint', nullable: true })
  buyerUserId: string | null;

  @Column({ name: 'seller_user_id', type: 'bigint', nullable: true })
  sellerUserId: string | null;

  @Column({ name: 'source_type', type: 'varchar', nullable: true })
  sourceType: string | null;

  @Column({ name: 'source_id', type: 'bigint', nullable: true })
  sourceId: string | null;

  @Column({ name: 'status_category_id', type: 'bigint', nullable: true })
  statusCategoryId: string | null;

  @Column({ name: 'created_at', type: 'timetz', nullable: true })
  createdAt: string | null;

  @Column({ name: 'updated_at', type: 'timetz', nullable: true })
  updatedAt: string | null;

  @ManyToOne(() => User, (user) => user.buyerConversations, { nullable: true })
  @JoinColumn({ name: 'buyer_user_id' })
  buyer: User | null;

  @ManyToOne(() => User, (user) => user.sellerConversations, { nullable: true })
  @JoinColumn({ name: 'seller_user_id' })
  seller: User | null;

  @ManyToOne(() => Category, (category) => category.conversations, {
    nullable: true,
  })
  @JoinColumn({ name: 'status_category_id' })
  statusCategory: Category | null;

  @OneToMany(() => ConversationEvent, (event) => event.conversation)
  events: ConversationEvent[];

  @OneToMany(() => Deal, (deal) => deal.conversation)
  deals: Deal[];
}
