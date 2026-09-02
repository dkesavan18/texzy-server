import {
  ApiProperty,
  ApiPropertyOptional,
  PartialType,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsNumber, IsObject, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { TextileAttributesDto } from './textile-attributes.dto';
import { ProductVariantDto } from './product-variant.dto';

const PRICE_TYPES = ['fixed', 'negotiable', 'per_unit'] as const;

export class CreateProductDto {
  @ApiProperty()
  @IsString()
  productName: string;

  @ApiPropertyOptional({ description: 'Short one-line summary for listing cards' })
  @IsOptional()
  @IsString()
  shortDescription?: string;

  @ApiPropertyOptional({ description: 'Full product description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'FK to categories.category_id' })
  @IsOptional()
  @IsNumber()
  productCategoryId?: number;

  @ApiPropertyOptional({ description: 'FK to categories.category_id (product_sub_category type)' })
  @IsOptional()
  @IsNumber()
  productSubcategoryId?: number;

  @ApiPropertyOptional({ type: TextileAttributesDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => TextileAttributesDto)
  textileAttributes?: TextileAttributesDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ description: 'Original/MRP price used to derive discountPercentage' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  compareAtPrice?: number;

  @ApiPropertyOptional({ enum: PRICE_TYPES })
  @IsOptional()
  @IsIn(PRICE_TYPES)
  priceType?: string;

  @ApiPropertyOptional({ example: 'meter', description: 'e.g. piece, meter, kg, set' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ description: 'Stock on hand' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderQuantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowBulkOrder?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isCustomerSale?: boolean;

  @ApiPropertyOptional({ type: [ProductVariantDto] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ProductVariantDto)
  variants?: ProductVariantDto[];
}

export class UpdateProductDto extends PartialType(CreateProductDto) {}
