import { Inject, Injectable } from '@nestjs/common';
import { CallbackQuery, Message } from 'node-telegram-bot-api';
import { HandlerInterface } from './interface';
import { BotService } from '../bot.service';
import { Position, User } from '@kolya-quizlet/entity';
import { UsersService } from 'users/users.service';
import { PositionHandler } from '../handler.decorator';


@Injectable()
@PositionHandler(Position.MENU)
export class MenuHandler implements HandlerInterface{

    private readonly OPTIONS = ['Мой словарь📚', 'Учить слова 🧐', 'Настройки ⚙️'] as const;

    constructor(
        @Inject() private readonly userService: UsersService,
        private readonly bot: BotService
    ){}

    async handleQuery(query: CallbackQuery, user: User): Promise<boolean> {
        switch (query.data as typeof this.OPTIONS[number]){
        case 'Мой словарь📚':
            this.userService.goTo(user, Position.VOCABULARY);
            return true;
        case 'Учить слова 🧐':
            this.userService.goTo(user, Position.EXERCISE);
            return true;
        case 'Настройки ⚙️':
            this.userService.goTo(user, Position.SETTINGS);
            return true;
        default:
            this.sendMenu(user);
            return false;
        }
    }

    async handleMessage(_message: Message, user: User) {
        await this.sendMenu(user);
        return false;
    }

    private async sendMenu(user: User): Promise<Message>{
        return await this.bot.sendMessage(user.telegram_id, 'Главное меню', {
            reply_markup: {
                inline_keyboard: this.OPTIONS.map(text => ([{text, callback_data: text}])),
                is_persistent: true,
                input_field_placeholder: 'Отвечайте кнопками'
            }
        });
    }


}