import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification, NotificationToken, User } from '../../database/entities';
import { CategoriesModule } from '../categories/categories.module';
import { FirebasePushService } from './firebase-push.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, NotificationToken, User]),
    CategoriesModule, // provides AdminRoleGuard (admin/textile broadcast endpoint)
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, FirebasePushService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
