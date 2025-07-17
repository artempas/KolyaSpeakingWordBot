import { Inject, Injectable } from '@nestjs/common';
import { InlineKeyboardButton, Message } from 'node-telegram-bot-api';
import { HandlerInterface } from './interface';
import { BotService } from '../bot.service';
import { Position, User, UserLevel } from '@kolya-quizlet/entity';
import { UserService } from 'user/user.service';
import { PositionHandler } from '../handler.decorator';
import { ExtendedCallbackQuery } from 'bot/types';
import { buildKeyboard } from 'bot/utils';
import { LlmService } from 'llm/llm.service';


@Injectable()
@PositionHandler(Position.SETTINGS)
export class SettingsHandler implements HandlerInterface{

        private readonly BUTTONS = {
            BACK: 'Назад 🔙'
        } as const;

        constructor(
            private readonly bot: BotService,
            @Inject() private readonly userService: UserService,
            @Inject() private readonly llmService: LlmService
        ){}

        private async sendSettings(user: User, message_id?: number|undefined){
            const page_content: InlineKeyboardButton[] = Object.values(UserLevel).map(level => ({text: level === user.level ? `🔘${level}` : `⚪️${level}`, callback_data: `level:${level}`}));
            const keyboard = buildKeyboard(
                page_content,
                {
                    back_button: {text: this.BUTTONS.BACK, callback_data: this.BUTTONS.BACK},
                    columns: 2
                }
            );
            keyboard.push(
                ['deepseek', 'openai'].map(provider => ({text: this.llmService.current_agent === provider ? `🔘${provider}` : `⚪️${provider}`, callback_data: `agent:${provider}`}))
            );
            if (message_id){
                await this.bot.editMessageReplyMarkup({inline_keyboard: keyboard}, {message_id, chat_id: user.telegram_id});
            } else {
                await this.bot.sendMessage(user.telegram_id, 'Выбери свой уровень языка', {
                    reply_markup: {inline_keyboard: keyboard}
                });
            }
            return false;
        }

        async handleQuery(query: ExtendedCallbackQuery, user: User): Promise<boolean> {
            switch (query.data as (typeof this.BUTTONS)[keyof typeof this.BUTTONS]){
            case 'Назад 🔙':
                this.userService.goBack(user);
                if (query.message)
                    await this.bot.deleteMessageIfNotDeleted(query.message);
                return true;
            default:
                if (this.isSettingsQuery(query.data)){
                    await this.handleSelect(user, query);
                    return await this.sendSettings(user, query.message?.message_id);
                } else if (this.isAgentQuery(query.data)){
                    await this.handleAgentSelect(query.data);
                    return await this.sendSettings(user, query.message?.message_id);
                } else {
                    if (query.message)
                        await this.bot.deleteMessageIfNotDeleted(query.message);
                    return await this.sendSettings(user);
                }
            }
        }

        private isSettingsQuery(query: string|undefined): query is `level:${UserLevel}`{
            if (!query) return false;
            return /^level:[A-C][1-2]$/.test(query);
        }

        private isAgentQuery(query: string|undefined): query is `agent:${typeof this.llmService.current_agent}`{
            if (!query) return false;
            return /^agent:(openai|deepseek)$/.test(query);
        }

        private handleAgentSelect(query: `agent:${typeof this.llmService.current_agent}`){
            this.llmService.current_agent = query.split(':')[1] as typeof this.llmService.current_agent;
        }

        private async handleSelect(user: User, query: ExtendedCallbackQuery){
            const level = query.data!.split(':')[1] as UserLevel;
            if (!Object.values(UserLevel).includes(level)){
                await this.bot.answerCallbackQueryIfNotAnswered(query, {text: 'Не нашёл такого уровня :('});
                return false;
            }
            user.level = level;
            await user.save();
            return true;
        }

        async handleMessage(message: Message, user: User): Promise<boolean> {
            await this.sendSettings(user);
            return false;
        }


}