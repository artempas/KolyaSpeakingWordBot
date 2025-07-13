import { CallbackQuery, Message } from 'node-telegram-bot-api';

export interface ExtendedCallbackQuery extends CallbackQuery{
    is_answered: boolean;
    message: ExtendedMessage
}

export interface ExtendedMessage extends Message{
    is_deleted: boolean;
}