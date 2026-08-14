import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Verification } from '../../database/entities';

@Module({
  imports: [TypeOrmModule.forFeature([Verification])],
  exports: [TypeOrmModule],
})
export class VerificationsModule {}
