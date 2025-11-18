import { Controller, Post, Get, Body, Param, ValidationPipe, HttpStatus, HttpCode, Res, BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { IdempotencyKey } from './decorators/idempotency-key.decorator';

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createOrder(
    @Body(ValidationPipe) createOrderDto: CreateOrderDto,
    @IdempotencyKey() idempotencyKey: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException('Idempotency-Key header is required');
    }

    const result = await this.orderService.createOrderIdempotent(
      createOrderDto,
      idempotencyKey,
    );

    res.status(result.statusCode);

    // информиурем клиент о том, что ответ из кеша
    if (result.fromCache) {
      res.setHeader('X-Idempotency-Cached', 'true');
    }

    return result.order;
  }

  @Get(':id')
  async getOrder(@Param('id') id: string) {
    return this.orderService.getOrder(id);
  }

  @Get('user/:userId')
  async getUserOrders(@Param('userId') userId: string) {
    return this.orderService.getUserOrders(userId);
  }
}
