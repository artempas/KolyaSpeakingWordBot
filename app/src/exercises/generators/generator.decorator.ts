import { ExerciseType } from '@kolya-quizlet/entity';
import { IGenerator } from './interface';
import z from 'zod';

const handlingMap = new Map<ExerciseType, AbstractHandler>();

export interface AbstractHandler {
    new(...args: any[]): IGenerator<z.Schema>;
    minWords: number;
    maxWords: number;
    requires_translation: boolean;
}

export function ExerciseGenerator(type: ExerciseType) {
    return <U extends AbstractHandler>(target: U) => {
        if (handlingMap.get(type)){
            throw new Error(`Duplicate exercise Generator(${target.name}) for type: ${type}`);
        }
        handlingMap.set(type, target);
    };
}

export { handlingMap };