import { BaseEntity, Column, Entity, OneToMany, PrimaryGeneratedColumn, SaveOptions } from 'typeorm';
import { Exercise } from './Exercise';
import { ExerciseType, UserLevel } from './enums';
import { Word } from './Word';
import { z } from 'zod';


export type ReplaceableValues = 'words'|'level' | 'schema';

export enum QuestionSource {
    WORD = 'word',
    TRANSLATION = 'translation'
}

export enum GenerationType {
    MANUAL = 'manual',
    TEXT_LLM = 'text_llm'
}


@Entity()
export class ExerciseTemplate<EType extends ExerciseType, GType extends GenerationType> extends BaseEntity{

    static SCHEMA_ZOD_MAP = {
        [ExerciseType.CHOICES]: z.object({
            text: z.string().optional(),
            questions: z.array(z.object({
                question: z.string(),
                correct_index: z.number(),
                options: z.array(z.string()),
                word_id: z.number()
            })),
        }),
        [ExerciseType.MATCH]: z.object({
            question: z.string(),
            options: z.array(z.object({
                a: z.string(),
                b: z.string(),
                word_id: z.number()
            })),
        }),
        [ExerciseType.ANSWER]: z.object({
            question: z.string(),
            answer: z.string(),
            word_id: z.number()
        }),
        [ExerciseType.CHOICE]: z.object({
            question: z.string(),
            correct_index: z.number(),
            options: z.array(z.string()),
            word_id: z.number().optional()
        }),
    } as const;

    @PrimaryGeneratedColumn()
    id: number;

    @Column({default: 'DefaultExerciseName'})
    name: string;

    @Column({nullable: true, type: 'varchar'})
    prompt: GType extends GenerationType.TEXT_LLM ? string : null;

    @Column({nullable: true, type: 'json', array: true})
    examples: GType extends GenerationType.TEXT_LLM ? z.infer<typeof ExerciseTemplate.SCHEMA_ZOD_MAP[EType]>[] : null;

    @Column({type: 'enum', enum: GenerationType, enumName: 'GenerationType', default: GenerationType.TEXT_LLM})
    generation_type: GType;
    
    get requires_translation(){
        return this.question_source === QuestionSource.TRANSLATION || this.answer_source === QuestionSource.TRANSLATION
    }

    @Column({type: 'enum', enum: QuestionSource, enumName: 'QuestionSource', nullable: true})
    question_source: GType extends GenerationType.MANUAL ? QuestionSource : null;

    @Column({type: 'enum', enum: QuestionSource, enumName: 'QuestionSource', nullable: true})
    answer_source: GType extends GenerationType.MANUAL ? QuestionSource : null;

    @Column({default: ''})
    question_text: string;

    @Column({nullable: true})
    min_words?: number;

    @Column()
    max_words: number;

    @Column({default: true})
    is_active: boolean

    @Column({type: 'enum', array: true, enum: UserLevel, enumName: 'UserLevel'})
    available_levels: UserLevel[];

    @Column({enum: ExerciseType, type: 'enum', enumName: 'ExerciseType'})
    type: EType;

    isOfType<ET extends ExerciseType>(type: ET): this is ExerciseTemplate<ET, typeof this.generation_type>{
        return this.type as ExerciseType === type as ExerciseType;
    }

    getSchema(): typeof ExerciseTemplate.SCHEMA_ZOD_MAP[EType]{
        return ExerciseTemplate.SCHEMA_ZOD_MAP[this.type];
    }

    isLlmTemplate(): this is ExerciseTemplate<EType, GenerationType.TEXT_LLM>{
        return this.generation_type === GenerationType.TEXT_LLM; 
    }

    isManualTemplate(): this is ExerciseTemplate<EType, GenerationType.MANUAL>{
        return this.generation_type === GenerationType.MANUAL; 
    }

    @OneToMany(() => Exercise, e => e.user)
    exercises: Exercise<EType>[];

    save(options?: SaveOptions): Promise<this> {
        if (this.generation_type === GenerationType.TEXT_LLM){
            this.examples = this.examples?.map(obj => ExerciseTemplate.SCHEMA_ZOD_MAP[this.type].parse(obj)) as GType extends GenerationType.TEXT_LLM ? z.infer<typeof ExerciseTemplate.SCHEMA_ZOD_MAP[EType]>[] : null;
            if (!(
                this.examples?.length
                && this.prompt
                && !this.question_source
                && !this.answer_source
            )) throw new Error('Incorrect template configuration');
        }
        if (this.generation_type === GenerationType.MANUAL){
            if (!(
                !this.prompt
                && this.question_source
                && this.answer_source
            )) throw new Error('Incorrect template configuration');
        }
        return super.save(options)
    }
}