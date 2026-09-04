import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  ORDER_ITEM_STATUS,
  type OrderItemStatusValue,
} from '../constants/order-status.constant';

const STATUS_VALUES = Object.values(ORDER_ITEM_STATUS);

export class UpdateOrderItemStatusDto {
  @ApiProperty({ enum: STATUS_VALUES })
  @IsIn(STATUS_VALUES)
  status: OrderItemStatusValue;

  @ApiPropertyOptional({
    description: 'Optional note shown to the customer on the tracking timeline',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  trackingNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  courierName?: string;

  @ApiPropertyOptional({ example: '2026-09-10' })
  @IsOptional()
  @IsString()
  expectedDeliveryDate?: string;

  /**
   * Public R2 URL of a photo already uploaded via
   * POST /uploads/presign|upload with entityType 'order-item-delivery'.
   * Typically attached on 'packed' (packing proof) or 'delivered' (delivery confirmation).
   */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;
}
