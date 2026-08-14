import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
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
  @ValidateIf((dto: RegisterDto) => dto.accountType === RegisterAccountType.BUSINESS)
  @IsString()
  @IsNotEmpty({ message: 'displayName (business name) is required for business accounts' })
  displayName?: string;

  @ApiPropertyOptional({
    description: 'Category id for the business type, from GET /categories?type=business',
  })
  @IsOptional()
  @IsNumber()
  businessTypeId?: number;

  @ApiPropertyOptional({
    description:
      'Short-lived token from POST /auth/google when requiresBusinessRegistration is true',
  })
  @IsOptional()
  @IsString()
  googleRegistrationToken?: string;
}
