import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageModule } from '../../common/storage/storage.module';
import {
  Product,
  ProductAttributeValue,
  ProductMedia,
  ProductPriceTier,
  ProductVariant,
  ProductVariantAttribute,
} from '../../database/entities';
import { CategoryInputsModule } from '../category-inputs/category-inputs.module';
import { ProductAttributesService } from './product-attributes.service';
import { ProductDraftCleanupService } from './product-draft-cleanup.service';
import { ProductVariantsService } from './product-variants.service';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [
    StorageModule,
    CategoryInputsModule,
    TypeOrmModule.forFeature([
      Product,
      ProductMedia,
      ProductVariant,
      ProductVariantAttribute,
      ProductAttributeValue,
      ProductPriceTier,
    ]),
  ],
  controllers: [ProductsController],
  providers: [
    ProductsService,
    ProductAttributesService,
    ProductVariantsService,
    ProductDraftCleanupService,
  ],
  exports: [ProductsService, TypeOrmModule],
})
export class ProductsModule {}
