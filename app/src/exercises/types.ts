import { Exercise, ExerciseType } from '@kolya-quizlet/entity';

export type ExerciseFromTypeArray<T extends ExerciseType[]> =
  T extends Array<infer U>
	? U extends ExerciseType
	  ? Exercise<U>
	  : never
	: never;