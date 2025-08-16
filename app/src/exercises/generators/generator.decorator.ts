import { ExerciseType, UserLevel } from '@kolya-quizlet/entity';
import z from 'zod';

export const generatorMap = new Map<ExerciseType, AbstractGenerator>();

export interface AbstractGenerator<T extends ExerciseType = ExerciseType, Z extends z.Schema = z.Schema> {
    new(...args: any[]): any;
    schema: Z;
    minWords: number;
    maxWords: number;
    requires_translation: boolean;
    forType: T;
    forLevel: UserLevel[];
    display_name: string;
}

export function ExerciseGenerator() {
    return <U extends AbstractGenerator>(target: U) => {
        if (generatorMap.get(target.forType)){
            throw new Error(`Duplicate exercise Generator(${target.name}) for type: ${target.forType}`);
        }
        generatorMap.set(target.forType, target);
    };
}

