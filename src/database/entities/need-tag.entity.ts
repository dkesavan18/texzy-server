import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Need } from './need.entity';
import { NeedTagsMapping } from './need-tags-mapping.entity';

@Entity({ name: 'need_tags' })
export class NeedTag {
  @PrimaryGeneratedColumn({ name: 'need_tag_id', type: 'int' })
  needTagId: number;

  @Column({ name: 'tag_name', type: 'varchar', nullable: true })
  tagName: string | null;

  @Column({ name: 'need_id', type: 'bigint', nullable: true })
  needId: string | null;

  @Column({ name: 'is_active', type: 'boolean', nullable: true })
  isActive: boolean | null;

  @Column({ name: 'created_at', type: 'timetz', nullable: true })
  createdAt: string | null;

  @Column({ name: 'updated_at', type: 'timetz', nullable: true })
  updatedAt: string | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: string | null;

  @ManyToOne(() => Need, (need) => need.tags, { nullable: true })
  @JoinColumn({ name: 'need_id' })
  need: Need | null;

  @OneToMany(() => NeedTagsMapping, (mapping) => mapping.needTag)
  mappings: NeedTagsMapping[];
}
