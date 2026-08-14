import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class GoogleAuthDto {
  @ApiProperty({
    description: 'Google ID token from React Native Google Sign-In',
    example: '<GOOGLE_ID_TOKEN>',
  })
  @IsString()
  @MinLength(20)
  idToken: string;
}
