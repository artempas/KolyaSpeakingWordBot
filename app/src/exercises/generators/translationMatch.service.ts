import { Exercise, ExerciseStatus, ExerciseType, Question, User, Word } from '@kolya-quizlet/entity';
import { Injectable } from '@nestjs/common';
import z from 'zod';
import { AbstractStaticGetter, IGenerator } from './interface';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { ExerciseGenerator } from './generator.decorator';

@Injectable()
@ExerciseGenerator(ExerciseType.MATCH_TRANSLATION)
export class TranslationMatchGenerationService extends AbstractStaticGetter implements IGenerator<TranslationMatchGenerationService['schema']>{

    private question_text = 'Сопоставь перевод со словом';

    static minWords = 4;

    static maxWords = 7;

    static requires_translation = true;

    constructor(
            @InjectRepository(Question) private questionRepo: Repository<Question>,
            @InjectRepository(Exercise) private exerciseRepo: Repository<Exercise>
    ){ super(); }

    generateExercise(user: User, words: Word[]) {

        if (words.some(word => !word.translation)) throw new Error('All words should have translation');

        const newExercise = new Exercise<z.infer<typeof this.schema>>();
        newExercise.type = ExerciseType.MATCH_TRANSLATION;
        newExercise.user_id = user.id;
        newExercise.generated = {
            question: this.question_text,
            options: words.map(word => ({
                a: word.word,
                b: word.translation!,
                word_id: word.id
            }))
        };
        newExercise.status = ExerciseStatus.GENERATED;
        newExercise.questions = words.map((w) => ({
            word: w,
        } as Question));
        return newExercise.save({reload: true});
    }

    schema = z.object({
        question: z.string(),
        options: z.array(z.object({
            a: z.string(),
            b: z.string(),
            word_id: z.number()
        }))
    });

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