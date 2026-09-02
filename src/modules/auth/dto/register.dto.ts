import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export enum RegisterAccountType {
  CUSTOMER = 'customer',
  BUSINESS = 'business',
}

export class RegisterDto {
  @ApiProperty({
    enum: RegisterAccountType,
    example: RegisterAccountType.CUSTOMER,
    description: 'Which type of account to create for this user',
  })
  @IsEnum(RegisterAccountType)
  accountType: RegisterAccountType;

  @ApiProperty({
    example: 'user@texzy.com',
    description: 'Email address or 10–15 digit mobile number',
  })
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @ApiProperty({ example: 'StrongPass123!', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({
    example: 'Texzy Textiles',
    description: 'Business name — required when accountType is "business"',
  })
  @ValidateIf(
    (dto: RegisterDto) => dto.accountType === RegisterAccountType.BUSINESS,
  )
  @IsString()
  @IsNotEmpty({
    message: 'displayName (business name) is required for business accounts',
  })
  displayName?: string;

  @ApiPropertyOptional({
    description:
      'Business type category id — from GET /categories?type=business_type',
  })
  @ValidateIf(
    (dto: RegisterDto) => dto.accountType === RegisterAccountType.BUSINESS,
  )
  @Type(() => Number)
  @IsNumber()
  businessTypeId?: number;

  @ApiPropertyOptional({
    description:
      'Business mode category id — from GET /categories?type=business_mode',
  })
  @ValidateIf(
    (dto: RegisterDto) => dto.accountType === RegisterAccountType.BUSINESS,
  )
  @Type(() => Number)
  @IsNumber()
  businessModeId?: number;

  @ApiPropertyOptional({
    description:
      'Business category ids — from GET /categories?type=business_category',
    type: [Number],
  })
  @ValidateIf(
    (dto: RegisterDto) => dto.accountType === RegisterAccountType.BUSINESS,
  )
  @IsArray()
  @ArrayMinSize(1)
  @Type(() => Number)
  @IsNumber({}, { each: true })
  businessCategoryIds?: number[];

  @ApiPropertyOptional({
    description: 'Short business description shown to buyers',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Business address or map location text',
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({
    description:
      'Cloudflare R2 public URL for the profile image (optional at signup; can be set later via uploads)',
  })
  @IsOptional()
  @IsString()
  @IsUrl({ require_protocol: true })
  profileUrl?: string;

  @ApiPropertyOptional({
    description:
      'Short-lived token from POST /auth/google when requiresBusinessRegistration is true',
  })
  @IsOptional()
  @IsString()
  googleRegistrationToken?: string;
}
