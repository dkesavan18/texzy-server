import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsNumber,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { DEAL_STATUS } from '../constants/deal-status.constant';

const DEAL_STATUS_VALUES = Object.values(DEAL_STATUS);

/** Buyer starts a bulk order from an accepted (or pending) need response. */
export class CreateDealFromNeedResponseDto {
  @ApiProperty()
  @IsNumberString()
  needResponseId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  deliverAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

/** Buyer requests a bulk order against a product with allow_bulk_order. */
export class CreateDealFromProductDto {
  @ApiProperty()
  @IsNumberString()
  productId: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  deliverAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

/** Seller or buyer updates the quotation / negotiation. */
export class RespondDealDto {
  @ApiPropertyOptional({ enum: DEAL_STATUS_VALUES })
  @IsOptional()
  @IsIn(DEAL_STATUS_VALUES)
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  finalPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  deliverAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class UpdateDealStatusDto {
  @ApiProperty({ enum: DEAL_STATUS_VALUES })
  @IsIn(DEAL_STATUS_VALUES)
  status: string;
}
