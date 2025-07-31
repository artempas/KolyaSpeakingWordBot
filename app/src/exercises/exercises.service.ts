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
            template_id?: number,
            id?: number
        }
    ): Promise<ExerciseFromTypeArray<T>> {
        const {type, id, template_id} = options;
        const existing_exercise = await this.exerciseRepo.findOne({
            where: {id, user_id: user.id, status: Not(ExerciseStatus.ANSWERED), template: {id: template_id, type: type ? Any(type) : undefined}},
            relations: {template: true, questions: {word: true}},
            order: {created_at: 'asc'}
        });
        if (existing_exercise) return existing_exercise as ExerciseFromTypeArray<T>;
        else return await this.generateExercise<T>(user, options);
    }

    async generateExercise<T extends ExerciseType[]>(
        user: User,
        options: {
            type?: T,
            template_id?: number
        }
    ): Promise<ExerciseFromTypeArray<T>> {
        const user_words_count = await this.wordRepo.count({where: {user_id: user.id}});
        let template;
        if (options.template_id)
            template = await this.exerciseTemplateRepo.findOneByOrFail({id: options.template_id});
        else
            template = await this.pickTemplate(user, user_words_count, options.type);

        const words = await this.pickWords(user, template.max_words, template.requires_translation);

        console.log('Picked words: ', words);
        let generatedTask, questions: Question[];
        if (template.prompt){

            generatedTask = await this.llmService.getStructuredResponse(
                template.prompt,
                template.getSchema(),
                {
                    schema: template.getSchema(),
                    words: words.map(w => ({word: w.word, id: w.id})),
                    level: user.level
                }
            );
            if (!generatedTask) throw new Error('Unable to generate task');

            questions = this.taskToQuestions(generatedTask, template, words);

            if (!questions.length) throw new Error('No valid questions were generated for this task:(');
        } else {
            switch (template.type){
            case ExerciseType.TRANSLATION_MATCH: {
                generatedTask = (template as ExerciseTemplate<ExerciseType.TRANSLATION_MATCH>).getSchema();
                const shuffledOptions = this.shuffleArray(words.map((w, idx) => ({word: w, correct_answer_idx: idx})));
                generatedTask.options = [shuffledOptions, words.map(w => w.translation!)];
                questions = words.map((w, idx) => this.questionRepo.create({
                    text: '',
                    word: w,
                    options: words.map(t => t.translation!),
                    correct_idx: idx
                }));
                break;
            }
            default: throw new Error(`Not implemented manual task generation for type ${template.type}`);
            }
        }
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

    async handleAnswer(
        question_id: number,
        args: {is_correct?: boolean, option_idx?: number}
    ): Promise<{finished: false, is_correct: boolean}|{finished: true, total: number, correct: number, is_correct: boolean}> {
        const question = await this.questionRepo.findOneOrFail({ where: { id: question_id } });

        if (args.is_correct !== undefined)
            question.is_correct = args.is_correct;
        else if (args.option_idx !== undefined){
            question.is_correct = question.correct_idx === args.option_idx;
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

    /**
     * Shuffles and modifies original array
     * @param array
     * @returns
     */
    private shuffleArray<T>(array: T[]): T[]{

        let currentIndex = array.length;

        // While there remain elements to shuffle...
        while (currentIndex != 0) {

            // Pick a remaining element...
            let randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;

            // And swap it with the current element.
            [array[currentIndex], array[randomIndex]] = [
                array[randomIndex], array[currentIndex]
            ];
        }
        return array;
    }
}
