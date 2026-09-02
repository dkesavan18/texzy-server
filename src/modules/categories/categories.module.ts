import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminRoleGuard } from '../../common/guards/admin-role.guard';
import { Category, CategoryType } from '../../database/entities';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

@Module({
  imports: [TypeOrmModule.forFeature([Category, CategoryType])],
  controllers: [CategoriesController],
  providers: [CategoriesService, AdminRoleGuard],
  exports: [CategoriesService, AdminRoleGuard],
})
export class CategoriesModule {}
