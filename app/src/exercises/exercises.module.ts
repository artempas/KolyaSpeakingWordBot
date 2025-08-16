import { Module } from '@nestjs/common';
import { ExercisesService } from './exercises.service';
import { LlmModule } from 'llm/llm.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Exercise, Question, Word } from '@kolya-quizlet/entity';
import { AITextGenerationService, TranslateToForeignGenerationService, TranslateToNativeGenerationService, TranslationMatchGenerationService } from './generators';

@Module({
    providers: [
        ExercisesService,
        AITextGenerationService,
        TranslateToForeignGenerationService,
        TranslateToNativeGenerationService,
        TranslationMatchGenerationService
    ],
    imports: [
        LlmModule,
        TypeOrmModule.forFeature([Exercise, Word, Question])
    ],
    exports: [
        ExercisesService,
        AITextGenerationService,
        TranslateToForeignGenerationService,
        TranslateToNativeGenerationService,
        TranslationMatchGenerationService
    ]
})
export class ExercisesModule {}