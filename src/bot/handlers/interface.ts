import { User } from '@prisma/client';
import { Message } from 'node-telegram-bot-api';
import { ExtendedCallbackQuery } from '../types';

export interface HandlerInterface {
    handleMessage(message: Message, user: User): Promise<boolean>
    handleQuery(message: ExtendedCallbackQuery, user: User): Promise<boolean>
}