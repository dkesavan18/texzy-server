import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Conversation,
  Deal,
  DealStatus,
  Need,
  NeedResponse,
  Product,
  Profile,
} from '../../database/entities';
import { NotificationsModule } from '../notifications/notifications.module';
import { DealsController } from './deals.controller';
import { DealsService } from './deals.service';

@Module({
  imports: [
    NotificationsModule,
    TypeOrmModule.forFeature([
      Deal,
      DealStatus,
      Conversation,
      Need,
      NeedResponse,
      Product,
      Profile,
    ]),
  ],
  controllers: [DealsController],
  providers: [DealsService],
  exports: [DealsService, TypeOrmModule],
})
export class DealsModule {}
