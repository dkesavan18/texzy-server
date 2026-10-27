import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Category,
  CategoryInputMapping,
  CategoryType,
} from '../../database/entities';
import { CategoriesModule } from '../categories/categories.module';
import { CategoryInputsController } from './category-inputs.controller';
import { CategoryInputsService } from './category-inputs.service';

@Module({
  imports: [
    CategoriesModule,
    TypeOrmModule.forFeature([CategoryInputMapping, Category, CategoryType]),
  ],
  controllers: [CategoryInputsController],
  providers: [CategoryInputsService],
  exports: [CategoryInputsService],
})
export class CategoryInputsModule {}
