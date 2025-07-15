import { Module } from '@nestjs/common';
import { HandlerService } from './handler.service';
import { BotController } from './bot.controller';
import { MenuHandler } from './handlers/menuHandler.service';
import { VocabularyHandler } from './handlers/vocabulary/vocabularyHandler.service';
import { AddWordHandler, RemoveWordHandler } from './handlers';
import { BotService } from './bot.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message, User, Word } from '@kolya-quizlet/entity';
import { UserModule } from 'user/user.module';
import { ExercisesModule } from 'exercises/exercises.module';
import { ExerciseHandler } from './handlers/exerciseHandler.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([Word, User, Message]),
        UserModule,
        ExercisesModule
    ],
    providers: [
        AddWordHandler,
        BotService,
        ExerciseHandler,
        HandlerService,
        MenuHandler,
        RemoveWordHandler,
        VocabularyHandler,
    ],
    controllers: [BotController]
})
export class BotModule {}
