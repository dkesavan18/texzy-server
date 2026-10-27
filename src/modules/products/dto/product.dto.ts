import {
  ApiProperty,
  ApiPropertyOptional,
  PartialType,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsNumber, IsObject, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { TextileAttributesDto } from './textile-attributes.dto';
import { ProductPriceTierDto, ProductVariantDto } from './product-variant.dto';

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

  @ApiPropertyOptional({
    description:
      'FK to categories.category_id — must be a product type (child of a PRODUCT_CATEGORY group)',
  })
  @IsOptional()
  @IsNumber()
  productCategoryId?: number;

  @ApiPropertyOptional({ description: 'Deprecated — the product type now carries the taxonomy' })
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

  @ApiPropertyOptional({
    description:
      'Dynamic inputs configured for the product type (GET /category-inputs/config). input_key -> value; ' +
      'null clears a value. Selects use category ids, multi-selects an id array, measurements {value, unit}.',
    example: { primary_material: '231', zari_work_present: true, saree_length: { value: 5.5, unit: 'm' } },
  })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>;

  @ApiPropertyOptional({ type: [ProductPriceTierDto], description: 'Bulk / wholesale price breaks' })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ProductPriceTierDto)
  priceTiers?: ProductPriceTierDto[];

  @ApiPropertyOptional({ type: [ProductVariantDto] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ProductVariantDto)
  variants?: ProductVariantDto[];
}

export class UpdateProductDto extends PartialType(CreateProductDto) {}
