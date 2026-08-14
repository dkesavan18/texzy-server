import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity({ name: 'verifications' })
export class Verification {
  @PrimaryGeneratedColumn({ name: 'verification_id', type: 'bigint' })
  verificationId: string;

  @Column({ name: 'gst', type: 'varchar', nullable: true })
  gst: string | null;

  @Column({ name: 'locations', type: 'jsonb', array: true, nullable: true })
  locations: Record<string, unknown>[] | null;

  @Column({ name: 'contact_phone', type: 'bigint', nullable: true })
  contactPhone: string | null;

  @Column({ name: 'contact_email', type: 'varchar', nullable: true })
  contactEmail: string | null;

  @Column({ name: 'business_verified', type: 'boolean', nullable: true })
  businessVerified: boolean | null;

  @Column({ name: 'gst_verified', type: 'boolean', nullable: true })
  gstVerified: boolean | null;

  /** Existing DB column spelling: location_verfied */
  @Column({ name: 'location_verfied', type: 'boolean', nullable: true })
  locationVerfied: boolean | null;

  @Column({ name: 'upi_id_verified', type: 'boolean', nullable: true })
  upiIdVerified: boolean | null;

  @Column({ name: 'contacts_verified', type: 'boolean', nullable: true })
  contactsVerified: boolean | null;

  @Column({ name: 'verified_by', type: 'bigint', nullable: true })
  verifiedBy: string | null;

  @Column({ name: 'created_at', type: 'timetz', nullable: true })
  createdAt: string | null;

  @Column({ name: 'updated_at', type: 'timetz', nullable: true })
  updatedAt: string | null;

  @Column({ name: 'updated_reason', type: 'varchar', nullable: true })
  updatedReason: string | null;

  @Column({ name: 'user_id', type: 'bigint', nullable: true })
  userId: string | null;

  @ManyToOne(() => User, (user) => user.verifications, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;
}
