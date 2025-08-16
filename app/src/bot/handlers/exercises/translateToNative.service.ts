import { Inject, Injectable } from '@nestjs/common';
import { BotService } from '../../bot.service';
import { Exercise, ExerciseType, Position } from '@kolya-quizlet/entity';
import { UsersService } from 'users/users.service';
import { PositionHandler } from '../../handler.decorator';
import { ExercisesService } from 'exercises/exercises.service';
import { GeneratorSchema, TranslateToNativeGenerationService } from 'exercises/generators';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import z from 'zod';
import { AbstractTranslationHandler } from './abstractTranslationHandler';


@Injectable()
@PositionHandler(Position.TRANSLATE_TO_NATIVE)
export class TranslateToNativeHandler extends AbstractTranslationHandler<ExerciseType.TRANSLATE_TO_NATIVE>{


    protected type: ExerciseType.TRANSLATE_TO_NATIVE = ExerciseType.TRANSLATE_TO_NATIVE;

    constructor(
        @Inject() protected readonly userService: UsersService,
        @Inject() protected readonly exerciseService: ExercisesService,
        @Inject() protected readonly generationService: TranslateToNativeGenerationService,
        @InjectRepository(Exercise) protected readonly exerciseRepo: Repository<Exercise<z.infer<GeneratorSchema<ExerciseType.TRANSLATE_TO_NATIVE>>>>,
        protected readonly bot: BotService
    ){ super(userService, exerciseService, generationService, exerciseRepo, bot); }
}