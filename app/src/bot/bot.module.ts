import { Module } from '@nestjs/common';
import { HandlerService } from './handler.service';
import { BotController } from './bot.controller';
import { AddWordHandler, ExerciseHandler, MenuHandler, RemoveWordHandler, SettingsHandler, VocabularyHandler } from './handlers';
import { BotService } from './bot.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message, User, Word } from '@kolya-quizlet/entity';
import { UserModule } from 'user/user.module';
import { ExercisesModule } from 'exercises/exercises.module';

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
        SettingsHandler,
        VocabularyHandler,
    ],
    controllers: [BotController]
})
export class BotModule {}
