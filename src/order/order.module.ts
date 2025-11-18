import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { Order } from './entities/order.entity';
import { IdempotencyRecord } from './entities/idempotency-record.entity';
import { IdempotencyService } from './services/idempotency.service';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, IdempotencyRecord]),
    BillingModule,
  ],
  controllers: [OrderController],
  providers: [OrderService, IdempotencyService],
})
export class OrderModule {}
