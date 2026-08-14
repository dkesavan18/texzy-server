import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class LogoutDto {
  @ApiPropertyOptional({
    description: 'If provided, only this session is revoked; otherwise all',
  })
  @IsOptional()
  @IsString()
  @MinLength(10)
  refreshToken?: string;
}
