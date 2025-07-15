import { Module } from '@nestjs/common';
import { ExercisesService } from './exercises.service';
import { LlmModule } from 'src/llm/llm.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Exercise, ExerciseTemplate, Question, Word } from '@kolya-quizlet/entity';

@Module({
    providers: [ExercisesService],
    imports: [
        LlmModule,
        TypeOrmModule.forFeature([ExerciseTemplate, Exercise, Word, Question])
    ],
    exports: [ExercisesService]
})
export class ExercisesModule {}