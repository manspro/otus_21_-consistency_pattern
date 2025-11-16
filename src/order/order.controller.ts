import { Controller, Post, Get, Body, Param, ValidationPipe } from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  async createOrder(@Body(ValidationPipe) createOrderDto: CreateOrderDto) {
    return this.orderService.createOrder(createOrderDto);
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
