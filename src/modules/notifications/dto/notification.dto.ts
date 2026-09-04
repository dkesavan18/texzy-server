import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { NOTIFICATION_SECTION } from '../constants/notification-type.constant';

export class RegisterTokenDto {
  @ApiProperty({ example: 'fcm-web-token-abc123...' })
  @IsString()
  @MaxLength(4096)
  token: string;

  @ApiPropertyOptional({ example: 'web', enum: ['web', 'android', 'ios'] })
  @IsOptional()
  @IsString()
  platform?: string;
}

export class ListNotificationsQueryDto {
  @ApiPropertyOptional({
    enum: Object.values(NOTIFICATION_SECTION),
    example: 'orders',
  })
  @IsOptional()
  @IsIn(Object.values(NOTIFICATION_SECTION))
  section?: string;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  take?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  skip?: number;
}

export class AdminBroadcastDto {
  @ApiProperty({ example: 'New textile arrived: Premium Cotton Denim' })
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiProperty({
    example: 'Check out the new denim collection now live on Texzy.',
  })
  @IsString()
  @MaxLength(2000)
  message: string;

  @ApiPropertyOptional({
    description: 'Target audience — defaults to "all"',
    enum: ['all', 'buyers', 'sellers', 'users'],
    example: 'all',
  })
  @IsOptional()
  @IsIn(['all', 'buyers', 'sellers', 'users'])
  audience?: 'all' | 'buyers' | 'sellers' | 'users';

  @ApiPropertyOptional({
    description: 'Explicit recipient user IDs — required when audience="users"',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  userIds?: string[];

  @ApiPropertyOptional({
    description: 'Category (textile) the notification is about',
    example: '12',
  })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Product this notification points to',
    example: '345',
  })
  @IsOptional()
  @IsString()
  productId?: string;
}
