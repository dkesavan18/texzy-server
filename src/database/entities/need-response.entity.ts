import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Need } from './need.entity';
import { ResponseMedia } from './response-media.entity';
import { User } from './user.entity';

@Entity({ name: 'need_responses' })
export class NeedResponse {
  @PrimaryGeneratedColumn({ name: 'need_response_id', type: 'bigint' })
  needResponseId: string;

  @Column({ name: 'need_id', type: 'bigint', nullable: true })
  needId: string | null;

  /** Existing DB column spelling: reponsed_by */
  @Column({ name: 'reponsed_by', type: 'bigint', nullable: true })
  reponsedBy: string | null;

  /** FK in DB points to needs.need_id */
  @Column({ name: 'need_user_id', type: 'bigint', nullable: true })
  needUserId: string | null;

  @Column({ name: 'message', type: 'varchar', nullable: true })
  message: string | null;

  @Column({ name: 'available_quantity', type: 'int', nullable: true })
  availableQuantity: number | null;

  @Column({ name: 'estimated_price', type: 'float8', nullable: true })
  estimatedPrice: number | null;

  @Column({ name: 'unit', type: 'varchar', nullable: true })
  unit: string | null;

  @Column({ name: 'estimated_delivery', type: 'timetz', nullable: true })
  estimatedDelivery: string | null;

  @Column({ name: 'status', type: 'varchar', nullable: true })
  status: string | null;

  @Column({ name: 'is_active', type: 'boolean', nullable: true })
  isActive: boolean | null;

  @Column({ name: 'created_at', type: 'timetz', nullable: true })
  createdAt: string | null;

  @Column({ name: 'updated_at', type: 'timetz', nullable: true })
  updatedAt: string | null;

  @Column({ name: 'contact_phone', type: 'varchar', nullable: true })
  contactPhone: string | null;

  @ManyToOne(() => Need, (need) => need.responses, { nullable: true })
  @JoinColumn({ name: 'need_id' })
  need: Need | null;

  @ManyToOne(() => User, (user) => user.needResponses, { nullable: true })
  @JoinColumn({ name: 'reponsed_by' })
  respondedByUser: User | null;

  @ManyToOne(() => Need, { nullable: true })
  @JoinColumn({ name: 'need_user_id' })
  needUser: Need | null;

  @OneToMany(() => ResponseMedia, (media) => media.needResponse)
  media: ResponseMedia[];
}
