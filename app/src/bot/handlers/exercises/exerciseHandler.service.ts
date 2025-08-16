import { Inject, Injectable } from '@nestjs/common';
import { CallbackQuery, Message } from 'node-telegram-bot-api';
import { HandlerInterface } from '../interface';
import { BotService } from '../../bot.service';
import { Exercise, ExerciseType, Position, User } from '@kolya-quizlet/entity';
import { UsersService } from 'users/users.service';
import { PositionHandler } from '../../handler.decorator';
import { ExercisesService } from 'exercises/exercises.service';
import { AITextHandler } from './aiText.service';
import { ExtendedMessage } from 'bot/types';
import { buildKeyboard } from 'bot/utils';
import { MatchingHandler } from './matchingHandler.service';
import { NoSuitableExerciseTypeFound } from 'exercises/exercise.exceptions';
import { ExerciseHandlerInterface } from './interface';
import { TranslateToForeignHandler } from './translateToForeign.service';
import { TranslateToNativeHandler } from './translateToNative.service';


@Injectable()
@PositionHandler(Position.EXERCISE)
export class ExerciseHandler implements HandlerInterface{

    private typesHandlingMap: { [type in ExerciseType]: ExerciseHandlerInterface<any> } = {
        [ExerciseType.AI_TEXT]: this.multipleChoiceHandler,
        [ExerciseType.MATCH_TRANSLATION]: this.matchingHandler,
        [ExerciseType.TRANSLATE_TO_FOREIGN]: this.translateToForeignHandler,
        [ExerciseType.TRANSLATE_TO_NATIVE]: this.translateToNativeHandler
    };

    constructor(
        @Inject() private readonly userService: UsersService,
        @Inject() private readonly exerciseService: ExercisesService,
        private readonly multipleChoiceHandler: AITextHandler,
        private readonly matchingHandler: MatchingHandler,
        private readonly translateToForeignHandler: TranslateToForeignHandler,
        private readonly translateToNativeHandler: TranslateToNativeHandler,
        private readonly bot: BotService
    ){}

    async handleQuery(query: CallbackQuery, user: User): Promise<boolean> {
        switch (query.data){
        case 'Случайное 🪄':
            return await this.sendExercise(user);
        case 'Назад 🔙':
            if (query.message?.message_id)
                await this.bot.deleteMessage(user.telegram_id, query.message?.message_id);
            this.userService.goBack(user);
            delete user.context.EXERCISE;
            return true;
        default: {
            const parsed = this.parseQuery(query.data);
            if (parsed){
                return await this.sendExercise(user, parsed.exerciseType);
            }
            this.sendMenu(user);
            return false;
        }
        }
    }

    private parseQuery(data: string|undefined): false|{exerciseType: ExerciseType} {
        if (!data) return false;
        if (!Object.values(ExerciseType).some(type => data === `exerciseType:${type}`)) return false;
        const parsed = data.split(':')[1];
        return {exerciseType: <ExerciseType>parsed};
    }

    async handleMessage(_message: ExtendedMessage, user: User): Promise<boolean> {
        await this.sendMenu(user);
        return false;
    }

    private async sendMenu(user: User): Promise<Message>{
        return await this.bot.sendMessage(user.telegram_id, 'Выбери тип задания', {
            reply_markup: {
                inline_keyboard: [
                    [{text: 'Случайное 🪄', callback_data: 'Случайное 🪄'}],
                    ...buildKeyboard(
                        (await this.exerciseService.getSuitableExerciseTypes(user)).map(({type, handler}) => ({text: handler.display_name, callback_data: `exerciseType:${type}`})),
                        {columns: 2, back_button: {text: 'Назад 🔙', callback_data: 'Назад 🔙'}}
                    )
                ]
            }
        });
    }

    private async sendExercise(user: User, type?: ExerciseType){
        await this.bot.sendMessage(user, 'Хм, сейчас что-нибудь придумаю (⊙﹏⊙)');
        let exercise: Exercise<any>;
        try {
            exercise = await this.exerciseService.generateExercise(user, type ? {type: [type]} : undefined);
        } catch (e: any){
            if (e instanceof NoSuitableExerciseTypeFound){
                await this.bot.sendMessage(user, 'Упс, кажется у нас нет пока заданий для твоего уровня языка. Попробуй добавить слов или приходи попозже, мы обязательно их добавим');
                this.userService.goBack(user);
                return true;
            }
            throw e;
        }

        this.userService.goTo(user, exercise.type);
        return this.typesHandlingMap[exercise.type].sendExercise(user, exercise as any);
    }
}