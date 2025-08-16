import { ExerciseType } from '@kolya-quizlet/entity';
import { AITextGenerationService } from './aiText.service';
import { TranslateToForeignGenerationService } from './translateToForeign.service';
import { TranslationMatchGenerationService } from './translationMatch.service';
import { TranslateToNativeGenerationService } from './translateToNative.service';
import { IGenerator } from './interface';
import z from 'zod';

export * from './aiText.service';
export * from './interface';
export * from './translateToForeign.service';
export * from './translationMatch.service';
export * from './translateToNative.service';


export type GeneratorSchema<
    T extends ExerciseType,
    Generators extends IGenerator<ExerciseType, z.Schema>[] = [
        AITextGenerationService,
        TranslateToForeignGenerationService,
        TranslationMatchGenerationService,
        TranslateToNativeGenerationService
    ]
> = Generators extends [infer U, ...infer Rest]
    ? U extends IGenerator<T, infer Z>
        ? Z
        : GeneratorSchema<T, Rest extends IGenerator<ExerciseType, z.Schema>[] ? Rest : []>
    : never;
