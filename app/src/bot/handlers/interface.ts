import { User } from '@kolya-quizlet/entity';
import { ExtendedCallbackQuery, ExtendedMessage } from '../types';


export interface HandlerInterface {
    handleMessage(message: ExtendedMessage, user: User): Promise<boolean>
    handleQuery(message: ExtendedCallbackQuery, user: User): Promise<boolean>
}