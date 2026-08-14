import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';
import { UserDevice } from './user-device.entity';

@Entity({ name: 'user_sessions' })
export class UserSession {
  @PrimaryGeneratedColumn({ name: 'session_id', type: 'bigint' })
  sessionId: string;

  @Column({ name: 'user_id', type: 'bigint', nullable: true })
  userId: string | null;

  @Column({ name: 'device_id', type: 'bigint', nullable: true })
  deviceId: string | null;

  @Column({ name: 'refresh_token', type: 'text', nullable: true })
  refreshToken: string | null;

  @Column({ name: 'login_provider', type: 'varchar', nullable: true })
  loginProvider: string | null;

  @Column({ name: 'ip_address', type: 'varchar', nullable: true })
  ipAddress: string | null;

  @Column({ name: 'user_agent', type: 'varchar', nullable: true })
  userAgent: string | null;

  @Column({ name: 'login_at', type: 'timetz', nullable: true })
  loginAt: string | null;

  @Column({ name: 'expires_at', type: 'timetz', nullable: true })
  expiresAt: string | null;

  @Column({ name: 'last_activity_at', type: 'timetz', nullable: true })
  lastActivityAt: string | null;

  @Column({ name: 'logout_at', type: 'timetz', nullable: true })
  logoutAt: string | null;

  @Column({ name: 'logout_reason', type: 'varchar', nullable: true })
  logoutReason: string | null;

  @Column({ name: 'is_active', type: 'boolean', nullable: true })
  isActive: boolean | null;

  @Column({ name: 'created_at', type: 'timetz', nullable: true })
  createdAt: string | null;

  @Column({ name: 'updated_at', type: 'timetz', nullable: true })
  updatedAt: string | null;

  @Column({ name: 'access_token', type: 'text', nullable: true })
  accessToken: string | null;

  @ManyToOne(() => User, (user) => user.sessions, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @ManyToOne(() => UserDevice, (device) => device.sessions, { nullable: true })
  @JoinColumn({ name: 'device_id' })
  device: UserDevice | null;
}
