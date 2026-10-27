import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export const CODE_PATTERN = /^[A-Z0-9][A-Z0-9_]*$/;

export class CreateCategoryDto {
  @ApiProperty({ example: 'Kanchipuram Silk Saree' })
  @IsString()
  categoryName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  categoryTypeId?: number;

  @ApiPropertyOptional({
    example: 'KANCHIPURAM_SILK_SAREE',
    description: 'UPPER_SNAKE code, unique within the category type. Derived from the name when omitted.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Matches(CODE_PATTERN, { message: 'code must be UPPER_SNAKE_CASE (A-Z, 0-9, _)' })
  code?: string;

  @ApiPropertyOptional({ description: 'Parent category id (same category type)' })
  @IsOptional()
  @IsNumber()
  parentId?: number | null;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  displayOrder?: number;

  @ApiPropertyOptional({ example: { hex: 'E0218A' }, description: 'Option metadata, e.g. colour HEX' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateCategoryTypeDto {
  @ApiProperty({ example: 'PRODUCT_CATEGORY' })
  @IsString()
  @MaxLength(50)
  categoryType: string;

  @ApiPropertyOptional({ example: 'PRODUCT_CATEGORY' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  @Matches(CODE_PATTERN, { message: 'code must be UPPER_SNAKE_CASE (A-Z, 0-9, _)' })
  code?: string;
}
