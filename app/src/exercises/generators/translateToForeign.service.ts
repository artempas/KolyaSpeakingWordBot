import { Injectable } from '@nestjs/common';
import { AbstractStaticGetter, IGenerator } from './interface';
import { Exercise, ExerciseStatus, ExerciseType, Question, User, Word } from '@kolya-quizlet/entity';
import z from 'zod';
import { ExerciseGenerator } from './generator.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

@Injectable()
@ExerciseGenerator(ExerciseType.TRANSLATE_TO_FOREIGN)
export class TranslateToForeignGenerationService extends AbstractStaticGetter implements IGenerator<TranslateToForeignGenerationService['schema']>{

    schema = z.object({
        question: z.string(),
        answer: z.string(),
        word_id: z.number()
    });

    static minWords = 1;

    static requires_translation = true;

    static maxWords = 1;

    constructor(
        @InjectRepository(Question) private questionRepo: Repository<Question>,
        @InjectRepository(Exercise) private exerciseRepo: Repository<Exercise>
    ){ super(); }

    private getQuestion(word: string): string{
        return `Как по-английски будет <b>${word}</b>?`;
    }

    generateExercise(user: User, words: Word[]){

        const word = words[0];

        if (!word) throw new Error('Words array must not be empty');
        if (!word.translation) throw new Error('Word must have translation');

        const newExercise = new Exercise<z.infer<typeof this.schema>>();
        newExercise.type = ExerciseType.TRANSLATE_TO_FOREIGN;
        newExercise.user = user;
        newExercise.generated = {
            question: this.getQuestion(word.translation),
            answer: word.word,
            word_id: words[0].id,
        };
        newExercise.status = ExerciseStatus.GENERATED;
        newExercise.questions = [{
            word: word
        } as Question];

        return newExercise.save({reload: true});
    }

    async handleAnswer(
        question_id: number,
        args: {is_correct?: boolean, option_idx?: number}
    ): Promise<{finished: false, is_correct: boolean}|{finished: true, total: number, correct: number, is_correct: boolean}> {
        const question = await this.questionRepo.findOneOrFail({ where: { id: question_id }, relations: {exercise: true} });

        if (args.is_correct !== undefined)
            question.is_correct = args.is_correct;
        else if (args.option_idx !== undefined){
            question.is_correct = question.exercise.generated.correct_idx === args.option_idx;
        } else throw new Error('Either is_correct or option_idx must be defined');

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