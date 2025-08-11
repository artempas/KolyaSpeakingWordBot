import { Inject, Injectable } from '@nestjs/common';
import { CallbackQuery, InlineKeyboardButton, InlineKeyboardMarkup, Message } from 'node-telegram-bot-api';
import { HandlerInterface } from '../interface';
import { BotService } from '../../bot.service';
import { Exercise, ExerciseStatus, ExerciseTemplate, ExerciseType, MatchingContextData, Position, User } from '@kolya-quizlet/entity';
import { UsersService } from 'users/users.service';
import { PositionHandler } from '../../handler.decorator';
import { ExercisesService } from 'exercises/exercises.service';
import { EntityNotFoundError } from 'typeorm';


@Injectable()
@PositionHandler(Position.MATCHING)
export class MatchingHandler implements HandlerInterface{

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
            switch (parsedQuery.type){
            case 'option':
                return await this.handleOptionSelection(user, query, parsedQuery.idx);
            case 'question':
                return await this.handleQuestionSelection(user, query, parsedQuery.id, parsedQuery.idx);
            case 'accept':
                return await this.handleAnswer(query, user);
            }
        }
    }

    private handleQuestionSelection(user: User, query: CallbackQuery, id: number, idx: number): boolean | PromiseLike<boolean> {
        if (user.context.MATCHING?.question_selected_id !== id){
            user.context.MATCHING!.question_selected_id = id;
            user.context.MATCHING!.question_selected_idx = idx;
            return this.sendExercise(user, {message_id: query.message?.message_id});
        }
        return false;
    }

    private handleOptionSelection(user: User, query: CallbackQuery, idx: number) {
        if (user.context.MATCHING?.option_selected_idx !== idx){
            user.context.MATCHING!.option_selected_idx = idx;
            return this.sendExercise(user, {message_id: query.message?.message_id});
        }
        return false;
    }

    async handleMessage(message: Message, user: User) {
        await this.sendExercise(user);
        return false;
    }

    private prepareContext(user: User, exercise: Exercise<ExerciseType.MATCH>){
        if (!user.context.MATCHING) {
            const length = exercise.questions.length;
            const shuffling_pattern = Array.from({length}, (_, i) => i).sort(() => Math.random() - 0.5);
            user.context.MATCHING = {
                current_exercise_id: exercise.id,
                shuffling_pattern,
            };
        }
    }

    async sendExercise(user: User, kwargs?: {exercise?: Exercise<ExerciseType.MATCH>, message_id?:number}){
        let exercise = kwargs?.exercise;
        if (!exercise){
            try {
                exercise = await this.exerciseService.getNextExercise(
                    user,
                    {type: [ExerciseType.MATCH] as const, id: user.context?.MATCHING?.current_exercise_id}
                );
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
        }
        this.prepareContext(user, exercise);

        const message = this.exerciseToMessage(exercise, user.context.MATCHING!);

        if (kwargs?.message_id){
            await this.bot.editMessageText(
                message.text,
                {reply_markup: message.options?.reply_markup, chat_id: user.telegram_id, message_id: kwargs.message_id}
            );
        } else
            await this.bot.sendMessage(user.telegram_id, message.text, message.options);

        exercise.status = ExerciseStatus.ASKED;
        await exercise.save();
        return false;
    }

    private exerciseToMessage(
        exercise: Exercise<ExerciseType.MATCH>,
        context: MatchingContextData
    ): {text: string, options?: {reply_markup: InlineKeyboardMarkup}}{
        const keyboard: InlineKeyboardButton[][] = [];

        for (let idx = 0; idx < exercise.generated.options.length; idx++){
            const question_option = exercise.generated.options[idx];
            const answer_option = exercise.generated.options[context.shuffling_pattern[idx]];
            let question_button: InlineKeyboardButton;
            let option_button: InlineKeyboardButton;

            const current_question = exercise.questions.find(q => q.word_id === question_option.word_id);

            if (!current_question) throw new Error('Question not found in db');

            if (current_question.is_correct){
                question_button = {text: this.CORRECT_ANSWER_TEXT, callback_data: this.CORRECT_ANSWER_TEXT};
            } else if (current_question.is_correct === false){
                question_button = {text: this.INCORRECT_ANSWER_TEXT, callback_data: this.INCORRECT_ANSWER_TEXT};
            } else if (context.question_selected_id === current_question.id){
                question_button = {text: '🔘' + current_question.word.word, callback_data: `qid:${current_question.id}:idx:${idx}`};
            } else {
                question_button = {text: '⚪️' + current_question.word.word, callback_data: `qid:${current_question.id}:idx:${idx}`};
            }

            const current_answer = exercise.questions.find(q => q.word_id === answer_option.word_id);
            if (!current_answer) throw new Error('Answer not found in db');

            if (current_answer?.is_correct){
                option_button = {text: this.CORRECT_ANSWER_TEXT, callback_data: this.CORRECT_ANSWER_TEXT};
            // } else if (context.wrong[1].includes(idx)){
            //     option_button = {text: this.INCORRECT_ANSWER_TEXT, callback_data: this.INCORRECT_ANSWER_TEXT};
            } else if (context.option_selected_idx === idx) {
                option_button = {text: '🔘' + current_answer.options[0], callback_data: `ans:${idx}`};
            } else {
                option_button = {text: '⚪️' + current_answer.options[0], callback_data: `ans:${idx}`};
            }

            keyboard.push([question_button, option_button]);
        }
        keyboard.push([{text: 'Выбрать', callback_data: 'accept'}]);
        keyboard.push([{text: 'Назад🔙', callback_data: 'Назад🔙'}]);
        return {text: exercise.generated.question, options: {reply_markup: {inline_keyboard: keyboard}}};

    }

    private parseCallbackQuery(query: string|undefined): {type: 'question', id: number, idx: number}|{type: 'option', idx: number}|{type: 'accept'}|false {
        if (!query) return false;
        const question_match = query.match(/^qid:(\d+):idx:(\d+)$/);
        if (question_match) return {type: 'question', id: Number(question_match[1]), idx: Number(question_match[2])};
        const answer_match = query.match(/^ans:(\d+)$/);
        if (answer_match) return {type: 'option', idx: Number(answer_match[1])};
        if (query === 'accept') return {type: 'accept'};
        return false;
    }

    private async handleAnswer(query: CallbackQuery, user: User): Promise<boolean> {
        if (
            user.context.MATCHING?.question_selected_id === undefined
            || user.context.MATCHING.option_selected_idx === undefined
            || user.context.MATCHING?.question_selected_idx === undefined
        ){
            await this.bot.answerCallbackQuery(query.id, {text: 'Сначала надо выбрать по одному варианту слева и справа', show_alert: true});
            return false;
        }
        let finished;
        try {
            const qSelectedIdx = user.context.MATCHING.question_selected_idx;
            const is_correct =
                user.context.MATCHING.shuffling_pattern[qSelectedIdx] === user.context.MATCHING.option_selected_idx;
            finished = await this.exerciseService.handleAnswer(
                user.context.MATCHING.question_selected_id,
                {is_correct}
            );
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

        delete user.context.MATCHING.option_selected_idx;
        delete user.context.MATCHING.question_selected_id;

        await this.bot.answerCallbackQuery(query.id, {
            text: finished.is_correct ? this.CORRECT_ANSWER_TEXT : this.INCORRECT_ANSWER_TEXT,
            show_alert: true
        });

        if (finished.finished){
            if (query.message?.message_id)
                await this.bot.deleteMessage(user.telegram_id, query.message?.message_id);
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
            delete user.context.MATCHING;
            return false;
        } else {
            return await this.sendExercise(user, {message_id: query.message?.message_id});
        }
    }
}