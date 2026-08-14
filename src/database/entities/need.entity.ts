import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Category } from './category.entity';
import { NeedMedia } from './need-media.entity';
import { NeedResponse } from './need-response.entity';
import { NeedTag } from './need-tag.entity';
import { NeedTagsMapping } from './need-tags-mapping.entity';
import { User } from './user.entity';

@Entity({ name: 'needs' })
export class Need {
  @PrimaryGeneratedColumn({ name: 'need_id', type: 'bigint' })
  needId: string;

  @Column({ name: 'title', type: 'varchar', nullable: true })
  title: string | null;

  /** DB column name contains a space: "need description" */
  @Column({ name: 'need description', type: 'text', nullable: true })
  needDescription: string | null;

  @Column({ name: 'need_type_id', type: 'int', nullable: true })
  needTypeId: number | null;

  @Column({ name: 'need_category_id', type: 'int', nullable: true })
  needCategoryId: number | null;

  @Column({ name: 'quantity', type: 'int', nullable: true })
  quantity: number | null;

  @Column({ name: 'budget_min', type: 'float8', nullable: true })
  budgetMin: number | null;

  @Column({ name: 'budget_max', type: 'float8', nullable: true })
  budgetMax: number | null;

  @Column({ name: 'address', type: 'text', nullable: true })
  address: string | null;

  @Column({ name: 'user_id', type: 'bigint', nullable: true })
  userId: string | null;

  @Column({ name: 'priority', type: 'varchar', nullable: true })
  priority: string | null;

  @Column({ name: 'unit', type: 'varchar', nullable: true })
  unit: string | null;

  @Column({ name: 'required_before', type: 'timetz', nullable: true })
  requiredBefore: string | null;

  @Column({ name: 'status', type: 'varchar', nullable: true })
  status: string | null;

  @Column({ name: 'total_views', type: 'int', nullable: true })
  totalViews: number | null;

  @Column({ name: 'total_responses', type: 'int', nullable: true })
  totalResponses: number | null;

  @Column({ name: 'accepted_response_id', type: 'bigint', nullable: true })
  acceptedResponseId: string | null;

  @Column({ name: 'is_active', type: 'boolean', nullable: true })
  isActive: boolean | null;

  @Column({ name: 'is_customer', type: 'boolean', nullable: true })
  isCustomer: boolean | null;

  @Column({ name: 'created_at', type: 'timetz', nullable: true })
  createdAt: string | null;

  @Column({ name: 'updated_at', type: 'timetz', nullable: true })
  updatedAt: string | null;

  @Column({ name: 'need_tag_id', type: 'int', nullable: true })
  needTagId: number | null;

  @Column({ name: 'need_tag_mapping_id', type: 'int', nullable: true })
  needTagMappingId: number | null;

  @ManyToOne(() => Category, (category) => category.needsAsType, {
    nullable: true,
  })
  @JoinColumn({ name: 'need_type_id' })
  needType: Category | null;

  @ManyToOne(() => Category, (category) => category.needsAsCategory, {
    nullable: true,
  })
  @JoinColumn({ name: 'need_category_id' })
  needCategory: Category | null;

  @ManyToOne(() => User, (user) => user.needs, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @ManyToOne(() => NeedTagsMapping, { nullable: true })
  @JoinColumn({ name: 'need_tag_mapping_id' })
  needTagMapping: NeedTagsMapping | null;

  @OneToMany(() => NeedMedia, (media) => media.need)
  media: NeedMedia[];

  @OneToMany(() => NeedResponse, (response) => response.need)
  responses: NeedResponse[];

  @OneToMany(() => NeedTag, (tag) => tag.need)
  tags: NeedTag[];
}
