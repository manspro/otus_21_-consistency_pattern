import { Injectable, HttpException, HttpStatus, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { BillingService } from '../billing/billing.service';
import { RabbitMQService } from '../common/rabbitmq/rabbitmq.service';
import { IdempotencyService } from './services/idempotency.service';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    private billingService: BillingService,
    private rabbitMQService: RabbitMQService,
    private idempotencyService: IdempotencyService,
  ) {}

  async createOrderIdempotent(
    createOrderDto: CreateOrderDto,
    idempotencyKey?: string,
  ): Promise<{ order: Order; statusCode: number; fromCache: boolean }> {
    // если передан ключ идемпотентности, проверяем кеш
    if (idempotencyKey) {
      const cachedRecord = await this.idempotencyService.findByKey(idempotencyKey);
      
      if (cachedRecord) {
        const order = await this.orderRepository.findOne({
          where: { id: cachedRecord.orderId },
        });
        
        if (order) {
          return {
            order,
            statusCode: cachedRecord.statusCode,
            fromCache: true,
          };
        }
      }
    }

    try {
      const order = await this.createOrder(createOrderDto);
      
      if (idempotencyKey) {
        await this.idempotencyService.saveRecord(
          idempotencyKey,
          order.id,
          order,
          201,
        );
      }

      return {
        order,
        statusCode: 201,
        fromCache: false,
      };
    } catch (error) {
      // сохраняем ошибку в кеш идемпотентности
      if (idempotencyKey && error instanceof HttpException) {
        const response = error.getResponse();
        await this.idempotencyService.saveRecord(
          idempotencyKey,
          (response as any).orderId || '',
          response,
          error.getStatus(),
        );
      }
      throw error;
    }
  }

  async createOrder(createOrderDto: CreateOrderDto): Promise<Order> {
    const order = this.orderRepository.create({
      userId: createOrderDto.userId,
      price: createOrderDto.price,
      status: 'pending',
    });
    await this.orderRepository.save(order);

    try {
      const withdrawResult = await this.billingService.withdraw({
        userId: createOrderDto.userId,
        amount: createOrderDto.price,
      });

      if (withdrawResult.success) {
        order.status = 'completed';
        await this.orderRepository.save(order);

        await this.rabbitMQService.publish('order.completed', {
          type: 'order.completed',
          orderId: order.id,
          userId: createOrderDto.userId,
          email: createOrderDto.email,
          amount: createOrderDto.price,
          timestamp: new Date().toISOString(),
        });

        return order;
      } else {
        order.status = 'failed';
        await this.orderRepository.save(order);

        await this.rabbitMQService.publish('order.failed', {
          type: 'order.failed',
          orderId: order.id,
          userId: createOrderDto.userId,
          email: createOrderDto.email,
          amount: createOrderDto.price,
          reason: withdrawResult.message,
          timestamp: new Date().toISOString(),
        });

        throw new HttpException(
          {
            statusCode: HttpStatus.BAD_REQUEST,
            message: 'Insufficient funds',
            orderId: order.id,
            status: 'failed',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      
      order.status = 'failed';
      await this.orderRepository.save(order);
      throw error;
    }
  }

  async getOrder(id: string): Promise<Order | null> {
    return this.orderRepository.findOne({ where: { id } });
  }

  async getUserOrders(userId: string): Promise<Order[]> {
    return this.orderRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }
}
