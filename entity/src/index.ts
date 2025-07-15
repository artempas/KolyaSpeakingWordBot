import { Answer } from './Answer';
import { Exercise } from './Exercise';
import { ExerciseTemplate } from './ExerciseTemplate';
import { Message } from './Message';
import { User } from './User';
import { Word } from './Word';

export * from './Answer'
export * from './Message';
export * from './User';
export * from './Word';
export * from './ExerciseTemplate';
export * from './Exercise';
export * from './enums';

export const EntityList = [
    Answer,
    Exercise,
    ExerciseTemplate,
    Message,
    User,
    Word,
];