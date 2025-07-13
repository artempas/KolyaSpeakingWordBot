import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CallbackQuery, Message as TelegramMessage, Metadata} from 'node-telegram-bot-api';
import { AddWordHandler, HandlerInterface, MenuHandler, RemoveWordHandler, VocabularyHandler } from './handlers';
import { ExtendedCallbackQuery, ExtendedMessage } from './types';
import { BotService } from './bot.service';
import { User, Message, Word, Position, MessageDirection } from '@kolya-quizlet/entity';

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
        private readonly menuHandler: MenuHandler,
        private readonly vocabularyHandler: VocabularyHandler,
        private readonly addWordHandler: AddWordHandler,
        private readonly removeWordHandler: RemoveWordHandler,

        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(Message)
        private readonly messageRepository: Repository<Message>,
        @InjectRepository(Word)
        private readonly wordRepository: Repository<Word>,
    ){}

    async handleMessage(message: TelegramMessage, metadata: Metadata){
        const user = await this.upsertUser({
            telegram_id: message.chat.id,
            username: message.chat.username,
            first_name: message.chat.first_name,
            last_name: message.chat.last_name,
        });

        await this.createMessage({
            telegram_id: String(message.message_id),
            content: {type: 'Message', ...message},
            user_id: user.id,
            direction: MessageDirection.IN
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
        await this.userRepository.save(user);
    }

    async handleQuery(
        query: CallbackQuery
    ){
        const user = await this.upsertUser({
            telegram_id: query.from.id,
            username: query.from.username,
            first_name: query.from.first_name,
            last_name: query.from.last_name,
        });

        await this.createMessage({
            telegram_id: query.id,
            content: {type: 'CallbackQuery', ...query},
            user_id: user.id,
            direction: MessageDirection.IN
        });

        const _query: ExtendedCallbackQuery = {
            ...query,
            is_answered: false,
            message: query.message ? {
                ...query.message,
                is_deleted: false
            } : undefined
        };

        let continue_execution = true;
        while (continue_execution){
            continue_execution = await this.HANDLING_MAP[user.position[user.position.length - 1]].handleQuery(_query, user);
            _query.data = '';
        }
        await this.userRepository.save(user);

        await this.bot.answerCallbackQueryIfNotAnswered(_query, {text: query.data});
    }

    async upsertUser(userData: Partial<User>): Promise<User> {
        let user = await this.userRepository.findOne({ where: { telegram_id: userData.telegram_id } });
        if (user) {
            Object.assign(user, userData);
        } else {
            user = this.userRepository.create(userData);
        }
        return this.userRepository.save(user);
    }

    async createMessage(messageData: Partial<Message>): Promise<Message> {
        const message = this.messageRepository.create(messageData);
        return this.messageRepository.save(message);
    }

    async updateUser(userId: number, updateData: Partial<User>): Promise<User> {
        let user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) throw new Error('User not found');
        Object.assign(user, updateData);
        return this.userRepository.save(user);
    }
}
