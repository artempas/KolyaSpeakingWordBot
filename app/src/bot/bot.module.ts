import { Module } from '@nestjs/common';
import { HandlerService } from './handler.service';
import { BotController } from './bot.controller';
import { AddWordHandler, ExerciseHandler, MenuHandler, MultipleChoiceHandler, RemoveWordHandler, SettingsHandler, VocabularyHandler } from './handlers';
import { BotService } from './bot.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExerciseTemplate, Message, User, Word } from '@kolya-quizlet/entity';
import { UsersModule } from 'users/users.module';
import { ExercisesModule } from 'exercises/exercises.module';
import { LlmModule } from 'llm/llm.module';
import { WordsModule } from 'words/words.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([ExerciseTemplate, Word, User, Message]),
        UsersModule,
        ExercisesModule,
        LlmModule,
        WordsModule
    ],
    providers: [
        AddWordHandler,
        BotService,
        ExerciseHandler,
        HandlerService,
        MenuHandler,
        MultipleChoiceHandler,
        RemoveWordHandler,
        SettingsHandler,
        VocabularyHandler,
    ],
    controllers: [BotController]
})
export class BotModule {}
