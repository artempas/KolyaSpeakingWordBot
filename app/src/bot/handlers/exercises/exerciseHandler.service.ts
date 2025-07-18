import { Inject, Injectable } from '@nestjs/common';
import { CallbackQuery, Message } from 'node-telegram-bot-api';
import { HandlerInterface } from '../interface';
import { BotService } from '../../bot.service';
import { Exercise, ExerciseTemplate, ExerciseType, Position, User } from '@kolya-quizlet/entity';
import { UsersService } from 'users/users.service';
import { PositionHandler } from '../../handler.decorator';
import { ExercisesService } from 'exercises/exercises.service';
import { ArrayContains, EntityNotFoundError, Repository } from 'typeorm';
import { MultipleChoiceHandler } from './multipleChoiceHandler.service';
import { ExtendedMessage } from 'bot/types';
import { InjectRepository } from '@nestjs/typeorm';
import { buildKeyboard } from 'bot/utils';


@Injectable()
@PositionHandler(Position.EXERCISE)
export class ExerciseHandler implements HandlerInterface{

    constructor(
        @Inject() private readonly userService: UsersService,
        @Inject() private readonly exerciseService: ExercisesService,
        @InjectRepository(ExerciseTemplate) private readonly exerciseTemplateRepo: Repository<ExerciseTemplate<ExerciseType>>,
        private readonly multipleChoiceHandler: MultipleChoiceHandler,
        private readonly bot: BotService
    ){}

    async handleQuery(query: CallbackQuery, user: User): Promise<boolean> {
        switch (query.data){
        case 'Случайное 🪄':
            return await this.sendExercise(user);
        case 'Назад 🔙':
            this.userService.goBack(user);
            delete user.context.EXERCISE;
            return true;
        default: {
            const parsed = this.parseQuery(query.data);
            if (parsed){
                return await this.sendExercise(user, parsed.exerciseId);
            }
            this.sendMenu(user);
            return false;
        }
        }
    }

    private parseQuery(data: string|undefined): false|{exerciseId: number} {
        if (!data) return false;
        if (!/exerciseId:(\d+)/.test(data)) return false;
        const parsed = data.split(':')[1];
        return {exerciseId: +parsed};
    }

    async handleMessage(message: ExtendedMessage, user: User): Promise<boolean> {
        await this.sendMenu(user);
        return false;
    }

    private async sendMenu(user: User): Promise<Message>{
        const template = await this.exerciseTemplateRepo.find({
            where: {
                available_levels: ArrayContains([user.level])
            },
            select: ['id', 'name'],
            order: {name: 'desc'}
        });
        return await this.bot.sendMessage(user.telegram_id, 'Выбери тип задания', {
            reply_markup: {
                inline_keyboard: [
                    [{text: 'Случайное 🪄', callback_data: 'Случайное 🪄'}],
                    ...buildKeyboard(
                        template.map(template_type => ({text: template_type.name, callback_data: `exerciseId:${template_type.id}`})),
                        {columns: 2, back_button: {text: 'Назад 🔙', callback_data: 'Назад 🔙'}}
                    )
                ]
            }
        });
    }

    private async sendExercise(user: User, id?: number){
        await this.bot.sendMessage(user, 'Хм, сейчас что-нибудь придумаю (⊙﹏⊙)');
        let exercise: Exercise<ExerciseType>;
        try {
            exercise = await this.exerciseService.getNextExercise(user, {id});
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
        switch (exercise.template?.type){
        case ExerciseType.MULTIPLE_CHOICE:
        case ExerciseType.TEXT_WITH_MULTIPLE_CHOICE:
            this.userService.goTo(user, Position.MULTIPLE_CHOICE);
            return await this.multipleChoiceHandler.sendExercise(
                user,
                exercise as Exercise<ExerciseType.MULTIPLE_CHOICE>|Exercise<ExerciseType.TEXT_WITH_MULTIPLE_CHOICE>
            );
        default:
            throw new Error('Not implemented');
        }
    }
}