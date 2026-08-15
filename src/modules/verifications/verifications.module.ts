import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Verification } from '../../database/entities';
import { VerificationsController } from './verifications.controller';
import { VerificationsService } from './verifications.service';

@Module({
  imports: [TypeOrmModule.forFeature([Verification])],
  controllers: [VerificationsController],
  providers: [VerificationsService],
  exports: [VerificationsService, TypeOrmModule],
})
export class VerificationsModule {}
