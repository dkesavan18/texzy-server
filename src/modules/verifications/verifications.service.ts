import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Verification } from '../../database/entities';

@Injectable()
export class VerificationsService {
  constructor(
    @InjectRepository(Verification)
    private readonly verificationsRepository: Repository<Verification>,
  ) {}

  /** Read-only — verification rows are created/updated by an internal review process, not by users. */
  findByUserId(userId: string) {
    return this.verificationsRepository.findOne({ where: { userId } });
  }
}
