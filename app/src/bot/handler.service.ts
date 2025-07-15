import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CallbackQuery, Message as TelegramMessage, Metadata} from 'node-telegram-bot-api';
import { AddWordHandler, MenuHandler, RemoveWordHandler, VocabularyHandler } from './handlers';
import { ExtendedCallbackQuery, ExtendedMessage } from './types';
import { BotService } from './bot.service';
import { User, Message, MessageDirection } from '@kolya-quizlet/entity';
import { UserService } from 'user/user.service';
import { handlingMap } from './handler.decorator';
import { ExerciseHandler } from './handlers/exerciseHandler.service';

@Injectable()
export class HandlerService {

    private readonly HANDLING_MAP = handlingMap;

    constructor(
        private readonly bot: BotService,
        private readonly menuHandler: MenuHandler,
        private readonly vocabularyHandler: VocabularyHandler,
        private readonly addWordHandler: AddWordHandler,
        private readonly removeWordHandler: RemoveWordHandler,
        private readonly exerciseHandler: ExerciseHandler,

        @Inject() private readonly userService: UserService,

        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(Message)
        private readonly messageRepository: Repository<Message>,
    ){}

    async handleMessage(_message: TelegramMessage, metadata: Metadata){
        const user = await this.upsertUser({
            telegram_id: _message.chat.id,
            username: _message.chat.username,
            first_name: _message.chat.first_name,
            last_name: _message.chat.last_name,
        });

        await this.createMessage({
            telegram_id: String(_message.message_id),
            content: {type: 'Message', ..._message},
            user_id: user.id,
            direction: MessageDirection.IN
        });

        const message: ExtendedMessage = {
            ..._message,
            is_deleted: false
        };
        await this.execute(user, message);
    }

    private async execute(user: User, event: ExtendedMessage|ExtendedCallbackQuery){
        let continue_execution = true;
        while (continue_execution){
            const handler = this.HANDLING_MAP.get(this.userService.getCurrentPosition(user));
            if (!handler) throw new Error(`No handler for position ${this.userService.getCurrentPosition(user)}`);
            let executed = false;
            for (const handler_instance in this){
                if (!(this[handler_instance] instanceof handler)) continue;
                if (this.isMessage(event)){
                    continue_execution = await this[handler_instance].handleMessage(event, user);
                    event.text = '';
                } else {
                    continue_execution = await this[handler_instance].handleQuery(event, user);
                    event.data = '';
                }
                executed = true;
                break;
            }
            if (!executed) throw new Error(`No handler instance found for position ${this.userService.getCurrentPosition(user)}`);
        }
        await this.userRepository.save(user);
    }

    private isMessage(e: ExtendedCallbackQuery|ExtendedMessage): e is ExtendedMessage{
        return 'message_id' in e;
    }

    async handleQuery(
        _query: CallbackQuery
    ){
        const user = await this.upsertUser({
            telegram_id: _query.from.id,
            username: _query.from.username,
            first_name: _query.from.first_name,
            last_name: _query.from.last_name,
        });

        await this.createMessage({
            telegram_id: _query.id,
            content: {type: 'CallbackQuery', ..._query},
            user_id: user.id,
            direction: MessageDirection.IN
        });

        const query: ExtendedCallbackQuery = {
            ..._query,
            is_answered: false,
            message: _query.message ? {
                ..._query.message,
                is_deleted: false
            } : undefined
        };

        await this.execute(user, query);

        await this.userRepository.save(user);

        await this.bot.answerCallbackQueryIfNotAnswered(query, {text: _query.data});
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
