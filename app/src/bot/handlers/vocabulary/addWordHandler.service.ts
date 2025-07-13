import { Injectable } from '@nestjs/common';
import { HandlerInterface } from '../interface';
import { Message, CallbackQuery } from 'node-telegram-bot-api';
import { BotService } from '../../bot.service';
import { User, Word } from '@kolya-quizlet/entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';


@Injectable()
export class AddWordHandler implements HandlerInterface{

    private readonly REPEAT_ADD_OPTIONS = [
        'Добавить ещё ➕',
        'Назад 🔙'
    ] as const;

    constructor(
        private readonly bot: BotService,
        @InjectRepository(Word) private readonly wordRepo: Repository<Word>
    ){}

    async handleMessage(message: Message, user: User): Promise<boolean> {
        if (!user.context.ADD_WORD?.asked) return await this.ask(user);

        if (user.context.ADD_WORD?.repeat) return await this.repeat(user);

        if (!message.text) {
            await this.bot.sendMessage(user.telegram_id, 'Прости, я пока не умею понимать такие сообщения, отправь мне слова текстом и я их сразу запишу');
            return false;
        }
        const words = message.text.split(',').map(word => word.trim()).filter(i => i);
        const result = await this.wordRepo.save(
            words.map(word => ({
                user_id: user.id,
                word
            }))
        );
        await this.bot.sendMessage(user.telegram_id, `Готово, записал ${result.length} слов: \n ${words.join('\n')}`);
        user.context.ADD_WORD.repeat = true;
        return true;

    }

    async handleQuery(query: CallbackQuery, user: User): Promise<boolean> {
        switch (query.data as typeof this.REPEAT_ADD_OPTIONS[number]){
        case 'Добавить ещё ➕':
            delete user.context.ADD_WORD?.repeat;
            return true;
        case 'Назад 🔙':
            delete user.context.ADD_WORD;
            user.position.pop();
            return true;
        default:
            user.context.ADD_WORD = {};
            return await this.ask(user);
        }

    }

    private async ask(user: User){
        if (user.context.ADD_WORD)
            user.context.ADD_WORD.asked = true;
        else {
            user.context.ADD_WORD = {asked: true};
        }
        await this.bot.sendMessage(user.telegram_id, 'Перечисли через запятую слова, которые ты бы хотел добавить в словарь', {
            reply_markup: {
                inline_keyboard: [[{text: this.REPEAT_ADD_OPTIONS[1], callback_data: this.REPEAT_ADD_OPTIONS[1]}]]
            }
        });
        return false;
    }

    private async repeat(user: User) {
        await this.bot.sendMessage(user.telegram_id, 'Хочешь добавить ещё слов в свой словарь?', {
            reply_markup: {
                inline_keyboard: this.REPEAT_ADD_OPTIONS.map(option => ([{text: option, callback_data: option}]))
            }
        });
        return false;
    }


}