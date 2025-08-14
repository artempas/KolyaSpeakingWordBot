import { Inject, Injectable } from '@nestjs/common';
import { CallbackQuery, InlineKeyboardButton, Message, SendMessageOptions } from 'node-telegram-bot-api';
import { HandlerInterface } from '../interface';
import { BotService } from '../../bot.service';
import { Exercise, ExerciseStatus, ExerciseTemplate, ExerciseType, Position, Question, User } from '@kolya-quizlet/entity';
import { UsersService } from 'users/users.service';
import { PositionHandler } from '../../handler.decorator';
import { ExercisesService } from 'exercises/exercises.service';
import { buildKeyboard } from '../../utils';
import { EntityNotFoundError } from 'typeorm';


@Injectable()
@PositionHandler(Position.MULTIPLE_CHOICE)
export class ChoiceHandler implements HandlerInterface{

    private readonly CORRECT_ANSWER_TEXT = '✅ Верно!';

    private readonly INCORRECT_ANSWER_TEXT = '❌ Неверно!';

    constructor(
        @Inject() private readonly userService: UsersService,
        @Inject() private readonly exerciseService: ExercisesService,
        private readonly bot: BotService
    ){}

    async handleQuery(query: CallbackQuery, user: User): Promise<boolean> {
        const parsedQuery = this.parseCallbackQuery(query.data);
        if (!parsedQuery){
            if (query.data === 'Назад🔙'){
                if (query.message?.message_id)
                    await this.bot.deleteMessage(user.telegram_id, query.message?.message_id);
                this.userService.goBack(user);
                return true;
            }
            await this.bot.answerCallbackQuery(query.id);
            await this.sendExercise(user);
            return false;
        } else {
            return await this.handleAnswer(query, parsedQuery.question_id, parsedQuery.is_correct);
        }
    }

    async handleMessage(message: Message, user: User) {
        await this.sendExercise(user);
        return false;
    }

    async sendExercise(user: User, _exercise?: Exercise<ExerciseType.CHOICES>|Exercise<ExerciseType.CHOICE>){
        let exercise = _exercise;
        if (!exercise){
            await this.bot.sendMessage(user, 'Хм, сейчас что-нибудь придумаю (⊙﹏⊙)');
            await this.bot.sendChatAction(user.telegram_id, 'typing');
            const typingInterval = setInterval(() => this.bot.sendChatAction(user.telegram_id, 'typing'), 5_000);
            try {
                // TODO: request concrete generator;
            } catch (e: any){
                if (e instanceof EntityNotFoundError){
                    if (e.entityClass === ExerciseTemplate){
                        await this.bot.sendMessage(user, 'Упс, кажется у нас нет пока заданий такого типа для вашего уровня языка. Приходите попозже, мы обязательно их добавим');
                        this.userService.goBack(user);
                        return true;
                    }
                }
                throw e;
            }
            clearInterval(typingInterval);
        }

        const messages = this.exerciseToMessage(exercise);
        for (let message of messages){
            await this.bot.sendMessage(user.telegram_id, message.text, message.options);
        }
        exercise.status = ExerciseStatus.ASKED;
        await exercise.save();
        return false;
    }

    private exerciseToMessage(
        exercise: Exercise<ExerciseType.CHOICE>|Exercise<ExerciseType.CHOICES>
    ): {text: string, options?: SendMessageOptions}[]{
        const messages: ReturnType<ChoiceHandler['exerciseToMessage']> = [];


        const parseMultipleChoice = (question: Question) => {
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


        if (exercise.isOfType(ExerciseType.CHOICES)){
            if (exercise.generated.text)
                messages.push({text: exercise.generated.text});
            messages.push(...exercise.questions.map(parseMultipleChoice));
        } else if (exercise.isOfType(ExerciseType.CHOICE)){
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
        let finished;
        try {
            finished = await this.exerciseService.handleAnswer(question_id, {is_correct});
        } catch (e: any){
            if (e instanceof EntityNotFoundError){
                await this.bot.sendMessage(query.from.id, 'Упс, кажется я не нашёл такого вопроса:(. Попробуем ещё раз?', {
                    reply_markup: {
                        inline_keyboard: [
                            [{text: 'Да', callback_data: 'repeat'}],
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
            text: finished.is_correct ? this.CORRECT_ANSWER_TEXT : this.INCORRECT_ANSWER_TEXT,
            show_alert: true
        });

        await this.bot.editMessageText(query.message!.text! + '\n' + (is_correct ? this.CORRECT_ANSWER_TEXT : this.INCORRECT_ANSWER_TEXT), {
            message_id: query.message?.message_id,
            chat_id: query.message?.chat.id,
            reply_markup: undefined
        });

        if (finished.finished){
            await this.bot.sendMessage(
                query.from.id,
                `Задание выполнено. Правильных ответов: ${finished.correct}/${finished.total}\n\nХочешь выполнить ещё одно задание?`,
                {
                    reply_markup: {
                        inline_keyboard: [
                            [{text: 'Да', callback_data: 'repeat'}],
                            [{text: 'Назад🔙', callback_data: 'Назад🔙'}]
                        ]
                    }
                }
            );
            return false;
        }
        return false;
    }
}