import { Injectable } from '@nestjs/common';
import { CallbackQuery, Message as TelegramMessage } from 'node-telegram-bot-api';
import { HandlerInterface } from '../interface';
import { BotService } from 'src/bot/bot.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExtendedMessage } from 'src/bot/types';
import { Position, User, Word } from '@kolya-quizlet/entity';


@Injectable()
export class VocabularyHandler implements HandlerInterface{

    private readonly OPTIONS = [
        'Добавить слова ➕',
        'Удалить слова 🗑️',
        'Назад 🔙'
    ] as const;

    constructor(
        private readonly bot: BotService,
        @InjectRepository(Word) private readonly wordRepo: Repository<Word>
    ){}

    async handleQuery(query: CallbackQuery, user: User): Promise<boolean> {
        switch (query.data as typeof this.OPTIONS[number]){
        case 'Добавить слова ➕':
            user.position.push(Position.ADD_WORD);
            return true;
        case 'Удалить слова 🗑️':
            user.position.push(Position.REMOVE_WORD);
            return true;
        case 'Назад 🔙':
            user.position.pop();
            delete user.context.VOCABULARY;
            return true;
        default:
            delete user.context.VOCABULARY;
            this.sendMenu(user);
            return false;
        }
    }

    async handleMessage(message: ExtendedMessage, user: User): Promise<boolean> {
        await this.sendMenu(user);
        return false;
    }

    private async sendMenu(user: User): Promise<TelegramMessage>{
        const word_cnt = await this.wordRepo.count({where: {user_id: user.id}});
        return await this.bot.sendMessage(user.telegram_id, `В вашем словаре ${word_cnt} слов`, {
            reply_markup: {
                inline_keyboard:
                    this.OPTIONS.map(text => ([{text, callback_data: text}]))
                ,
            }
        });
    }
}