import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Conversation } from './conversation.entity';
import { User } from './user.entity';

@Entity({ name: 'conversation_events' })
export class ConversationEvent {
  @PrimaryGeneratedColumn({ name: 'conversation_event_id', type: 'bigint' })
  conversationEventId: string;

  @Column({ name: 'conversation_id', type: 'bigint', nullable: true })
  conversationId: string | null;

  @Column({ name: 'sender_type', type: 'varchar', nullable: true })
  senderType: string | null;

  @Column({ name: 'sender_user_id', type: 'bigint', nullable: true })
  senderUserId: string | null;

  @Column({ name: 'event_type', type: 'varchar', nullable: true })
  eventType: string | null;

  @Column({ name: 'event_code', type: 'varchar', nullable: true })
  eventCode: string | null;

  @Column({ name: 'payload', type: 'jsonb', nullable: true })
  payload: Record<string, unknown> | null;

  @Column({ name: 'created_at', type: 'timetz', nullable: true })
  createdAt: string | null;

  @ManyToOne(() => Conversation, (conversation) => conversation.events, {
    nullable: true,
  })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation | null;

  @ManyToOne(() => User, (user) => user.conversationEvents, { nullable: true })
  @JoinColumn({ name: 'sender_user_id' })
  sender: User | null;
}
