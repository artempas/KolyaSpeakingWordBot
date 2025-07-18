import { ExerciseTemplate, ExerciseType, Exercise, Word, ExerciseStatus, User, Question } from '@kolya-quizlet/entity';
import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LlmService } from 'llm/llm.service';
import { Repository, Not, Brackets, EntityNotFoundError, IsNull, Any } from 'typeorm';
import { ExerciseFromTypeArray } from './types';

@Injectable()
export class ExercisesService {
    constructor(
        @Inject() private readonly llmService: LlmService,

        @InjectRepository(ExerciseTemplate) private readonly exerciseTemplateRepo: Repository<ExerciseTemplate<ExerciseType>>,
        @InjectRepository(Exercise) private readonly exerciseRepo: Repository<Exercise<ExerciseType>>,
        @InjectRepository(Question) private readonly questionRepo: Repository<Question>,
        @InjectRepository(Word) private readonly wordRepo: Repository<Word>
    ){}

    async getNextExercise<T extends ExerciseType[]>(
        user: User,
        options: {
            type?: T,
            id?: number
        }
    ): Promise<ExerciseFromTypeArray<T>> {
        const {type, id} = options;
        const existing_exercise = await this.exerciseRepo.findOne({
            where: {user_id: user.id, status: Not(ExerciseStatus.ANSWERED), template: {id, type: type ? Any(type) : undefined}},
            relations: {template: true, questions: true},
            order: {created_at: 'asc'}
        });
        if (existing_exercise) return existing_exercise as ExerciseFromTypeArray<T>;
        else return await this.generateExercise<T>(user, options);
    }

    async generateExercise<T extends ExerciseType[]>(
        user: User,
        options: {
            type?: T,
            id?: number
        }
    ): Promise<ExerciseFromTypeArray<T>> {
        const user_words_count = await this.wordRepo.count({where: {user_id: user.id}});
        let template;
        if (options.id)
            template = await this.exerciseTemplateRepo.findOneByOrFail({id: options.id});
        else
            template = await this.pickTemplate(user, user_words_count, options.type);


        const words = await this.pickWords(user, template.max_words);

        console.log('Picked words: ', words);

        const generatedTask = await this.llmService.getStructuredResponse(
            template.prompt,
            template.getSchema(),
            {
                schema: template.getSchema(),
                words: words.map(w => ({word: w.word, id: w.id})),
                level: user.level
            }
        );
        if (!generatedTask) throw new Error('Unable to generate task');

        const questions = this.taskToQuestions(generatedTask, template, words);

        if (!questions.length) throw new Error('No valid questions were generated for this task:(');

        // Create new exercise with selected template
        const newExercise = this.exerciseRepo.create({
            user_id: user.id,
            template: template,
            generated: generatedTask,
            status: ExerciseStatus.GENERATED,
            questions
        });
        return await this.exerciseRepo.save(newExercise) as ExerciseFromTypeArray<T>;
    }

    private async pickTemplate(user: User, min_words: number, type?: ExerciseType[]){
        const available_templates_q = this.exerciseTemplateRepo.createQueryBuilder('t')
            .leftJoin(Exercise, 'e', 'e.template_id = t.id AND e.user_id = :user_id', {user_id: user.id})
            .addSelect('COUNT(e.id)', 'inverseWeight')
            .where('t.available_levels @> :user_level', {user_level: [user.level]})
            .andWhere(
                new Brackets((qb) =>
                    qb.where('t.min_words <= :min_words', {min_words})
                        .orWhere('t.min_words IS NULL'))
            )
            .groupBy('t.id');
        if (type){
            available_templates_q.andWhere('t.type = ANY(:type)', {type});
        }

        const available_templates = await available_templates_q.getRawAndEntities();

        if (!available_templates.entities.length) throw new EntityNotFoundError(ExerciseTemplate, {available_levels: user.level});

        return this.randomPick(available_templates)[0];
    }

    private async pickWords(user: User, max_count: number){
        const available_words = await this.wordRepo.createQueryBuilder('w')
            .leftJoin(Question, 'a', 'a.word_id = w.id AND a.is_correct')
            .addSelect('COUNT(a.id)', 'inverseWeight')
            .where('w.user_id = :user_id', {user_id: user.id})
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

    private taskToQuestions(generatedTask: any, template: ExerciseTemplate<ExerciseType>, pickedWords: Word[]): Question[]{
        switch (template.type){
        case ExerciseType.MULTIPLE_CHOICE:
            if (this.isOfExerciseType(generatedTask, ExerciseType.MULTIPLE_CHOICE)){
                const word = pickedWords.find(
                    word => word.word.toLowerCase() === generatedTask.options[generatedTask.correct_answer_index].toLowerCase()
                );
                return [this.questionRepo.create({
                    word: word,
                    options: generatedTask.options,
                    correct_idx: generatedTask.correct_answer_index
                })];
            } else
                throw Error(`Generated task has wrong schema. Exercise type: ${template.type}, generated: ${JSON.stringify(generatedTask)}`);
        case ExerciseType.TEXT_WITH_MULTIPLE_CHOICE:
            if (this.isOfExerciseType(generatedTask, ExerciseType.TEXT_WITH_MULTIPLE_CHOICE)){
                const result: Question[] = [];
                for (const question of generatedTask.multiple_choice_questions){
                    const word = pickedWords.find(
                        w => w.id === question.word_id
                    );
                    if (word)
                        result.push(this.questionRepo.create({
                            text: question.question,
                            word,
                            options: question.options,
                            correct_idx: question.correct_answer_index
                        }));
                    else {
                        console.log(`Question about word "${question.options[question.correct_answer_index]}" is discarded bcs no such word was given to AI. List of given words: ${pickedWords.map(w => w.word).join(',')}`);
                    }
                }
                return result;
            } else
                throw Error(`Generated task has wrong schema. Exercise type: ${template.type}, generated: ${JSON.stringify(generatedTask)}`);
        default:
            throw Error('Unknown ExerciseType');
        }
    }

    isOfExerciseType<T extends ExerciseType>(generated: any, exercise_type: T): generated is typeof ExerciseTemplate['TYPE_TO_SCHEMA_MAP'][T]{
        return Object.keys(ExerciseTemplate.TYPE_TO_SCHEMA_MAP[exercise_type]).every(k => k in generated);
    }

    async handleAnswer(question_id: number, is_correct: boolean): Promise<{finished: false}|{finished: true, total: number, correct: number}> {
        const question = await this.questionRepo.findOneOrFail({ where: { id: question_id } });
        question.is_correct = is_correct;
        await this.questionRepo.save(question);

        const finished = !await this.questionRepo.exists({where: {exercise_id: question.exercise_id, is_correct: IsNull()}});

        if (finished) {
            await this.exerciseRepo.update({id: question.exercise_id}, {status: ExerciseStatus.ANSWERED});
            return {
                finished: true,
                total: await this.questionRepo.countBy({exercise_id: question.exercise_id}),
                correct: await this.questionRepo.countBy({exercise_id: question.exercise_id, is_correct: true})
            };
        }
        return {finished};
    }
}
