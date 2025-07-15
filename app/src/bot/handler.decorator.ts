import { Position } from '@kolya-quizlet/entity';
import { HandlerInterface } from './handlers';

const handlingMap = new Map<Position, { new(...args: any[]): HandlerInterface }>();

export function PositionHandler(position: Position) {
    return <U extends { new(...args: any[]): HandlerInterface }>(target: U) => {
        if (handlingMap.get(position)){
            throw new Error(`Duplicate handler(${target.name}) for position: ${position}`);
        }
        handlingMap.set(position, target);
    };
}

export { handlingMap };