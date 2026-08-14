import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';
import { UserSession } from './user-session.entity';

@Entity({ name: 'user_devices' })
export class UserDevice {
  @PrimaryGeneratedColumn({ name: 'device_id', type: 'bigint' })
  deviceId: string;

  @Column({ name: 'user_id', type: 'bigint', nullable: true })
  userId: string | null;

  @Column({ name: 'device_uuid', type: 'varchar', nullable: true })
  deviceUuid: string | null;

  @Column({ name: 'device_name', type: 'varchar', nullable: true })
  deviceName: string | null;

  @Column({ name: 'platform', type: 'varchar', nullable: true })
  platform: string | null;

  @Column({ name: 'os_version', type: 'varchar', nullable: true })
  osVersion: string | null;

  @Column({ name: 'app_version', type: 'varchar', nullable: true })
  appVersion: string | null;

  @Column({ name: 'device_model', type: 'varchar', nullable: true })
  deviceModel: string | null;

  /** Existing DB column spelling: manufacturar */
  @Column({ name: 'manufacturar', type: 'varchar', nullable: true })
  manufacturar: string | null;

  @Column({ name: 'fcm_token', type: 'text', nullable: true })
  fcmToken: string | null;

  @Column({ name: 'timezone', type: 'varchar', nullable: true })
  timezone: string | null;

  @Column({ name: 'language', type: 'varchar', nullable: true })
  language: string | null;

  @Column({ name: 'last_login_at', type: 'timetz', nullable: true })
  lastLoginAt: string | null;

  @Column({ name: 'last_active_at', type: 'timetz', nullable: true })
  lastActiveAt: string | null;

  @Column({ name: 'is_active', type: 'boolean', nullable: true })
  isActive: boolean | null;

  @Column({ name: 'created_at', type: 'timetz', nullable: true })
  createdAt: string | null;

  @Column({ name: 'updated_at', type: 'timetz', nullable: true })
  updatedAt: string | null;

  @ManyToOne(() => User, (user) => user.devices, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @OneToMany(() => UserSession, (session) => session.device)
  sessions: UserSession[];
}
