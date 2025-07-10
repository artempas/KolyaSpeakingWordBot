import { Module } from '@nestjs/common';
import { HandlerService } from './handler.service';
import { BotController } from './bot.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { MenuHandler } from './handlers/menuHandler.service';
import { VocabularyHandler } from './handlers/vocabulary/vocabularyHandler.service';
import { AddWordHandler, RemoveWordHandler } from './handlers';
import { BotService } from './bot.service';

@Module({
    imports: [PrismaModule],
    providers: [
        HandlerService,
        MenuHandler,
        VocabularyHandler,
        AddWordHandler,
        RemoveWordHandler,
        BotService
    ],
    controllers: [BotController]
})
export class BotModule {}
