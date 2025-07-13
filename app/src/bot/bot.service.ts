import * as TelegramBot from 'node-telegram-bot-api';
import { ExtendedCallbackQuery, ExtendedMessage } from './types';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Message, MessageDirection, User } from '@kolya-quizlet/entity';
import { Repository } from 'typeorm';


@Injectable()
export class BotService extends TelegramBot{
    constructor(
        @InjectRepository(Message) private readonly messageRepo: Repository<Message>,
        @InjectRepository(User) private readonly userRepo: Repository<User>
    ){
        super(process.env.TELEGRAM_TOKEN!, {polling: true});
    }

    async answerCallbackQueryIfNotAnswered(query: ExtendedCallbackQuery, options: Partial<TelegramBot.AnswerCallbackQueryOptions>): ReturnType<TelegramBot['answerCallbackQuery']>{
        if (query.is_answered) return false;
        return await super.answerCallbackQuery(query.id, options);
    }

    async deleteMessageIfNotDeleted(message: ExtendedMessage): Promise<boolean> {
        if (message.is_deleted) return false;
        return await super.deleteMessage(message.chat.id, message.message_id);
    }

    async sendMessage(_user: TelegramBot.ChatId|User, text: string, options?: TelegramBot.SendMessageOptions): Promise<TelegramBot.Message> {
        let user: User;
        if (_user instanceof User){
            user = _user;
        } else {
            user = await this.userRepo.findOneOrFail({where: {telegram_id: +_user}, select: ['telegram_id', 'id']})
        }
        const message = await super.sendMessage(user.telegram_id, text, options);
        this.messageRepo.insert({
            telegram_id: String(message.message_id),
            user_id: user.id,
            content: {type: 'Message', message},
            direction: MessageDirection.OUT
        })
        return message;
    }
}
