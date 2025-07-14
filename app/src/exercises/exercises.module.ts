import { Inject, Module } from '@nestjs/common';
import { ExercisesService } from './exercises.service';
import { LlmModule } from 'src/llm/llm.module';
import { LlmService } from 'src/llm/llm.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Exercise, ExerciseStatus, ExerciseTemplate, ExerciseType, User, Word } from '@kolya-quizlet/entity';
import { Brackets, Not, Repository } from 'typeorm';
import { Answer } from '@kolya-quizlet/entity/dist/Answer';

@Module({
    providers: [ExercisesService],
    imports: [LlmModule],
    exports: [ExercisesService]
})
export class ExercisesModule {
    constructor(
        @Inject() private readonly llmService: LlmService,

        @InjectRepository(ExerciseTemplate) private readonly exerciseTemplateRepo: Repository<ExerciseTemplate>,
        @InjectRepository(Exercise) private readonly exerciseRepo: Repository<Exercise>,
        @InjectRepository(Word) private readonly wordRepo: Repository<Word>
    ){}

    async getNextExercise(user: User): Promise<Exercise> {
        const existing_exercise = await this.exerciseRepo.findOne({where: {user_id: user.id, status: Not(ExerciseStatus.ANSWERED)}, order: {created_at: 'asc'}});
        if (existing_exercise) return existing_exercise;
        else return this.generateExercise(user);
    }

    async generateExercise(user: User): Promise<Exercise>{
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

        let used_words;
        switch(template.type){
            case ExerciseType.MULTIPLE_CHOICE:
                used_words = generatedTask. // Todo: stopped here
        }
        // Create new exercise with selected template
        const newExercise = this.exerciseRepo.create({
            user_id: user.id,
            template_id: template.id,
            generated: generatedTask,
            status: ExerciseStatus.GENERATED,
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
}