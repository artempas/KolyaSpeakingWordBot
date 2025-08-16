import { Exercise, User } from '@kolya-quizlet/entity';

export interface ExerciseHandlerInterface<T extends Record<any, any> = Record<any, any>> {
    sendExercise(user: User, exercise: Exercise<T>): Promise<boolean>;
}