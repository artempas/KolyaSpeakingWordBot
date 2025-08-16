import { ExerciseType, Exercise, Word, User, Question, ExerciseStatus } from '@kolya-quizlet/entity';
import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LlmService } from 'llm/llm.service';
import { Any, Not, Repository } from 'typeorm';
import { AITextGenerationService, GeneratorSchema, IGenerator, TranslateToForeignGenerationService, TranslateToNativeGenerationService, TranslationMatchGenerationService } from './generators';
import z from 'zod';
import { AbstractGenerator, generatorMap } from './generators/generator.decorator';
import { NoSuitableExerciseTypeFound } from './exercise.exceptions';


// Helper type to extract the schema output for a given ExerciseType
type ExerciseSchemaOutput<T extends ExerciseType> = z.infer<GeneratorSchema<T>>;

@Injectable()
export class ExercisesService {
    constructor(
        @Inject() private readonly llmService: LlmService,

        private readonly _ai: AITextGenerationService,
        private readonly _match: TranslationMatchGenerationService,
        private readonly _translate: TranslateToForeignGenerationService,
        private readonly _translateNative: TranslateToNativeGenerationService,


        @InjectRepository(Exercise) private readonly exerciseRepo: Repository<Exercise>,
        @InjectRepository(Word) private readonly wordRepo: Repository<Word>
    ){}


    async generateExercise<T extends ExerciseType[]>(
        user: User,
        options?: {
            type?: T,
        }
    ): Promise<Exercise<ExerciseSchemaOutput<T[number]>>> {

        const existing_exercise = await this.exerciseRepo.findOne({
            where: {
                user_id: user.id,
                status: Not(ExerciseStatus.ANSWERED),
                type: options?.type ? Any(options.type) : undefined
            },
            relations: {
                questions: true
            },
            order: { created_at: 'ASC' }
        });

        if (existing_exercise) return existing_exercise as Exercise<ExerciseSchemaOutput<T[number]>>;

        const user_words_count = await this.wordRepo.count({where: {user_id: user.id}});

        const template = await this.pickExerciseType(user, user_words_count, options?.type);

        const handler = this.getHandler(template);

        const words = await this.pickWords(user, handler.maxWords, handler.requires_translation);

        console.log('Picked words: ', words);

        return handler.generateExercise(user, words);

    }

    getHandler<T extends ExerciseType>(template: T): IGenerator<T, GeneratorSchema<T>> {
        for (const handler_instance of Object.values(this)) {
            if (
                handler_instance &&
                typeof handler_instance === 'object' &&
                'forType' in handler_instance &&
                (handler_instance as any).forType === template
            ) {
                return handler_instance as IGenerator<T, GeneratorSchema<T>>;
            }
        }
        throw new Error(`No handler found for exercise type ${template}`);
    }

    private pickExerciseType<T extends ExerciseType[]>(user: User, min_words: number, types: T|undefined)
        : Promise<typeof types extends T ? T[number]: ExerciseType>

    private pickExerciseType(user: User, min_words: number): Promise<ExerciseType>

    private async pickExerciseType<T extends ExerciseType[]>(user: User, min_words: number, types?: T): Promise<ExerciseType> {
        // Count how many exercises of each type the user has
        let types_count_query = this.exerciseRepo.createQueryBuilder('e')
            .select('e.type', 'type')
            .addSelect('COUNT(*)', 'count')
            .where('e.user_id = :user_id', { user_id: user.id })
            .andWhere('e.created_at >= :last_month', { last_month: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) })
            .groupBy('e.type');
        if (types){
            types_count_query = types_count_query.andWhere('e.type = ANY(:types)', {types});
        }
        const types_count = await types_count_query.getRawMany<{type: ExerciseType, count: number}>();

        const types_arr: {entities: ExerciseType[], raw: {inverseWeight: number}[]} = {entities: [], raw: []};

        for (const {type} of await this.getSuitableExerciseTypes(user, min_words)) {
            if (types && !types.includes(type)) continue; // Skip if type is not in the provided types)
            types_arr.entities.push(type);
            types_arr.raw.push({inverseWeight: types_count.find(t => t.type === type)?.count ?? 0});
        }

        if (!types_arr.entities.length) throw new NoSuitableExerciseTypeFound('No suitable exercise type found');
        return this.randomPick(types_arr)[0];
    }

    async getSuitableExerciseTypes(user: User, _min_words?: number): Promise<{type: ExerciseType, handler: AbstractGenerator}[]> {
        const min_words = _min_words ?? user.words?.length ?? await this.wordRepo.count({where: {user_id: user.id}});
        return Array.from(generatorMap.entries())
            .filter(([__, handler]) => handler.minWords <= min_words && handler.forLevel.includes(user.level))
            .map(([type, handler]) => ({type, handler}));

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
