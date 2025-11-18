import { Entity, Column, PrimaryColumn, CreateDateColumn } from 'typeorm';

@Entity('idempotency_records')
export class IdempotencyRecord {
  @PrimaryColumn()
  idempotencyKey: string;

  @Column()
  orderId: string;

  @Column({ type: 'json' })
  response: any;

  @Column()
  statusCode: number;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp' })
  expiresAt: Date;
}
