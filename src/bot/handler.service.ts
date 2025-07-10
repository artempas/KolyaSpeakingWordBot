import { Injectable } from '@nestjs/common';
import { Position } from '@prisma/client';
import { CallbackQuery, Message, Metadata } from 'node-telegram-bot-api';
import { PrismaService } from 'src/prisma/prisma.service';
import { AddWordHandler, HandlerInterface, MenuHandler, RemoveWordHandler, VocabularyHandler } from './handlers';
import { ExtendedCallbackQuery, ExtendedMessage } from './types';
import { BotService } from './bot.service';

@Injectable()
export class HandlerService {

    private readonly HANDLING_MAP = {
        MENU: this.menuHandler,
        VOCABULARY: this.vocabularyHandler,
        ADD_WORD: this.addWordHandler,
        REMOVE_WORD: this.removeWordHandler
    } as const satisfies Record<Position, HandlerInterface>;

    constructor(
        private readonly bot: BotService,
        private readonly prisma: PrismaService,
        private readonly menuHandler: MenuHandler,
        private readonly vocabularyHandler: VocabularyHandler,
        private readonly addWordHandler: AddWordHandler,
        private readonly removeWordHandler: RemoveWordHandler
    ){}

    async handleMessage(message: Message, metadata: Metadata){
        const user = await this.prisma.user.upsert({
            where: {telegram_id: message.chat.id},
            create: {
                telegram_id: message.chat.id,
                username: message.chat.username,
                first_name: message.chat.first_name,
                last_name: message.chat.last_name,
                context: {}
            },
            update: {
                username: message.chat.username,
                first_name: message.chat.first_name,
                last_name: message.chat.last_name,
            }
        });

        await this.prisma.message.create({
            data: {
                telegram_id: String(message.message_id),
                content: {type: 'Message', ...message},
                user_id: user.id
            }
        });

        const _message: ExtendedMessage = {
            ...message,
            is_deleted: false
        };

        let continue_execution = true;
        while (continue_execution){
            continue_execution = await this.HANDLING_MAP[user.position[user.position.length - 1]].handleMessage(_message, user);
            _message.text = '';
        }
        await this.prisma.user.update({
            where: { telegram_id: user.telegram_id },
            data: { position: user.position, context: user.context }
        });
    }

    async handleQuery(
        query: CallbackQuery,
        metadata: Metadata
    ){
        const user = await this.prisma.user.upsert({
            where: {telegram_id: query.from.id},
            create: {
                telegram_id: query.from.id,
                username: query.from.username,
                first_name: query.from.first_name,
                last_name: query.from.last_name,
                context: {}
            },
            update: {
                username: query.from.username,
                first_name: query.from.first_name,
                last_name: query.from.last_name,
            }
        });

        await this.prisma.message.create({
            data: {
                telegram_id: query.id,
                content: {type: 'CallbackQuery', ...query},
                user_id: user.id
            }
        });

        const _query: ExtendedCallbackQuery = {
            ...query,
            is_answered: false,
            message: {
                ...query.message,
                is_deleted: false
            }
        };

        let continue_execution = true;
        while (continue_execution){
            continue_execution = await this.HANDLING_MAP[user.position[user.position.length - 1]].handleQuery(_query, user);
            _query.data = '';
        }
        await this.prisma.user.update({
            where: { telegram_id: user.telegram_id },
            data: { position: user.position, context: user.context }
        });

        await this.bot.answerCallbackQueryIfNotAnswered(_query, {text: query.data});
    }
}
