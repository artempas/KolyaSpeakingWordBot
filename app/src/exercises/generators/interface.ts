import { Exercise, User, Word } from '@kolya-quizlet/entity';
import z from 'zod';
import { AbstractHandler } from './generator.decorator';

type staticFields = Pick<AbstractHandler, 'maxWords'|'minWords'|'requires_translation'>;

export abstract class AbstractStaticGetter implements staticFields{
    get minWords(){
        return (this.constructor as AbstractHandler).minWords;
    }

    get maxWords(){
        return (this.constructor as AbstractHandler).maxWords;
    }

    get requires_translation(){
        return (this.constructor as AbstractHandler).requires_translation;
    }

}

export interface IGenerator<Z extends z.Schema> extends staticFields{
    schema: Z;
    generateExercise(user: User, words: Word[]): Promise<Exercise<z.infer<Z>>>;
    handleAnswer(
        question_id: number,
        args: {is_correct?: boolean, option_idx?: number}
    ): Promise<{finished: false, is_correct: boolean}|{finished: true, total: number, correct: number, is_correct: boolean}>;
}