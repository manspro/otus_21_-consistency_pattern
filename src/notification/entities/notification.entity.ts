import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  email: string;

  @Column()
  type: string; // 'success' or 'failure'

  @Column()
  message: string;

  @Column({ nullable: true })
  orderId: string;

  @CreateDateColumn()
  createdAt: Date;
}
