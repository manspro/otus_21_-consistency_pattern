import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { BillingService } from '../billing/billing.service';
import { RabbitMQService } from '../common/rabbitmq/rabbitmq.service';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    private billingService: BillingService,
    private rabbitMQService: RabbitMQService,
  ) {}

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
