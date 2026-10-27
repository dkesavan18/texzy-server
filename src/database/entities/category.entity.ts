import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CategoryType } from './category-type.entity';
import { Collection } from './collection.entity';
import { Conversation } from './conversation.entity';
import { Deal } from './deal.entity';
import { Need } from './need.entity';
import { Product } from './product.entity';
import { Profile } from './profile.entity';
import { User } from './user.entity';

@Entity({ name: 'categories' })
export class Category {
  @PrimaryGeneratedColumn({ name: 'category_id', type: 'bigint' })
  categoryId: string;

  @Column({ name: 'category_type_id', type: 'int', nullable: true })
  categoryTypeId: number | null;

  @Column({ name: 'created_at', type: 'timetz', nullable: true })
  createdAt: string | null;

  @Column({ name: 'updated_at', type: 'timetz', nullable: true })
  updatedAt: string | null;

  @Column({ name: 'is_active', type: 'boolean', nullable: true })
  isActive: boolean | null;

  @Column({ name: 'category_name', type: 'varchar', nullable: true })
  categoryName: string | null;

  /** Stable UPPER_SNAKE identifier, unique within a category type. */
  @Column({ name: 'code', type: 'varchar', length: 80, nullable: true })
  code: string | null;

  /** Parent category (product groups -> product types, base colour -> shades). */
  @Column({ name: 'parent_id', type: 'bigint', nullable: true })
  parentId: string | null;

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder: number;

  /** Option metadata, e.g. `{ "hex": "E0218A" }` for colours. */
  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @ManyToOne(() => Category, (category) => category.children, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: Category | null;

  @OneToMany(() => Category, (category) => category.parent)
  children: Category[];

  @ManyToOne(() => CategoryType, (type) => type.categories, { nullable: true })
  @JoinColumn({ name: 'category_type_id' })
  categoryType: CategoryType | null;

  @OneToMany(() => User, (user) => user.role)
  users: User[];

  @OneToMany(() => Product, (product) => product.productCategory)
  products: Product[];

  @OneToMany(() => Need, (need) => need.needCategory)
  needsAsCategory: Need[];

  @OneToMany(() => Need, (need) => need.needType)
  needsAsType: Need[];

  @OneToMany(() => Collection, (collection) => collection.collectionCategory)
  collections: Collection[];

  @OneToMany(() => Conversation, (conversation) => conversation.statusCategory)
  conversations: Conversation[];

  @OneToMany(() => Deal, (deal) => deal.sourceCategory)
  deals: Deal[];

  @OneToMany(() => Profile, (profile) => profile.businessType)
  profiles: Profile[];
}
