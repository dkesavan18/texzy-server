import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageModule } from '../../common/storage/storage.module';
import {
  Collection,
  Need,
  NeedMedia,
  NeedResponse,
  OrderItem,
  Product,
  ProductMedia,
  Profile,
  ResponseMedia,
} from '../../database/entities';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

@Module({
  imports: [
    StorageModule,
    TypeOrmModule.forFeature([
      Product,
      ProductMedia,
      Need,
      NeedMedia,
      NeedResponse,
      ResponseMedia,
      Collection,
      Profile,
      OrderItem,
    ]),
  ],
  controllers: [UploadsController],
  providers: [UploadsService],
  exports: [UploadsService],
})
export class UploadsModule {}
