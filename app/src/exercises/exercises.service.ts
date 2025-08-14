import { ExerciseType, Exercise, Word, ExerciseStatus, User, Question } from '@kolya-quizlet/entity';
import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LlmService } from 'llm/llm.service';
import { Repository, Not, Any } from 'typeorm';
import { ExerciseFromTypeArray } from './types';
import { handlingMap } from './generators/generator.decorator';
import { IGenerator } from './generators';
import z from 'zod';

@Injectable()
export class ExercisesService {
    constructor(
        @Inject() private readonly llmService: LlmService,

        @InjectRepository(Exercise) private readonly exerciseRepo: Repository<Exercise>,
        @InjectRepository(Word) private readonly wordRepo: Repository<Word>
    ){}

    async generateExercise<T extends ExerciseType[]>(
        user: User,
        options: {
            type?: T,
        }
    ): Promise<Exercise> {
        const user_words_count = await this.wordRepo.count({where: {user_id: user.id}});

        const template = await this.pickExerciseType(user, user_words_count, options.type);

        const handler = this.getHandler(template);

        const words = await this.pickWords(user, handler.maxWords, handler.requires_translation);

        console.log('Picked words: ', words);

        return handler.generateExercise(user, words);

    }

    getHandler(template: ExerciseType): IGenerator<z.Schema> {
        const HandlerClass = handlingMap.get(template);
        for (const handler_instance in this){
            if (HandlerClass && this[handler_instance] instanceof HandlerClass) return this[handler_instance];
        }
        throw new Error(`No handler found for exercise type ${template}`);
    }

    private async pickExerciseType(user: User, min_words: number, type?: ExerciseType[]){
        // Count how many exercises of each type the user has
        let types_count_query = this.exerciseRepo.createQueryBuilder('e')
            .select('e.type', 'type')
            .addSelect('COUNT(*)', 'count')
            .where('e.user_id = :user_id', { user_id: user.id })
            .andWhere('e.created_at >= :last_month', { last_month: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) })
            .groupBy('e.type');
        if (type){
            types_count_query = types_count_query.andWhere('e.type = :type', {type});
        }
        const types_count = await types_count_query.getRawMany<{type: ExerciseType, count: number}>();

        const types_arr: {entities: ExerciseType[], raw: {inverseWeight: number}[]} = {entities: [], raw: []};
        for (const [type, handler] of handlingMap){
            if (handler.minWords > min_words) continue;
            types_arr.entities.push(type);
            types_arr.raw.push({inverseWeight: types_count.find(t => t.type === type)?.count ?? 0});
        }
        return this.randomPick(types_arr)[0];
    }

    private async pickWords(user: User, max_count: number, requires_translation: boolean){
        const available_words_qb = await this.wordRepo.createQueryBuilder('w')
            .leftJoin(Question, 'a', 'a.word_id = w.id AND a.is_correct')
            .addSelect('COUNT(a.id)', 'inverseWeight')
            .where('w.user_id = :user_id', {user_id: user.id})
            .groupBy('w.id');

        if (requires_translation) available_words_qb.andWhere('w.translation IS NOT NULL');
        const available_words = await available_words_qb.getRawAndEntities();

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
}
