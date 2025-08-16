import { CallbackQuery, Message, SendMessageOptions } from 'node-telegram-bot-api';
import { HandlerInterface } from '../interface';
import { BotService } from '../../bot.service';
import { Exercise, ExerciseStatus, ExerciseType, User } from '@kolya-quizlet/entity';
import { UsersService } from 'users/users.service';
import { ExercisesService } from 'exercises/exercises.service';
import { EntityNotFoundError, Repository } from 'typeorm';
import { GeneratorSchema, IGenerator } from 'exercises/generators';
import z from 'zod';
import { ExerciseHandlerInterface } from './interface';
import { AbstractTranslationGenerator } from 'exercises/generators/abstractTranslation';

export abstract class AbstractTranslationHandler<T extends ExerciseType.TRANSLATE_TO_FOREIGN|ExerciseType.TRANSLATE_TO_NATIVE>
implements HandlerInterface, ExerciseHandlerInterface<z.infer<AbstractTranslationGenerator<T>['schema']>>{

    private readonly CORRECT_ANSWER_TEXT = '✅ Верно!';

    private readonly INCORRECT_ANSWER_TEXT = '❌ Неверно!';

    protected abstract type: T;

    private keys = {
        BACK_BUTTON: '🔙 Назад'
    };

    constructor(
        protected readonly userService: UsersService,
        protected readonly exerciseService: ExercisesService,
        protected readonly generationService: IGenerator<T, GeneratorSchema<T>>,
        protected readonly exerciseRepo: Repository<Exercise<z.infer<AbstractTranslationGenerator<T>['schema']>>>,
        protected readonly bot: BotService
    ){}

    private prepareContext(user: User, exercise_id: number){
        if (!user.context[this.type])
            user.context[this.type] = {exercise_id};
        else
            user.context[this.type]!.exercise_id = exercise_id;
    }

    async handleQuery(query: CallbackQuery, user: User): Promise<boolean> {
        if (query.data === this.keys.BACK_BUTTON){
            if (query.message?.message_id)
                await this.bot.deleteMessage(user.telegram_id, query.message?.message_id);
            this.userService.goBack(user);
            return true;
        }
        await this.bot.answerCallbackQuery(query.id);
        await this.sendExercise(user);
        return false;
    }

    async handleMessage(message: Message, user: User) {
        await this.handleAnswer(message, user);
        return false;
    }

    async sendExercise(user: User, _exercise?: Exercise<z.infer<AbstractTranslationGenerator<T>['schema']>>){
        let exercise = _exercise;

        if (user.context[this.type]?.exercise_id){
            exercise = await this.exerciseRepo.findOneOrFail({
                where: {
                    id: user.context[this.type]!.exercise_id,
                    user_id: user.id
                },
                relations: {
                    questions: true
                }
            });
        }
        if (!exercise){
            await this.bot.sendMessage(user, 'Хм, сейчас что-нибудь придумаю (⊙﹏⊙)');
            await this.bot.sendChatAction(user.telegram_id, 'typing');
            const typingInterval = setInterval(() => this.bot.sendChatAction(user.telegram_id, 'typing'), 5_000);
            try {
                exercise = await this.exerciseService.generateExercise(user, {type: [this.type]}) as Exercise<z.infer<AbstractTranslationGenerator<T>['schema']>>;
            } catch (e: any){
                console.error('Error generating exercise:', e);
                await this.bot.sendMessage(user, 'Упс, кажется что-то пошло не так. Попробуем ещё раз?');
                this.userService.goBack(user);
                return true;
            }
            clearInterval(typingInterval);
        }
        this.prepareContext(user, exercise.id);

        const message = this.exerciseToMessage(exercise);
        await this.bot.sendMessage(user.telegram_id, message.text, message.options);
        exercise.status = ExerciseStatus.ASKED;
        await exercise.save();
        return false;
    }

    private exerciseToMessage(
        exercise: Exercise<z.infer<AbstractTranslationGenerator<T>['schema']>>
    ): {text: string, options?: SendMessageOptions}{
        return {
            text: exercise.generated.question,
            options: {
                parse_mode: 'HTML'
            }
        };
    }

    private async handleAnswer(message: Message, user: User): Promise<boolean> {
        let finished;
        try {
            if (!user.context[this.type]) throw new Error(this.type + ' context is not set for user');
            if (!user.context[this.type]!.exercise_id) return this.sendExercise(user);
            finished = await this.generationService.handleAnswer({exercise_id: user.context[this.type]!.exercise_id!}, {answer: message.text});
        } catch (e: any){
            if (e instanceof EntityNotFoundError){
                await this.bot.sendMessage(user.telegram_id, 'Упс, кажется я не нашёл такого вопроса:(. Попробуем ещё раз?', {
                    reply_markup: {
                        inline_keyboard: [
                            [{text: 'Да', callback_data: 'repeat'}],
                            [{text: this.keys.BACK_BUTTON, callback_data: this.keys.BACK_BUTTON}]
                        ]
                    }
                });
                return false;
            } else {
                throw e;
            }
        }
        delete user.context[this.type]!.exercise_id;
        await this.bot.sendMessage(user.telegram_id, `${finished.is_correct ? this.CORRECT_ANSWER_TEXT : this.INCORRECT_ANSWER_TEXT}
Хочешь сделать ещё одно задание?`, {
            reply_markup: {
                inline_keyboard: [
                    [{text: 'Да', callback_data: 'repeat'}],
                    [{text: this.keys.BACK_BUTTON, callback_data: this.keys.BACK_BUTTON}]
                ]
            }
        });
        return false;
    }
}