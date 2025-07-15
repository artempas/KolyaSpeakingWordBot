import { ExerciseTemplate, ExerciseType, Exercise, Word, ExerciseStatus, Answer, User } from '@kolya-quizlet/entity';
import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LlmService } from 'src/llm/llm.service';
import { Repository, Not, Brackets, Any } from 'typeorm';
import * as z from 'zod';

@Injectable()
export class ExercisesService {
     constructor(
        @Inject() private readonly llmService: LlmService,

        @InjectRepository(ExerciseTemplate) private readonly exerciseTemplateRepo: Repository<ExerciseTemplate<ExerciseType>>,
        @InjectRepository(Exercise) private readonly exerciseRepo: Repository<Exercise<ExerciseType>>,
        @InjectRepository(Word) private readonly wordRepo: Repository<Word>
    ){}

    async getNextExercise(user: User): Promise<Exercise<ExerciseType>> {
        const existing_exercise = await this.exerciseRepo.findOne({where: {user_id: user.id, status: Not(ExerciseStatus.ANSWERED)}, order: {created_at: 'asc'}});
        if (existing_exercise) return existing_exercise;
        else return this.generateExercise(user);
    }

    async generateExercise(user: User): Promise<Exercise<ExerciseType>>{
        const user_words_count = await this.wordRepo.count({where: {user_id: user.id}});
        const template = await this.pickTemplate(user, user_words_count);

        const words = await this.pickWords(user, template.max_words);

        const generatedTask = await this.llmService.getStructuredResponse(
            template.prompt,
            template.getSchema(),
            {
                words: words.map(w => w.word).join(','),
                level: user.level
            }
        );
        if (!generatedTask) throw new Error('Unable to generate task');

        const used_string_words = this.getUsedWords(generatedTask, template);

        const used_words = await this.wordRepo.find({
            where: {
                word: Any(used_string_words)
            },
            select: {id: true}
        });

        // Create new exercise with selected template
        const newExercise = this.exerciseRepo.create({
            user_id: user.id,
            template_id: template.id,
            generated: generatedTask,
            status: ExerciseStatus.GENERATED,
            answers: used_words.map(word => ({
                word_id: word.id,
            } as Answer))
        });
        return await this.exerciseRepo.save(newExercise);
    }

    private async pickTemplate(user: User, min_words: number){
        const available_templates = await this.exerciseTemplateRepo.createQueryBuilder('t')
            .leftJoin(Exercise, 'e', 'e.template_id = t.id')
            .addSelect('COUNT(e.id)', 'inverseWeight')
            .where('e.user_id = :user_id', {user_id: user.id})
            .andWhere('t.available_levels @> :user_level', {user_level: user.level})
            .andWhere(
                new Brackets((qb) =>
                    qb.where('t.min_words >= :min_words', {min_words})
                        .orWhere('t.min_words IS NULL'))
            )
            .groupBy('t.id')
            .getRawAndEntities();

        // available_templates.entities contains ExerciseTemplate[]
        // available_templates.raw contains count for each template as exerciseCount

        return this.randomPick(available_templates)[0];
    }

    private async pickWords(user: User, max_count: number){
        const available_words = await this.wordRepo.createQueryBuilder('w')
            .leftJoin(Answer, 'a', 'a.word_id = w.id')
            .addSelect('COUNT(a.id)', 'inverseWeight')
            .where('w.user_id = :user_id', {user_id: user.id})
            .andWhere('a.is_correct = TRUE')
            .groupBy('w.id')
            .getRawAndEntities();

        // available_templates.entities contains ExerciseTemplate[]
        // available_templates.raw contains count for each template as exerciseCount
        return this.randomPick(available_words, max_count);

    }

    private randomPick<T>(array: {entities: T[], raw: {inverseWeight: number}[]}, count: number = 1): T[] {
        const elements = array.entities;
        const counts = array.raw.map((r: any) => Number(r.inverseWeight));
        const weights = counts.map(count => 1 / (count + 1));
        const totalWeight = weights.reduce((sum, w) => sum + w, 0);
        const normalizedWeights = weights.map(w => w / totalWeight);

        const pickedIndices = new Set<number>();
        while (pickedIndices.size < Math.min(count, elements.length)) {
            const rand = Math.random();
            let acc = 0;
            for (let i = 0; i < normalizedWeights.length; i++) {
                if (pickedIndices.has(i)) continue;
                acc += normalizedWeights[i];
                if (rand < acc) {
                    pickedIndices.add(i);
                    break;
                }
            }
        }
        return Array.from(pickedIndices).map(i => elements[i]);
    }
    private getUsedWords(generatedTask: any, template: ExerciseTemplate<ExerciseType>){
        switch(template.type){
            case ExerciseType.MULTIPLE_CHOICE:
                if (this.narrowType(generatedTask, ExerciseType.MULTIPLE_CHOICE))
                    return [generatedTask.options[generatedTask.correct_answer_index]];
                else 
                    throw Error(`Generated task has wrong schema. Exercise type: ${template.type}, generated: ${JSON.stringify(generatedTask)}`)
            case ExerciseType.TEXT_WITH_MULTIPLE_CHOICE:
                if (this.narrowType(generatedTask, ExerciseType.TEXT_WITH_MULTIPLE_CHOICE))
                    return generatedTask.multiple_choice_questions.map(question=>question.options[question.correct_answer_index])
                else 
                    throw Error(`Generated task has wrong schema. Exercise type: ${template.type}, generated: ${JSON.stringify(generatedTask)}`)
            default:
                throw Error('Unknown ExerciseType');

        }
    }

    private narrowType<T extends ExerciseType>(generated: any, exercise_type: T): generated is z.infer<typeof ExerciseTemplate['TYPE_TO_SCHEMA_MAP'][T]>{
        return ExerciseTemplate.TYPE_TO_SCHEMA_MAP[exercise_type].safeParse(generated).success;
    }
}
