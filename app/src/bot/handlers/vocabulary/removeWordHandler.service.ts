import { Inject, Injectable } from '@nestjs/common';
import { HandlerInterface } from '../interface';
import { Message } from 'node-telegram-bot-api';
import { buildKeyboard } from 'bot/utils';
import { BotService } from 'bot/bot.service';
import { ExtendedCallbackQuery } from 'bot/types';
import { Position, User, Word } from '@kolya-quizlet/entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserService } from 'user/user.service';
import { PositionHandler } from 'bot/handler.decorator';

@Injectable()
@PositionHandler(Position.REMOVE_WORD)
export class RemoveWordHandler implements HandlerInterface{
    private readonly RESULTS_PER_PAGE = 10;

    private readonly BUTTONS = {
        BACK: 'Назад 🔙',
        PREVIOUS_PAGE: '⬅️',
        NEXT_PAGE: '➡️'
    } as const;

    constructor(
        private readonly bot: BotService,
        @InjectRepository(Word) private readonly wordRepo: Repository<Word>,
        @Inject() private readonly userService: UserService,
    ){}

    private async sendPage(user: User, message_id?: number|undefined){
        if (!user.context.REMOVE_WORD) user.context.REMOVE_WORD = {page: 0};
        else if (!user.context.REMOVE_WORD?.page) user.context.REMOVE_WORD.page = 0;
        const page = user.context.REMOVE_WORD.page;
        const page_content = await this.wordRepo.find({
            select: {
                id: true,
                word: true
            },
            where: {
                user_id: user.id
            },
            order: {
                word: 'asc'
            },
            take: this.RESULTS_PER_PAGE + 1,
            skip: user.context.REMOVE_WORD.page! * this.RESULTS_PER_PAGE
        });

        if (!page_content.length){
            if (user.context.REMOVE_WORD.page){
                user.context.REMOVE_WORD.page--;
                return true;
            } else {
                await this.bot.sendMessage(user.telegram_id, 'Кажется в вашем словаре нет слов', {
                    reply_markup: {inline_keyboard: [[{text: this.BUTTONS.BACK, callback_data: this.BUTTONS.BACK}]]}
                });
                return false;
            }
        }
        const keyboard = buildKeyboard(
            page_content.slice(0, this.RESULTS_PER_PAGE).map(btn => ({
                text: btn.word,
                callback_data: 'remove:' + btn.id
            })),
            {
                previous_page: page ? {text: this.BUTTONS.PREVIOUS_PAGE, callback_data: this.BUTTONS.PREVIOUS_PAGE} : undefined,
                next_page:
                    page_content.length > this.RESULTS_PER_PAGE
                        ? {text: this.BUTTONS.NEXT_PAGE, callback_data: this.BUTTONS.NEXT_PAGE}
                        : undefined,
                back_button: {text: this.BUTTONS.BACK, callback_data: this.BUTTONS.BACK}
            }
        );
        if (message_id){
            await this.bot.editMessageReplyMarkup({inline_keyboard: keyboard}, {message_id, chat_id: user.telegram_id});
        } else {
            await this.bot.sendMessage(user.telegram_id, 'Выбери слова, которые хочешь удалить', {
                reply_markup: {inline_keyboard: keyboard}
            });
        }
        return true;
    }

    async handleQuery(query: ExtendedCallbackQuery, user: User): Promise<boolean> {
        if (!user.context.REMOVE_WORD) user.context.REMOVE_WORD = {};
        switch (query.data as (typeof this.BUTTONS)[keyof typeof this.BUTTONS]){
        case 'Назад 🔙':
            delete user.context.REMOVE_WORD;
            this.userService.goBack(user);
            if (query.message)
                await this.bot.deleteMessageIfNotDeleted(query.message);
            return true;
        case '➡️':
            user.context.REMOVE_WORD.page = user.context.REMOVE_WORD.page !== undefined ? user.context.REMOVE_WORD.page + 1 : 0;
            return this.sendPage(user, query.message?.message_id);
        case '⬅️':
            user.context.REMOVE_WORD.page = user.context.REMOVE_WORD.page ? user.context.REMOVE_WORD.page - 1 : 0;
            return this.sendPage(user, query.message?.message_id);
        default:
            if (this.isDeleteQuery(query.data)){
                await this.handleDelete(user, query);
                return await this.sendPage(user, query.message?.message_id);
            } else {
                if (query.message)
                    await this.bot.deleteMessageIfNotDeleted(query.message);
                return await this.sendPage(user);
            }
        }
    }

    private isDeleteQuery(query: string|undefined): query is `remove:${number}`{
        if (!query) return false;
        return /^remove:\d+$/.test(query);
    }

    private async handleDelete(user: User, query: ExtendedCallbackQuery){
        const word_id = +query.data!.split(':')[1];
        const word = await this.wordRepo.findOne({
            select: {id: true},
            where: {
                user_id: user.id,
                id: word_id
            }
        });
        if (!word){
            await this.bot.answerCallbackQueryIfNotAnswered(query, {text: 'Не нашёл такого слова :('});
            return false;
        }
        await this.wordRepo.delete({id: word_id, user_id: user.id});
        return true;
    }

    async handleMessage(message: Message, user: User): Promise<boolean> {
        if (!user.context.REMOVE_WORD) user.context.REMOVE_WORD = {};
        await this.sendPage(user);
        return false;
    }
}