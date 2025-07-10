import { Injectable } from '@nestjs/common';
import { CallbackQuery, Message } from 'node-telegram-bot-api';
import { HandlerInterface } from '../interface';
import { User } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { BotService } from 'src/bot/bot.service';


@Injectable()
export class VocabularyHandler implements HandlerInterface{

    private readonly OPTIONS = [
        'Добавить слова ➕',
        'Удалить слова 🗑️',
        'Назад 🔙'
    ] as const;

    constructor(
        private readonly bot: BotService,
        private readonly prisma: PrismaService
    ){}

    async handleQuery(query: CallbackQuery, user: User): Promise<boolean> {
        switch (query.data as typeof this.OPTIONS[number]){
        case 'Добавить слова ➕':
            user.position.push('ADD_WORD');
            return true;
        case 'Удалить слова 🗑️':
            user.position.push('REMOVE_WORD');
            return true;
        case 'Назад 🔙':
            user.position.pop();
            delete user.context.VOCABULARY;
            return true;
        default:
            delete user.context.VOCABULARY;
            this.sendMenu(user);
        }
    }

    async handleMessage(message: Message, user: User): Promise<boolean> {
        await this.sendMenu(user);
        return false;
    }

    private async sendMenu(user: User): Promise<Message>{
        const word_cnt = await this.prisma.word.count({where: {user_id: user.id}});
        return await this.bot.sendMessage(user.telegram_id, `В вашем словаре ${word_cnt} слов`, {
            reply_markup: {
                inline_keyboard:
                    this.OPTIONS.map(text => ([{text, callback_data: text}]))
                ,
            }
        });
    }
}