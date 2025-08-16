import { Exercise, ExerciseType, User, Word } from '@kolya-quizlet/entity';
import z from 'zod';
import { AbstractGenerator } from './generator.decorator';

type staticFields<T extends ExerciseType, Z extends z.Schema> = Pick<AbstractGenerator<T, Z>, 'maxWords'|'minWords'|'requires_translation'|'forType'|'schema'>;

export abstract class AbstractStaticGetter<T extends ExerciseType, Z extends z.Schema> implements staticFields<T, Z>{
    get minWords(){
        return (this.constructor as AbstractGenerator<T, Z>).minWords;
    }

    get maxWords(){
        return (this.constructor as AbstractGenerator<T, Z>).maxWords;
    }

    get requires_translation(){
        return (this.constructor as AbstractGenerator<T, Z>).requires_translation;
    }

    get forType(){
        return (this.constructor as AbstractGenerator<T, Z>).forType;
    }

    get schema(){
        return (this.constructor as AbstractGenerator<T, Z>).schema;
    }

}

export interface IGenerator<T extends ExerciseType, Z extends z.Schema> extends staticFields<T, Z>{
    schema: Z;
    generateExercise(user: User, words: Word[]): Promise<Exercise<z.infer<Z>>>;
    handleAnswer(
        search_options: {
            exercise_id: number,
            word_id?: number,
        } | {question_id: number},
        args: {is_correct?: boolean, option_idx?: number, answer?: string}
    ): Promise<{finished: false, is_correct: boolean}|{finished: true, total: number, correct: number, is_correct: boolean}>
}