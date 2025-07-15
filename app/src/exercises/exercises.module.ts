import { Inject, Module } from '@nestjs/common';
import { ExercisesService } from './exercises.service';
import { LlmModule } from 'src/llm/llm.module';
import { LlmService } from 'src/llm/llm.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Exercise, ExerciseStatus, ExerciseTemplate, ExerciseType, User, Word } from '@kolya-quizlet/entity';
import { Brackets, Not, Repository } from 'typeorm';
import { Answer } from '@kolya-quizlet/entity/dist/Answer';

@Module({
    providers: [ExercisesService],
    imports: [LlmModule],
    exports: [ExercisesService]
})
export class ExercisesModule {}