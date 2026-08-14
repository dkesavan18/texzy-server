import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Category } from './category.entity';
import { Collection } from './collection.entity';
import { Conversation } from './conversation.entity';
import { ConversationEvent } from './conversation-event.entity';
import { Deal } from './deal.entity';
import { Need } from './need.entity';
import { NeedResponse } from './need-response.entity';
import { Product } from './product.entity';
import { Profile } from './profile.entity';
import { UserDevice } from './user-device.entity';
import { UserSession } from './user-session.entity';
import { Verification } from './verification.entity';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn({ name: 'user_id', type: 'bigint' })
  userId: string;

  @Column({ name: 'role_id', type: 'int', nullable: true })
  roleId: number | null;

  @Column({ name: 'email', type: 'varchar', nullable: true })
  email: string | null;

  @Column({ name: 'phone', type: 'bigint', nullable: true })
  phone: string | null;

  @Column({ name: 'password_hash', type: 'varchar', nullable: true })
  passwordHash: string | null;

  @Column({ name: 'is_active', type: 'boolean', nullable: true })
  isActive: boolean | null;

  @Column({ name: 'login_provider', type: 'varchar', nullable: true })
  loginProvider: string | null;

  @Column({ name: 'created_at', type: 'timetz', nullable: true })
  createdAt: string | null;

  @Column({ name: 'updated_at', type: 'timetz', nullable: true })
  updatedAt: string | null;

  @Column({ name: 'is_customer', type: 'boolean', nullable: true })
  isCustomer: boolean | null;

  @Column({ name: 'google_id', type: 'varchar', length: 255, nullable: true })
  googleId: string | null;

  @ManyToOne(() => Category, { nullable: true })
  @JoinColumn({ name: 'role_id' })
  role: Category | null;

  @OneToMany(() => Profile, (profile) => profile.user)
  profiles: Profile[];

  @OneToMany(() => UserDevice, (device) => device.user)
  devices: UserDevice[];

  @OneToMany(() => UserSession, (session) => session.user)
  sessions: UserSession[];

  @OneToMany(() => Verification, (verification) => verification.user)
  verifications: Verification[];

  @OneToMany(() => Product, (product) => product.user)
  products: Product[];

  @OneToMany(() => Need, (need) => need.user)
  needs: Need[];

  @OneToMany(() => Collection, (collection) => collection.user)
  collections: Collection[];

  @OneToMany(() => Conversation, (conversation) => conversation.buyer)
  buyerConversations: Conversation[];

  @OneToMany(() => Conversation, (conversation) => conversation.seller)
  sellerConversations: Conversation[];

  @OneToMany(() => ConversationEvent, (event) => event.sender)
  conversationEvents: ConversationEvent[];

  @OneToMany(() => Deal, (deal) => deal.buyer)
  buyerDeals: Deal[];

  @OneToMany(() => Deal, (deal) => deal.seller)
  sellerDeals: Deal[];

  @OneToMany(() => NeedResponse, (response) => response.respondedByUser)
  needResponses: NeedResponse[];
}
