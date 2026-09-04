import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  CreateNeedDto,
  CreateNeedResponseDto,
  UpdateNeedDto,
} from './dto/need.dto';
import { NeedsService } from './needs.service';

@ApiTags('needs')
@Controller('needs')
export class NeedsController {
  constructor(private readonly needsService: NeedsService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Public market requests — open needs. When authenticated, excludes the caller\'s own.',
  })
  @ApiQuery({ name: 'take', required: false })
  findPublic(
    @CurrentUser() user: AuthUser | undefined,
    @Query('take') take?: string,
  ) {
    const limit = take ? Math.min(Number(take) || 50, 100) : 50;
    return this.needsService.findPublic(limit, user?.userId);
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List the current user's own requests" })
  findMine(@CurrentUser() user: AuthUser) {
    return this.needsService.findMine(user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a request with responses and media' })
  findOne(@Param('id') id: string) {
    return this.needsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Create a request. Upload images afterwards via POST /uploads with entityType=need.',
  })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateNeedDto) {
    return this.needsService.create(user.userId, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update own request' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateNeedDto,
  ) {
    return this.needsService.update(user.userId, id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft-delete / cancel own request' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.needsService.remove(user.userId, id);
  }

  @Get(':id/responses')
  @ApiOperation({ summary: 'List responses for a request' })
  listResponses(@Param('id') id: string) {
    return this.needsService.listResponses(id);
  }

  @Post(':id/responses')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Respond to a public request. Upload images via POST /uploads with entityType=need-response.',
  })
  createResponse(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateNeedResponseDto,
  ) {
    return this.needsService.createResponse(user.userId, id, dto);
  }

  @Post(':id/responses/:responseId/accept')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Request owner accepts a response and closes the need' })
  acceptResponse(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('responseId') responseId: string,
  ) {
    return this.needsService.acceptResponse(user.userId, id, responseId);
  }
}
