import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class ProductVariantDto {
  @ApiPropertyOptional({ description: 'Existing variant id — omit when creating new rows' })
  @IsOptional()
  @IsString()
  productVariantId?: string;

  @ApiProperty({ example: 'Rani Pink_E0218A / Gold Zari / Matching Blouse' })
  @IsString()
  @MaxLength(255)
  variantName: string;

  @ApiPropertyOptional({ example: 'KSS-RP-GZ-MB', description: 'Variant SKU, unique within the product' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sku?: string;

  @ApiPropertyOptional({
    description:
      'Selected values of the variant attributes: input_key -> option id (selects) or typed value',
    example: { primary_colour: '221', zari_type: '305' },
  })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, string | number>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ description: 'Original/MRP price for this variant' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  compareAtPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @ApiPropertyOptional({ description: 'Minimum order quantity for this variant' })
  @IsOptional()
  @IsInt()
  @Min(1)
  moq?: number;

  @ApiPropertyOptional({ description: 'Package weight in grams' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  barcode?: string;

  @ApiPropertyOptional({ description: 'Seller switch — disabled variants cannot be bought' })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional({ type: [String], description: 'product_media_id values for this variant' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mediaIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  displayOrder?: number;
}

export class ProductPriceTierDto {
  @ApiPropertyOptional({ description: 'Tier applies to this variant only; omit for the whole product' })
  @IsOptional()
  @IsString()
  productVariantId?: string;

  @ApiProperty({ example: 10 })
  @IsInt()
  @Min(1)
  minQuantity: number;

  @ApiPropertyOptional({ example: 49 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxQuantity?: number;

  @ApiProperty({ example: 1450 })
  @IsNumber()
  @Min(0)
  price: number;
}
