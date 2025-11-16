import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { RabbitMQService } from '../common/rabbitmq/rabbitmq.service';

@Injectable()
export class NotificationService implements OnModuleInit {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    private rabbitMQService: RabbitMQService,
  ) {}

  async onModuleInit() {
    await this.rabbitMQService.subscribe(
      'notification_queue',
      ['order.completed', 'order.failed'],
      this.handleOrderEvent.bind(this),
    );
  }

  private async handleOrderEvent(event: any) {
    const { type, userId, email, orderId, amount } = event;

    let message: string = '';
    let notificationType: string = '';

    if (type === 'order.completed') {
      message = `Ваш заказ #${orderId} успешно оформлен! Списано ${amount} руб.`;
      notificationType = 'success';
    } else if (type === 'order.failed') {
      message = `Не удалось оформить заказ #${orderId}. Недостаточно средств.`;
      notificationType = 'failure';
    }

    if (message && notificationType) {
      await this.createNotification({
        userId,
        email,
        type: notificationType,
        message,
        orderId,
      });
    }
  }

  async createNotification(data: {
    userId: string;
    email: string;
    type: string;
    message: string;
    orderId?: string;
  }): Promise<Notification> {
    const notification = this.notificationRepository.create(data);
    return this.notificationRepository.save(notification);
  }

  async getNotifications(userId: string): Promise<Notification[]> {
    return this.notificationRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }
}
