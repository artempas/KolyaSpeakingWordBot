import { Inject, Injectable } from '@nestjs/common';
import { CallbackQuery, InlineKeyboardButton, Message, SendMessageOptions } from 'node-telegram-bot-api';
import { HandlerInterface } from '../interface';
import { BotService } from '../../bot.service';
import { Exercise, ExerciseStatus, ExerciseType, Position, User } from '@kolya-quizlet/entity';
import { UsersService } from 'users/users.service';
import { PositionHandler } from '../../handler.decorator';
import { ExercisesService } from 'exercises/exercises.service';
import { buildKeyboard } from '../../utils';
import { EntityNotFoundError } from 'typeorm';
import { AITextGenerationService } from 'exercises/generators';
import z from 'zod';
import { ExerciseHandlerInterface } from './interface';


@Injectable()
@PositionHandler(Position.AI_TEXT)
export class AITextHandler implements HandlerInterface, ExerciseHandlerInterface<z.infer<AITextGenerationService['schema']>>{

    private readonly CORRECT_ANSWER_TEXT = '✅ Верно!';

    private readonly INCORRECT_ANSWER_TEXT = '❌ Неверно!';

    constructor(
        @Inject() private readonly userService: UsersService,
        @Inject() private readonly exerciseService: ExercisesService,
        @Inject() private readonly aiTextGenerationService: AITextGenerationService,
        private readonly bot: BotService
    ){}

    private prepareContext(user: User, exercise_id: number){
        if (!user.context.AI_TEXT)
            user.context.AI_TEXT = {exercise_id};
    }

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
            return await this.handleAnswer(query, user, parsedQuery.word_id, parsedQuery.is_correct);
        }
    }

    async handleMessage(_message: Message, user: User) {
        await this.sendExercise(user);
        return false;
    }

    async sendExercise(user: User, _exercise?: Exercise<z.infer<AITextGenerationService['schema']>>){
        let exercise = _exercise;
        if (!exercise){
            await this.bot.sendMessage(user, 'Хм, сейчас что-нибудь придумаю (⊙﹏⊙)');
            await this.bot.sendChatAction(user.telegram_id, 'typing');
            const typingInterval = setInterval(() => this.bot.sendChatAction(user.telegram_id, 'typing'), 5_000);
            try {
                exercise = await this.exerciseService.generateExercise(user, {type: [ExerciseType.AI_TEXT]});
            } catch (_e: any){
                await this.bot.sendMessage(user, 'Упс, кажется что-то пошло не так. Попробуем ещё раз?');
                this.userService.goBack(user);
                return true;
            }
            clearInterval(typingInterval);
        }
        this.prepareContext(user, exercise.id);

        const messages = this.exerciseToMessage(exercise);
        for (let message of messages){
            await this.bot.sendMessage(user.telegram_id, message.text, message.options);
        }
        exercise.status = ExerciseStatus.ASKED;
        await exercise.save();
        return false;
    }

    private exerciseToMessage(
        exercise: Exercise<z.infer<AITextGenerationService['schema']>>
    ): {text: string, options?: SendMessageOptions}[]{
        const messages: ReturnType<AITextHandler['exerciseToMessage']> = [];


        const parseMultipleChoice = (generated: Exercise<z.infer<AITextGenerationService['schema']>>['generated']['questions'][number]) => {
            return {
                text: generated.question,
                options: {
                    reply_markup: {
                        inline_keyboard: buildKeyboard(
                            generated.options.map(
                                (option, idx) =>
                                    ({
                                        text: option,
                                        callback_data: this.createCallbackQuery(generated.word_id, idx === generated.correct_index)
                                    } as InlineKeyboardButton)
                            ),
                            {columns: 1}
                        )
                    }
                }
            };
        };


        if (exercise.generated.text)
            messages.push({text: exercise.generated.text, options: {parse_mode: 'HTML'}});
        messages.push(...exercise.generated.questions.map(parseMultipleChoice));

        return messages;
    }

    private createCallbackQuery(word_id: number, is_correct: boolean){
        return `word_id${word_id}:${is_correct ? 1 : 0}`;
    }

    private parseCallbackQuery(query: string|undefined): {word_id: number, is_correct: boolean}|false{
        if (!query) return false;
        const match = query.match(/^word_id(\d+):([01])$/);
        if (!match) return false;
        return {
            word_id: Number(match[1]),
            is_correct: match[2] === '1'
        };
    }

    private async handleAnswer(query: CallbackQuery, user: User, word_id: number, is_correct: boolean): Promise<boolean> {
        let finished;
        try {
            if (!user.context.AI_TEXT) throw new Error('AI_TEXT context is not set for user');
            finished = await this.aiTextGenerationService.handleAnswer({exercise_id: user.context.AI_TEXT?.exercise_id, word_id}, {is_correct});
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