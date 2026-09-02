import { ApiProperty } from '@nestjs/swagger';

export class ApiResponseDto<T = unknown> {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ nullable: true, example: null })
  error: string | string[] | null;

  @ApiProperty({ nullable: true })
  data: T | null;
}
