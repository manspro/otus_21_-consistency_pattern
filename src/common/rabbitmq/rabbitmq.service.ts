import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as amqp from 'amqp-connection-manager';
import { ChannelWrapper } from 'amqp-connection-manager';
import { Channel } from 'amqplib';

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private connection: amqp.AmqpConnectionManager;
  private channelWrapper: ChannelWrapper;
  private readonly url: string;
  private readonly exchange = 'orders_exchange';

  constructor() {
    this.url = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
  }

  async onModuleInit() {
    this.connection = amqp.connect([this.url]);
    
    this.channelWrapper = this.connection.createChannel({
      json: true,
      setup: async (channel: Channel) => {
        await channel.assertExchange(this.exchange, 'topic', { durable: true });
      },
    });

    await this.channelWrapper.waitForConnect();
  }

  async onModuleDestroy() {
    await this.channelWrapper.close();
    await this.connection.close();
  }

  async publish(routingKey: string, message: any) {
    await this.channelWrapper.publish(
      this.exchange,
      routingKey,
      message,
      { persistent: true }
    );
  }

  async subscribe(queue: string, routingKeys: string[], handler: (msg: any) => Promise<void>) {
    await this.channelWrapper.addSetup(async (channel: Channel) => {
      await channel.assertQueue(queue, { durable: true });
      
      for (const routingKey of routingKeys) {
        await channel.bindQueue(queue, this.exchange, routingKey);
      }

      await channel.consume(queue, async (msg) => {
        if (msg) {
          try {
            const content = JSON.parse(msg.content.toString());
            await handler(content);
            channel.ack(msg);
          } catch (error) {
            console.error('Error processing message:', error);
            channel.nack(msg, false, false);
          }
        }
      });
    });
  }
}
