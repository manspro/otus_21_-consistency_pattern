import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IdempotencyRecord } from '../entities/idempotency-record.entity';

@Injectable()
export class IdempotencyService {
  constructor(
    @InjectRepository(IdempotencyRecord)
    private idempotencyRepository: Repository<IdempotencyRecord>,
  ) {}

  async findByKey(key: string): Promise<IdempotencyRecord | null> {
    const record = await this.idempotencyRepository.findOne({
      where: { idempotencyKey: key },
    });

    if (record && record.expiresAt < new Date()) {
      await this.idempotencyRepository.delete({ idempotencyKey: key });
      return null;
    }

    return record;
  }

  async saveRecord(
    key: string,
    orderId: string,
    response: any,
    statusCode: number,
    ttlHours: number = 24,
  ): Promise<IdempotencyRecord> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + ttlHours);

    const record = this.idempotencyRepository.create({
      idempotencyKey: key,
      orderId,
      response,
      statusCode,
      expiresAt,
    });

    return this.idempotencyRepository.save(record);
  }
}
