import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, BaseEntity } from 'typeorm';
import { User } from './User';
import { CallbackQuery, Message as TelegramMessage } from 'node-telegram-bot-api';

export enum MessageDirection {
  IN = 'in',
  OUT = 'out'
}

@Entity()
export class Message extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  telegram_id: string;

  @Column()
  user_id: number;

  @ManyToOne(() => User, user => user.messages, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({referencedColumnName: 'id', name: 'user_id'})
  user: User;

  @Column({enum: MessageDirection, type: 'enum'})
  direction: MessageDirection;

  @Column('json')
  content: ({type: 'Message'} & TelegramMessage) | ({type: 'CallbackQuery'} & CallbackQuery);

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;
}
