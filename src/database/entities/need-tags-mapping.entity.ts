import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { NeedTag } from './need-tag.entity';

@Entity({ name: 'need_tags_mapping' })
export class NeedTagsMapping {
  @PrimaryGeneratedColumn({ name: 'need_tags_mapping_id', type: 'int' })
  needTagsMappingId: number;

  @Column({ name: 'need_tag_id', type: 'int', nullable: true })
  needTagId: number | null;

  @Column({ name: 'tag_name', type: 'varchar', nullable: true })
  tagName: string | null;

  @Column({ name: 'is_active', type: 'boolean', nullable: true })
  isActive: boolean | null;

  @Column({ name: 'created_at', type: 'timetz', nullable: true })
  createdAt: string | null;

  @Column({ name: 'updated_at', type: 'timetz', nullable: true })
  updatedAt: string | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: string | null;

  @ManyToOne(() => NeedTag, (tag) => tag.mappings, { nullable: true })
  @JoinColumn({ name: 'need_tag_id' })
  needTag: NeedTag | null;
}
