import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserDevice } from '../../database/entities';

@Module({
  imports: [TypeOrmModule.forFeature([UserDevice])],
  exports: [TypeOrmModule],
})
export class DevicesModule {}
