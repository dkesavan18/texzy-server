import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageModule } from '../../common/storage/storage.module';
import { Product, ProductMedia, ProductVariant } from '../../database/entities';
import { ProductDraftCleanupService } from './product-draft-cleanup.service';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [
    StorageModule,
    TypeOrmModule.forFeature([Product, ProductMedia, ProductVariant]),
  ],
  controllers: [ProductsController],
  providers: [ProductsService, ProductDraftCleanupService],
  exports: [ProductsService, TypeOrmModule],
})
export class ProductsModule {}
