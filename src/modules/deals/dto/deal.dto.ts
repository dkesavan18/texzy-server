import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNumber,
  IsNumberString,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateDealDto {
  @ApiProperty()
  @IsNumberString()
  conversationId: string;

  @ApiProperty()
  @IsNumberString()
  sellerUserId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  sourceCategoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  sourceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  finalPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deliverAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateDealStatusDto {
  @ApiProperty()
  @IsString()
  status: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  contactShared?: boolean;
}
