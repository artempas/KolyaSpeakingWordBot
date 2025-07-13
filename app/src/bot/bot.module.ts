import { Module } from '@nestjs/common';
import { HandlerService } from './handler.service';
import { BotController } from './bot.controller';
import { MenuHandler } from './handlers/menuHandler.service';
import { VocabularyHandler } from './handlers/vocabulary/vocabularyHandler.service';
import { AddWordHandler, RemoveWordHandler } from './handlers';
import { BotService } from './bot.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message, User, Word } from '@kolya-quizlet/entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Word, User, Message])
    ],
    providers: [
        HandlerService,
        MenuHandler,
        VocabularyHandler,
        AddWordHandler,
        RemoveWordHandler,
        BotService,
    ],
    controllers: [BotController]
})
export class BotModule {}
