import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateAdminDto {
  @ApiProperty({
    example: 'admin@texzy.com',
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
    example: 'Texzy Admin',
    description: 'Optional display name for the admin profile',
  })
  @IsOptional()
  @IsString()
  displayName?: string;
}
