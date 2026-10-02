import { ApiPropertyOptional, ApiProperty, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAddressDto {
  @ApiProperty({ example: 'Priya Sharma' })
  @IsString()
  @MaxLength(120)
  fullName: string;

  @ApiProperty({ example: '9876543210' })
  @IsString()
  @MaxLength(20)
  phone: string;

  @ApiProperty({ example: '221B, Silk Weavers Colony' })
  @IsString()
  @MaxLength(200)
  addressLine1: string;

  @ApiPropertyOptional({ example: 'Near Big Temple' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine2?: string;

  @ApiProperty({ example: 'Kanchipuram' })
  @IsString()
  @MaxLength(100)
  city: string;

  @ApiProperty({ example: 'Tamil Nadu' })
  @IsString()
  @MaxLength(100)
  state: string;

  @ApiProperty({ example: '631502' })
  @IsString()
  @MaxLength(10)
  pincode: string;

  @ApiPropertyOptional({ example: 'India', default: 'India' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({ example: 'Home', default: 'Home' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  label?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateAddressDto extends PartialType(CreateAddressDto) {}
