import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

/** Buyer's saved delivery address — capped at 3 per user, enforced in AddressesService. */
@Entity({ name: 'addresses' })
export class Address {
  @PrimaryGeneratedColumn({ name: 'address_id', type: 'bigint' })
  addressId: string;

  @Column({ name: 'user_id', type: 'bigint' })
  userId: string;

  @Column({ name: 'full_name', type: 'varchar', length: 120 })
  fullName: string;

  @Column({ name: 'phone', type: 'varchar', length: 20 })
  phone: string;

  @Column({ name: 'address_line1', type: 'varchar', length: 200 })
  addressLine1: string;

  @Column({ name: 'address_line2', type: 'varchar', length: 200, nullable: true })
  addressLine2: string | null;

  @Column({ name: 'city', type: 'varchar', length: 100 })
  city: string;

  @Column({ name: 'state', type: 'varchar', length: 100 })
  state: string;

  @Column({ name: 'pincode', type: 'varchar', length: 10 })
  pincode: string;

  @Column({ name: 'country', type: 'varchar', length: 100, default: 'India' })
  country: string;

  /** Label shown in the address book — e.g. Home, Work, Other. */
  @Column({ name: 'label', type: 'varchar', length: 40, default: 'Home' })
  label: string;

  /** Only one default address per user — enforced in AddressesService. */
  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault: boolean;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
