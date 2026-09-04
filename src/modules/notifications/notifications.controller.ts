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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { AdminRoleGuard } from '../../common/guards/admin-role.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  NOTIFICATION_REFERENCE_TYPE,
  NOTIFICATION_TYPE,
  type NotificationSectionValue,
} from './constants/notification-type.constant';
import {
  AdminBroadcastDto,
  ListNotificationsQueryDto,
  RegisterTokenDto,
} from './dto/notification.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({
    summary: 'List my Inbox notifications (paginated, optional section filter)',
  })
  findMine(
    @CurrentUser() user: AuthUser,
    @Query() query: ListNotificationsQueryDto,
  ) {
    return this.notificationsService.findMine(
      user.userId,
      query.section as NotificationSectionValue | undefined,
      query.take ? Number(query.take) : undefined,
      query.skip ? Number(query.skip) : undefined,
    );
  }

  @Get('unread-count')
  @ApiOperation({
    summary: 'Unread Inbox notification count (for the nav badge)',
  })
  unreadCount(@CurrentUser() user: AuthUser) {
    return this.notificationsService.unreadCount(user.userId);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all my notifications as read' })
  markAllRead(@CurrentUser() user: AuthUser) {
    return this.notificationsService.markAllRead(user.userId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark one notification as read' })
  markRead(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.notificationsService.markRead(user.userId, id);
  }

  @Post('tokens')
  @ApiOperation({ summary: 'Register/refresh my FCM web-push token' })
  registerToken(@CurrentUser() user: AuthUser, @Body() dto: RegisterTokenDto) {
    return this.notificationsService.registerToken(
      user.userId,
      dto.token,
      dto.platform,
    );
  }

  @Delete('tokens/:token')
  @ApiOperation({ summary: 'Unregister an FCM token (e.g. on logout)' })
  removeToken(@CurrentUser() user: AuthUser, @Param('token') token: string) {
    return this.notificationsService.removeToken(user.userId, token);
  }

  @Post('admin/broadcast')
  @UseGuards(AdminRoleGuard)
  @ApiOperation({
    summary:
      'Admin-only: send a new textile/product notification to a chosen audience',
  })
  async adminBroadcast(
    @CurrentUser() user: AuthUser,
    @Body() dto: AdminBroadcastDto,
  ) {
    const recipients = await this.notificationsService.resolveAudience(
      dto.audience ?? 'all',
      dto.userIds,
    );

    const referenceId = dto.productId ?? dto.categoryId ?? null;
    const referenceType = dto.productId
      ? NOTIFICATION_REFERENCE_TYPE.PRODUCT
      : dto.categoryId
        ? NOTIFICATION_REFERENCE_TYPE.CATEGORY
        : null;
    const link = dto.productId
      ? `/products/${dto.productId}`
      : dto.categoryId
        ? `/products?categories=${dto.categoryId}`
        : '/inbox';

    await this.notificationsService.notifyMany(
      recipients
        .filter((id) => id !== user.userId)
        .map((userId) => ({
          userId,
          type: NOTIFICATION_TYPE.ADMIN_TEXTILE_NOTIFICATION,
          title: dto.title,
          message: dto.message,
          referenceId,
          referenceType,
          data: { link },
        })),
    );

    return { success: true, recipientCount: recipients.length };
  }
}
