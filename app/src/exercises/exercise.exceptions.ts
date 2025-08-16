export class NoSuitableExerciseTypeFound extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'NoSuitableExerciseTypeFound';
    }
}
