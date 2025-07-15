import { Inject, Injectable } from '@nestjs/common';
import { CallbackQuery, InlineKeyboardButton, Message, SendMessageOptions } from 'node-telegram-bot-api';
import { HandlerInterface } from './interface';
import { BotService } from '../bot.service';
import { Exercise, ExerciseTemplate, ExerciseType, Position, Question, User } from '@kolya-quizlet/entity';
import { UserService } from 'src/user/user.service';
import { PositionHandler } from '../handler.decorator';
import { ExercisesService } from 'src/exercises/exercises.service';
import { buildKeyboard } from '../utils';
import { EntityNotFoundError } from 'typeorm';


@Injectable()
@PositionHandler(Position.EXERCISE)
export class ExerciseHandler implements HandlerInterface{

    constructor(
        @Inject() private readonly userService: UserService,
        @Inject() private readonly exerciseService: ExercisesService,
        private readonly bot: BotService
    ){}

    async handleQuery(query: CallbackQuery, user: User): Promise<boolean> {
        const parsedQuery = this.parseCallbackQuery(query.data);
        if (!parsedQuery){
            if (query.data === 'Назад🔙'){
                this.userService.goBack(user);
                return true;
            }
            await this.sendExercise(user);
            return false;
        } else {
            await this.bot.answerCallbackQuery(query.id);
            return await this.handleAnswer(query, parsedQuery.question_id, parsedQuery.is_correct);
        }
    }

    async handleMessage(message: Message, user: User) {
        await this.sendExercise(user);
        return false;
    }

    private async sendExercise(user: User){
        await this.bot.sendMessage(user, 'Хм, сейчас что-нибудь придумаю (⊙﹏⊙)');
        let exercise: Exercise<ExerciseType>;
        try {
            exercise = await this.exerciseService.getNextExercise(user);
        } catch (e: any){
            if (e instanceof EntityNotFoundError){
                if (e.entityClass === ExerciseTemplate){
                    await this.bot.sendMessage(user, 'Упс, кажется у нас нет пока заданий для вашего уровня языка. Приходите попозже, мы обязательно их добавим');
                    this.userService.goBack(user);
                    return true;
                }
            }
            throw e;
        }
        const messages = this.exerciseToMessage(exercise);
        for (const message of messages){
            await this.bot.sendMessage(user.telegram_id, message.text, message.options);
        }
    }

    private exerciseToMessage(exercise: Exercise<ExerciseType>): {text: string, options?: SendMessageOptions}[]{
        const messages: ReturnType<ExerciseHandler['exerciseToMessage']> = [];


        const parseMultipleChoice = (question: Question): ReturnType<ExerciseHandler['exerciseToMessage']>[number] => {
            return {
                text: question.text,
                options: {
                    reply_markup: {
                        inline_keyboard: buildKeyboard(
                            question.options.map(
                                (option, idx) =>
                                    ({
                                        text: option,
                                        callback_data: this.createCallbackQuery(question.id, idx === question.correct_idx)
                                    } as InlineKeyboardButton)
                            ),
                            {columns: 1}
                        )
                    }
                }
            };
        };


        switch (exercise.template?.type){
        case ExerciseType.TEXT_WITH_MULTIPLE_CHOICE:
            if (this.exerciseService.isOfExerciseType(exercise.generated, ExerciseType.TEXT_WITH_MULTIPLE_CHOICE)){
                messages.push({text: exercise.generated.text});
                messages.push(...exercise.questions.map(parseMultipleChoice));
                break;
            } else {
                throw new Error('Wrong generated data');
            }
        case ExerciseType.MULTIPLE_CHOICE:
            messages.push(parseMultipleChoice(exercise.questions[0]));
        }
        return messages;
    }

    private createCallbackQuery(question_id: number, is_correct: boolean){
        return `qid${question_id}:${is_correct ? 1 : 0}`;
    }

    private parseCallbackQuery(query: string|undefined): {question_id: number, is_correct: boolean}|false{
        if (!query) return false;
        const match = query.match(/^qid(\d+):([01])$/);
        if (!match) return false;
        return {
            question_id: Number(match[1]),
            is_correct: match[2] === '1'
        };
    }

    private async handleAnswer(query: CallbackQuery, question_id: number, is_correct: boolean): Promise<boolean> {
        try {
            await this.exerciseService.handleAnswer(question_id, is_correct);
        } catch (e: any){
            if (e instanceof EntityNotFoundError){
                await this.bot.sendMessage(query.from.id, 'Упс, кажется я не нашёл такого вопроса:(. Попробуем ещё раз?', {
                    reply_markup: {
                        inline_keyboard: [
                            [{text: 'Да'}],
                            [{text: 'Назад🔙', callback_data: 'Назад🔙'}]
                        ]
                    }
                });
                return false;
            } else {
                throw e;
            }
        }
        await this.bot.answerCallbackQuery(query.id, {
            text: is_correct ? '✅ Верно!' : '❌ Неверно!',
            show_alert: true
        });

        await this.bot.sendMessage(query.from.id, 'Ещё задание?', {
            reply_markup: {
                inline_keyboard: [
                    [{text: 'Да'}],
                    [{text: 'Назад🔙', callback_data: 'Назад🔙'}]
                ]
            }
        });


        return true;
    }
}