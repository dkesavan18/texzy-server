import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ description: 'Business / display name shown across the app' })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  about?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Cloudflare R2 public URL for the profile / logo image',
  })
  @IsOptional()
  @IsString()
  @IsUrl({ require_protocol: true })
  profileUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coverImage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({
    description: 'Preferred display currency code (e.g. INR, USD, EUR)',
    example: 'INR',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  preferredCurrency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiPropertyOptional({
    description: 'Business type category id — from GET /categories?type=business_type',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  businessTypeId?: number;

  @ApiPropertyOptional({
    description: 'Business mode category id — from GET /categories?type=business_mode',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  businessModeId?: number;

  @ApiPropertyOptional({
    description:
      'Business category ids — from GET /categories?type=business_category',
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsNumber({}, { each: true })
  businessCategoryIds?: number[];

  @ApiPropertyOptional({ description: 'Business address or map location text' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'WhatsApp number or wa.me / chat link' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  whatsappUrl?: string;

  @ApiPropertyOptional({ description: 'Instagram profile URL or handle' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  instagramUrl?: string;

  @ApiPropertyOptional({ description: 'Facebook page URL' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  facebookUrl?: string;

  @ApiPropertyOptional({ description: 'Business website URL' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  websiteUrl?: string;

  @ApiPropertyOptional({ description: 'Optional custom website icon image URL' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  websiteLogo?: string;

  @ApiPropertyOptional({
    description: 'Service tags shown on the profile (e.g. Fast Delivery)',
    type: [String],
    example: ['Fast Delivery', 'Bulk order Welcome'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  tags?: string[];
}
