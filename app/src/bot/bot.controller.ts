import { Controller } from '@nestjs/common';
import { HandlerService } from './handler.service';
import { BotService } from './bot.service';
import { CallbackQuery, Message, Metadata } from 'node-telegram-bot-api';
import TryCatchLogger from 'src/decorators/tryCatch.decorator';

@Controller('bot')
export class BotController {
    constructor(
        private readonly botService: HandlerService,
        private readonly bot: BotService
    ){
        this.bot.on('message', this.handleMessage.bind(this));
        this.bot.on('callback_query', this.handleQuery.bind(this));
        this.bot.on('polling_error', (e) => console.error(e));
    }

    @TryCatchLogger()
    handleMessage(
        message: Message,
        metadata: Metadata
    ){
        return this.botService.handleMessage(message, metadata);
    }

    @TryCatchLogger()
    handleQuery(
        message: CallbackQuery
    ){
        return this.botService.handleQuery(message);
    }
}
