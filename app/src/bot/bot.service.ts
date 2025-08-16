import TelegramBot from 'node-telegram-bot-api';
import { ExtendedCallbackQuery, ExtendedMessage } from './types';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Message, MessageDirection, User } from '@kolya-quizlet/entity';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';


@Injectable()
export class BotService extends TelegramBot{

    webhookSecret: string;


    constructor(
        @InjectRepository(Message) private readonly messageRepo: Repository<Message>,
        @InjectRepository(User) private readonly userRepo: Repository<User>
    ){
        const token = process.env.TELEGRAM_TOKEN;
        if (!token) throw new Error('Token is not defined');

        super(token, {polling: !process.env.BASE_URL});

        this.webhookSecret = createHash('sha256').update(token).digest('hex').slice(0, 32);

        if (process.env.BASE_URL){
            // Use a hashed token for the webhook path to avoid exposing the full token
            this.setWebHook(`${process.env.BASE_URL}/bot/${this.webhookSecret}`)
                .then(() => console.log(`Webhook is set to ${process.env.BASE_URL}/bot/${this.webhookSecret}`))
                .catch((err) => console.error('Failed to set webhook:', err));
        }
    }

    async answerCallbackQueryIfNotAnswered(query: ExtendedCallbackQuery, options: Partial<TelegramBot.AnswerCallbackQueryOptions>): ReturnType<TelegramBot['answerCallbackQuery']>{
        if (query.is_answered) return false;
        try {
            return await super.answerCallbackQuery(query.id, options);
        } catch (error) {
            console.error('Failed to answer callback query:', error);
            return false;
        }
    }

    async deleteMessageIfNotDeleted(message: ExtendedMessage): Promise<boolean> {
        if (message.is_deleted) return false;
        if (await super.deleteMessage(message.chat.id, message.message_id)){
            message.is_deleted = true;
            return true;
        } else return false;
    }

    async sendMessage(_user: TelegramBot.ChatId|User, text: string, options?: TelegramBot.SendMessageOptions): Promise<TelegramBot.Message> {
        let user: User;
        if (_user instanceof User){
            user = _user;
        } else {
            user = await this.userRepo.findOneOrFail({where: {telegram_id: +_user}, select: ['telegram_id', 'id']});
        }
        const message = await super.sendMessage(user.telegram_id, text, options);
        this.messageRepo.insert({
            telegram_id: String(message.message_id),
            user_id: user.id,
            content: {type: 'Message', message},
            direction: MessageDirection.OUT
        });
        return message;
    }
}
