import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ConversationsService } from './conversations.service';
import {
  CreateConversationDto,
  CreateConversationEventDto,
} from './dto/conversation.dto';

@ApiTags('conversations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  @ApiOperation({ summary: 'List my conversations' })
  findMine(@CurrentUser() user: AuthUser) {
    return this.conversationsService.findMine(user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get conversation by id' })
  findOne(@Param('id') id: string) {
    return this.conversationsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Start a conversation' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateConversationDto) {
    return this.conversationsService.create(user.userId, dto);
  }

  @Post(':id/events')
  @ApiOperation({ summary: 'Add conversation event/message' })
  addEvent(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateConversationEventDto,
  ) {
    return this.conversationsService.addEvent(user.userId, id, dto);
  }
}
