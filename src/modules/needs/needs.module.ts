import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Need,
  NeedMedia,
  NeedResponse,
  NeedTag,
  NeedTagsMapping,
  Profile,
  ResponseMedia,
} from '../../database/entities';
import { NotificationsModule } from '../notifications/notifications.module';
import { NeedsController } from './needs.controller';
import { NeedsService } from './needs.service';

@Module({
  imports: [
    NotificationsModule,
    TypeOrmModule.forFeature([
      Need,
      NeedMedia,
      NeedResponse,
      ResponseMedia,
      NeedTag,
      NeedTagsMapping,
      Profile,
    ]),
  ],
  controllers: [NeedsController],
  providers: [NeedsService],
  exports: [NeedsService, TypeOrmModule],
})
export class NeedsModule {}
