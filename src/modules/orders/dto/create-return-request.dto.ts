import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  ORDER_RETURN_REASONS,
  type OrderReturnReason,
} from '../constants/order-status.constant';

export class CreateReturnRequestDto {
  @ApiProperty({ enum: ORDER_RETURN_REASONS })
  @IsIn(ORDER_RETURN_REASONS)
  reason: OrderReturnReason;

  @ApiPropertyOptional({
    description: 'Optional extra detail shown to the seller',
  })
  @IsOptional()
  @IsString()
  @MaxLength(400)
  note?: string;
}
