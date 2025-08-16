import { AbstractStaticGetter, IGenerator } from './interface';
import { Exercise, ExerciseStatus, ExerciseType, Question, User, UserLevel, Word } from '@kolya-quizlet/entity';
import z from 'zod';
import { IsNull, Repository } from 'typeorm';

export type StringLikeKey<E extends Record<string, any>> = {
    [K in keyof E]: E[K] extends (string | null | string[]) ? K : never
}[keyof E];


const schema = z.object({
    question: z.string(),
    answer: z.string(),
    word_id: z.number()
});

export abstract class AbstractTranslationGenerator<T extends ExerciseType.TRANSLATE_TO_FOREIGN|ExerciseType.TRANSLATE_TO_NATIVE>
    extends AbstractStaticGetter<T, typeof schema>
    implements IGenerator<T, typeof schema>{

    static schema = schema;

    static minWords = 1;

    static requires_translation = true;

    static maxWords = 1;

    static forLevel = [UserLevel.A1, UserLevel.A2, UserLevel.B1, UserLevel.B2, UserLevel.C1, UserLevel.C2];

    protected abstract source: StringLikeKey<Word>;

    protected abstract dest: StringLikeKey<Word>;

    constructor(
        protected questionRepo: Repository<Question>,
        protected exerciseRepo: Repository<Exercise>
    ){ super(); }

    protected abstract getQuestion(word: string): string;

    protected getPossibleAnswers(question: Question): string[] {
        const possible_answers = Array.isArray(question.word[this.dest]) ?
            (question.word[this.dest] as unknown as string[])!.map((a) => a.toLowerCase())
            : [question.word[this.dest]!.toLowerCase()];
        return possible_answers;
    }

    protected getSource(word: Word): string {
        const possible_answers = Array.isArray(word[this.source]) ?
            word[this.source]![0]
            : word[this.source]!;
        return possible_answers;
    }

    generateExercise(user: User, words: Word[]){

        const word = words[0];

        if (!word) throw new Error('Words array must not be empty');
        if (!word[this.source] || !word[this.dest]) throw new Error('Word must have ' + this.source + ' and ' + this.dest);

        const newExercise = new Exercise<z.infer<typeof this.schema>>();
        newExercise.type = this.forType;
        newExercise.user = user;
        newExercise.generated = {
            question: this.getQuestion(this.getSource(word)),
            answer: word[this.dest]!,
            word_id: words[0].id,
        };
        newExercise.status = ExerciseStatus.GENERATED;
        newExercise.questions = [{
            word: word
        } as Question<z.infer<typeof this.schema>>];

        return newExercise.save({reload: true});
    }

    async handleAnswer(
        search_options: {
            exercise_id: number,
            word_id?: number,
        } | {question_id: number},
        args: {is_correct?: boolean, answer?: string}
    ): Promise<{finished: false, is_correct: boolean}|{finished: true, total: number, correct: number, is_correct: boolean}> {
        let question;
        if ('question_id' in search_options) {
            question = await this.questionRepo.findOneOrFail({ where: { id: search_options.question_id }, relations: {exercise: true, word: true} });
        } else {
            question = await this.questionRepo.findOneOrFail({ 
                where: { 
                    exercise_id: search_options.exercise_id, 
                    word_id: search_options.word_id 
                }, 
                relations: {exercise: true, word: true} 
            });
        }

        if (args.is_correct !== undefined)
            question.is_correct = args.is_correct;
        else if (args.answer !== undefined){
            question.is_correct = this.getPossibleAnswers(question).includes(args.answer.toLowerCase());
        } else throw new Error('Either is_correct or answer must be defined');

        await this.questionRepo.save(question);

        const finished = !await this.questionRepo.exists({where: {exercise_id: question.exercise_id, is_correct: IsNull()}});

        if (finished) {
            await this.exerciseRepo.update({id: question.exercise_id}, {status: ExerciseStatus.ANSWERED});
            return {
                is_correct: question.is_correct,
                finished: true,
                total: await this.questionRepo.countBy({exercise_id: question.exercise_id}),
                correct: await this.questionRepo.countBy({exercise_id: question.exercise_id, is_correct: true})
            };
        }
        return {finished, is_correct: question.is_correct};
    }
}