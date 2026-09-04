import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateNeedDto {
  @ApiProperty({ example: 'Looking for 500m cotton fabric' })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  needDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  needTypeId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  needCategoryId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  budgetMin?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  budgetMax?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ example: 'normal' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  priority?: string;

  @ApiPropertyOptional({ example: 'metres' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  unit?: string;

  /** Preferred fulfilment deadline (ISO date or time string stored as timetz). */
  @ApiPropertyOptional({ example: '2026-09-20' })
  @IsOptional()
  @IsString()
  requiredBefore?: string;
}

export class UpdateNeedDto extends PartialType(CreateNeedDto) {
  @ApiPropertyOptional({ enum: ['open', 'closed', 'fulfilled', 'cancelled'] })
  @IsOptional()
  @IsString()
  status?: string;
}

export class CreateNeedResponseDto {
  @ApiProperty({ example: 'We can supply this within 5 days.' })
  @IsString()
  @MaxLength(2000)
  message: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  availableQuantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  estimatedPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  unit?: string;

  @ApiPropertyOptional({ example: '2026-09-15' })
  @IsOptional()
  @IsString()
  estimatedDelivery?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  contactPhone?: string;
}
