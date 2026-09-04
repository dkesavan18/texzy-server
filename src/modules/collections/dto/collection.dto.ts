import { PartialType } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateCollectionDto {
  @IsNumber()
  collectionCategoryId: number;

  @IsOptional()
  @IsString()
  collectionTitle?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  productId?: string[];

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsBoolean()
  isAdvertisement?: boolean;

  @IsOptional()
  @IsString()
  coverImageUrl?: string;
}

export class UpdateCollectionDto extends PartialType(CreateCollectionDto) {}
