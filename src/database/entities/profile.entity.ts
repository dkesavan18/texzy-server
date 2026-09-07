import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Category } from './category.entity';
import { User } from './user.entity';

@Entity({ name: 'profiles' })
export class Profile {
  @PrimaryGeneratedColumn({ name: 'profile_id', type: 'bigint' })
  profileId: string;

  @Column({ name: 'user_id', type: 'bigint', nullable: true })
  userId: string | null;

  @Column({ name: 'display_name', type: 'varchar', nullable: true })
  displayName: string | null;

  @Column({ name: 'language', type: 'varchar', nullable: true })
  language: string | null;

  /** Display currency for pricing (explore sub-header). Defaults to INR. */
  @Column({ name: 'preferred_currency', type: 'varchar', length: 10, default: 'INR' })
  preferredCurrency: string;

  @Column({ name: 'cover_image', type: 'text', nullable: true })
  coverImage: string | null;

  @Column({ name: 'about', type: 'text', nullable: true })
  about: string | null;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'ratings', type: 'smallint', nullable: true })
  ratings: number | null;

  /** Public business-profile views — incremented on GET /profiles/:id only. */
  @Column({ name: 'total_views', type: 'int', default: 0 })
  totalViews: number;

  /** From GET /categories?type=business_type */
  @Column({ name: 'business_type_id', type: 'int', nullable: true })
  businessTypeId: number | null;

  /** From GET /categories?type=business_mode */
  @Column({ name: 'business_mode_id', type: 'int', nullable: true })
  businessModeId: number | null;

  /** From GET /categories?type=business_category (multi-select) */
  @Column({ name: 'business_category_ids', type: 'jsonb', nullable: true })
  businessCategoryIds: number[] | null;

  @Column({ name: 'location', type: 'text', nullable: true })
  location: string | null;

  @Column({ name: 'verify_percentage', type: 'int', nullable: true })
  verifyPercentage: number | null;

  @Column({ name: 'contact_phone', type: 'bigint', nullable: true })
  contactPhone: string | null;

  @Column({ name: 'contact_email', type: 'varchar', nullable: true })
  contactEmail: string | null;

  @Column({ name: 'created_at', type: 'timetz', nullable: true })
  createdAt: string | null;

  @Column({ name: 'updated_at', type: 'timetz', nullable: true })
  updatedAt: string | null;

  @Column({ name: 'locations', type: 'jsonb', array: true, nullable: true })
  locations: Record<string, unknown>[] | null;

  /** Public Cloudflare R2 URL for the business profile / logo image. */
  @Column({ name: 'profile_url', type: 'text', nullable: true })
  profileUrl: string | null;

  @ManyToOne(() => User, (user) => user.profiles, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @ManyToOne(() => Category, (category) => category.profiles, {
    nullable: true,
  })
  @JoinColumn({ name: 'business_type_id' })
  businessType: Category | null;

  @ManyToOne(() => Category, { nullable: true })
  @JoinColumn({ name: 'business_mode_id' })
  businessMode: Category | null;
}
