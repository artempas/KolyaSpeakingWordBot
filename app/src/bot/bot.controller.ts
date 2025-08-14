import { Body, Controller, ForbiddenException, HttpCode, Param, Post } from '@nestjs/common';
import { HandlerService } from './handler.service';
import { BotService } from './bot.service';
import { CallbackQuery, Message, Metadata, Update } from 'node-telegram-bot-api';
import TryCatchLogger from 'decorators/tryCatch.decorator';

@Controller('bot')
export class BotController {
    constructor(
        private readonly botService: HandlerService,
        private readonly bot: BotService
    ){
        this.bot.on('message', this.handleMessage.bind(this));
        this.bot.on('callback_query', this.handleQuery.bind(this));
        this.bot.on('polling_error', (e) => console.error(e));
        this.bot.on('webhook_error', (e) => console.error(e));
    }

    @Post('/:hashed_token')
    @HttpCode(200)
    async handleWebhook(
        @Param('hashed_token') hashed_token: string,
        @Body() update: Update
    ){
        if (hashed_token !== this.bot.webhookSecret){
            throw new ForbiddenException();
        }
        this.bot.processUpdate(update);
        return 'OK';
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
