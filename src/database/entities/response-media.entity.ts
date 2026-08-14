import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { NeedResponse } from './need-response.entity';

@Entity({ name: 'response_media' })
export class ResponseMedia {
  @PrimaryGeneratedColumn({ name: 'response_media_id', type: 'bigint' })
  responseMediaId: string;

  @Column({ name: 'need_response_id', type: 'bigint', nullable: true })
  needResponseId: string | null;

  @Column({ name: 'media_type', type: 'varchar', nullable: true })
  mediaType: string | null;

  @Column({ name: 'storage_key', type: 'varchar', nullable: true })
  storageKey: string | null;

  @Column({ name: 'media_url', type: 'text', nullable: true })
  mediaUrl: string | null;

  @Column({ name: 'thumbnail_url', type: 'text', nullable: true })
  thumbnailUrl: string | null;

  @Column({ name: 'display_order', type: 'int', nullable: true })
  displayOrder: number | null;

  @Column({ name: 'is_primary', type: 'boolean', nullable: true })
  isPrimary: boolean | null;

  @Column({ name: 'created_at', type: 'timetz', nullable: true })
  createdAt: string | null;

  @Column({ name: 'updated_at', type: 'timetz', nullable: true })
  updatedAt: string | null;

  @Column({ name: 'is_active', type: 'boolean', nullable: true })
  isActive: boolean | null;

  @ManyToOne(() => NeedResponse, (response) => response.media, {
    nullable: true,
  })
  @JoinColumn({ name: 'need_response_id' })
  needResponse: NeedResponse | null;
}
