import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateNeedDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  needDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  needTypeId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  needCategoryId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  budgetMin?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  budgetMax?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  unit?: string;
}

export class UpdateNeedDto extends PartialType(CreateNeedDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;
}
