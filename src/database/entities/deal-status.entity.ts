import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Deal } from './deal.entity';

@Entity({ name: 'deal_status' })
export class DealStatus {
  @PrimaryGeneratedColumn({ name: 'deal_status_id', type: 'bigint' })
  dealStatusId: string;

  @Column({ name: 'deal_id', type: 'bigint', nullable: true })
  dealId: string | null;

  @Column({ name: 'status', type: 'varchar', nullable: true })
  status: string | null;

  @Column({ name: 'created_at', type: 'timetz', nullable: true })
  createdAt: string | null;

  @Column({ name: 'changed_by', type: 'bigint', nullable: true })
  changedBy: string | null;

  @ManyToOne(() => Deal, (deal) => deal.statusHistory, { nullable: true })
  @JoinColumn({ name: 'deal_id' })
  deal: Deal | null;
}
