import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ConfirmUploadDto } from './dto/confirm-upload.dto';
import { DeleteSingleMediaQueryDto } from './dto/delete-single-media.dto';
import { MediaEntityTypeQueryDto } from './dto/media-entity-type-query.dto';
import { RequestUploadDto } from './dto/request-upload.dto';
import { UploadObjectDto } from './dto/upload-object.dto';
import { UpdateMediaDto } from './dto/update-media.dto';
import { UploadsService, type UploadedFilePayload } from './uploads.service';

@ApiTags('uploads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('presign')
  @ApiOperation({
    summary: 'Get a presigned R2 upload URL for a new image',
  })
  requestUpload(@CurrentUser() user: AuthUser, @Body() dto: RequestUploadDto) {
    return this.uploadsService.requestUpload(user, dto);
  }

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload image bytes through the API (use when direct R2 PUT fails CORS)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'storageKey', 'entityType'],
      properties: {
        file: { type: 'string', format: 'binary' },
        storageKey: { type: 'string' },
        entityType: { type: 'string' },
        entityId: { type: 'string' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      // multipart still leaves `file` on req.body; it is handled by @UploadedFile()
      forbidNonWhitelisted: false,
    }),
  )
  uploadObject(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: UploadedFilePayload | undefined,
    @Body() dto: UploadObjectDto,
  ) {
    if (!file) {
      throw new BadRequestException('file is required');
    }
    return this.uploadsService.uploadObject(user, dto, file);
  }

  @Post('confirm')
  @ApiOperation({
    summary:
      'Confirm a direct-to-R2 upload, generate thumbnail (junction types), and persist to the database',
  })
  confirmUpload(@CurrentUser() user: AuthUser, @Body() dto: ConfirmUploadDto) {
    return this.uploadsService.confirmUpload(user, dto);
  }

  @Patch('media/:mediaId')
  @ApiOperation({
    summary: 'Reorder or set-primary on a product/need/need-response image',
  })
  updateMedia(
    @CurrentUser() user: AuthUser,
    @Param('mediaId') mediaId: string,
    @Query() query: MediaEntityTypeQueryDto,
    @Body() dto: UpdateMediaDto,
  ) {
    return this.uploadsService.updateMedia(
      user,
      mediaId,
      query.entityType,
      dto,
    );
  }

  @Delete('media/:mediaId')
  @ApiOperation({
    summary: 'Delete a product/need/need-response image (R2 + database row)',
  })
  deleteMedia(
    @CurrentUser() user: AuthUser,
    @Param('mediaId') mediaId: string,
    @Query() query: MediaEntityTypeQueryDto,
  ) {
    return this.uploadsService.deleteMedia(user, mediaId, query.entityType);
  }

  @Delete('single')
  @ApiOperation({
    summary:
      'Delete a profile logo/cover or collection cover image (R2 + column reset)',
  })
  deleteSingle(
    @CurrentUser() user: AuthUser,
    @Query() query: DeleteSingleMediaQueryDto,
  ) {
    return this.uploadsService.deleteSingle(
      user,
      query.entityType,
      query.entityId,
    );
  }
}
