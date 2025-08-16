import { Inject, Injectable } from '@nestjs/common';
import { BotService } from '../../bot.service';
import { Exercise, ExerciseType, Position } from '@kolya-quizlet/entity';
import { UsersService } from 'users/users.service';
import { PositionHandler } from '../../handler.decorator';
import { ExercisesService } from 'exercises/exercises.service';
import { Repository } from 'typeorm';
import { GeneratorSchema, TranslateToForeignGenerationService } from 'exercises/generators';
import z from 'zod';
import { InjectRepository } from '@nestjs/typeorm';
import { AbstractTranslationHandler } from './abstractTranslationHandler';


@Injectable()
@PositionHandler(Position.TRANSLATE_TO_FOREIGN)
export class TranslateToForeignHandler extends AbstractTranslationHandler<ExerciseType.TRANSLATE_TO_FOREIGN> {

    protected type: ExerciseType.TRANSLATE_TO_FOREIGN = ExerciseType.TRANSLATE_TO_FOREIGN;

    constructor(
        @Inject()
        protected readonly userService: UsersService,
        @Inject()
        protected readonly exerciseService: ExercisesService,
        @Inject()
        protected readonly generationService: TranslateToForeignGenerationService,
        @InjectRepository(Exercise)
        protected readonly exerciseRepo: Repository<Exercise<z.infer<GeneratorSchema<ExerciseType.TRANSLATE_TO_FOREIGN>>>>,
        protected readonly bot: BotService
    ){ super(userService, exerciseService, generationService, exerciseRepo, bot); }
}