import * as TelegramBot from 'node-telegram-bot-api';
import { ExtendedCallbackQuery, ExtendedMessage } from './types';
import { Injectable } from '@nestjs/common';


@Injectable()
export class BotService extends TelegramBot{
    constructor(){
        super(process.env.TELEGRAM_TOKEN, {polling: true});
    }

    async answerCallbackQueryIfNotAnswered(query: ExtendedCallbackQuery, options: Partial<TelegramBot.AnswerCallbackQueryOptions>): ReturnType<TelegramBot['answerCallbackQuery']>{
        if (query.is_answered) return false;
        return await super.answerCallbackQuery(query.id, options);
    }

    async deleteMessageIfNotDeleted(message: ExtendedMessage): Promise<boolean> {
        if (message.is_deleted) return false;
        return await super.deleteMessage(message.chat.id, message.message_id);
    }
}
