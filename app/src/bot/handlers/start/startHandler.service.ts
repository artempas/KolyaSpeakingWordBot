import { Inject, Injectable } from '@nestjs/common';
import { Message } from 'node-telegram-bot-api';
import { HandlerInterface } from '../interface';
import { BotService } from '../../bot.service';
import { OnboardingSteps, Position, User, UserLevel } from '@kolya-quizlet/entity';
import { UsersService } from 'users/users.service';
import { PositionHandler } from '../../handler.decorator';
import { buildKeyboard } from 'bot/utils';
import { ExtendedCallbackQuery } from 'bot/types';
import { KEYS } from './startHandler.keys';


@Injectable()
@PositionHandler(Position.START)
export class StartHandler implements HandlerInterface{

    constructor(
        @Inject() private readonly userService: UsersService,
        private readonly bot: BotService
    ){}

    handleQuery(query: ExtendedCallbackQuery, user: User): Promise<boolean> {
        switch (user.context.START?.step){
        case OnboardingSteps.ASK_LEVEL:
            return this.handleLevelQuery(query, user);
        case OnboardingSteps.ADD_WORDS:
            return this.handleWordsQuery(query, user);
        default:
            return this.sendStep(user);
        }
    }

    async handleMessage(_message: Message, user: User) {
        await this.prepareContext(user);
        return await this.sendStep(user);
    }

    private async prepareContext(user: User){
        if (user.context.START) return;
        user.context.START = {step: OnboardingSteps.HELLO, words: {asked: false}};
    }


    private sendStep(user: User): Promise<boolean>{
        switch (user.context.START?.step){
        case OnboardingSteps.HELLO:
            return this.sayHello(user);
        case OnboardingSteps.ASK_LEVEL:
            return this.askLevel(user);
        case OnboardingSteps.ADD_WORDS:
            return this.addWords(user);
        default:
            this.userService.goTo(user, Position.MENU, {rewrite: true});
            return Promise.resolve(true);
        }

    }

    private async addWords(user: User): Promise<boolean> {
        await this.bot.sendMessage(user, KEYS.ASK_WORDS.MSG, {reply_markup: {
            inline_keyboard: [
                [{text: KEYS.ASK_WORDS.OPTIONS[1], callback_data: '1'}],
                [{text: KEYS.ASK_WORDS.OPTIONS[0], callback_data: '0'}],
            ]
        }});
        return false;
    }

    private async handleWordsQuery(query: ExtendedCallbackQuery, user: User): Promise<boolean> {
        const answer = query.data;
        if (user.context.START?.words.asked) {
            user.context.START.step++;
            return true;
        }
        if (answer === '1') {
            user.context.START!.words.asked = true;
            this.userService.goTo(user, Position.ADD_WORD);
            return true;
        } else if (answer === '0') {
            user.context.START!.step++;
            return true;
        }
        return this.sendStep(user);
    }

    private async askLevel(user: User){
        await this.bot.sendMessage(
            user,
            KEYS.ASK_LEVEL_MSG(),
            {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: buildKeyboard(
                        Object.entries(UserLevel).map(([k, v]) => ({text: k, callback_data: v}))
                    )
                }
            }
        );
        return false;
    }

    private async handleLevelQuery(query: ExtendedCallbackQuery, user: User): Promise<boolean>{
        const data = query.data;
        if (!data) return this.askLevel(user);
        if (this.isLevelQuery(data)) {
            user.level = data;
            user.context.START!.step++;
            await this.bot.editMessageText(KEYS.ASK_LEVEL_MSG(data), {chat_id: user.telegram_id, message_id: query.message?.message_id, parse_mode: 'HTML', reply_markup: undefined});
            return true;
        } else {
            this.bot.answerCallbackQueryIfNotAnswered(query, {text: '❌Отвечай кнопками с последнего сообщения', show_alert: true});
            return false;
        }
    }

    private isLevelQuery(data: string): data is UserLevel{
        return Object.values(UserLevel).includes(data as UserLevel);
    }

    private async sayHello(user: User){
        await this.bot.sendMessage(
            user,
            KEYS.HELLO_MSG,
            {parse_mode: 'HTML'}
        );
        user.context.START!.step++;
        return true;
    }


}