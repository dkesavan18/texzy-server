import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

/**
 * Textile-specific attributes that vary by category — stored as a single JSONB blob
 * on `products.textile_attributes` instead of one column per attribute.
 */
export class TextileAttributesDto {
  @ApiPropertyOptional({ example: 'Silk' })
  @IsOptional()
  @IsString()
  materialType?: string;

  @ApiPropertyOptional({ example: 'Kanchipuram Silk' })
  @IsOptional()
  @IsString()
  fabricType?: string;

  @ApiPropertyOptional({ example: 'Maroon' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ example: 'Zari border' })
  @IsOptional()
  @IsString()
  pattern?: string;

  @ApiPropertyOptional({ example: 'Traditional temple design' })
  @IsOptional()
  @IsString()
  design?: string;

  @ApiPropertyOptional({ example: 'Free size' })
  @IsOptional()
  @IsString()
  size?: string;

  @ApiPropertyOptional({ description: 'Length in meters', example: 6.3 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  length?: number;

  @ApiPropertyOptional({ description: 'Width in inches', example: 45 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  width?: number;

  @ApiPropertyOptional({ description: 'Weight in grams', example: 500 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  @ApiPropertyOptional({ example: 'Handloom' })
  @IsOptional()
  @IsString()
  weavingType?: string;

  @ApiPropertyOptional({ example: 'Zari work' })
  @IsOptional()
  @IsString()
  workType?: string;

  @ApiPropertyOptional({ example: 'Temple border' })
  @IsOptional()
  @IsString()
  borderType?: string;

  @ApiPropertyOptional({ example: 'Stitched' })
  @IsOptional()
  @IsString()
  blouseType?: string;

  @ApiPropertyOptional({
    description: 'Freeform key/value attributes not covered by the fields above',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  otherAttributes?: Record<string, unknown>;
}
