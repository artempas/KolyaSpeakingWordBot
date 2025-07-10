/* eslint-disable @typescript-eslint/no-namespace */
import { Position } from '@prisma/client';
import { CallbackQuery, Message as TelegramMessage } from 'node-telegram-bot-api';
import { AddWordContextData, RemoveWordContextData } from './bot/handlers';


export {};

export type ContextData<P extends Position> =
      P extends 'ADD_WORD' ? AddWordContextData
    : P extends 'REMOVE_WORD' ? RemoveWordContextData
    : Record<never, never>;

declare global{
    namespace PrismaJson{
        type UserContext = {
            [K in Position]?: ContextData<K>
        }
        type Message = {type: 'Message'}&TelegramMessage|{type: 'CallbackQuery'} & CallbackQuery
    }
}