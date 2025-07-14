import { BaseEntity, Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { UserLevel } from './User';
import * as z from 'zod';
import { Exercise } from './Exercise';

export enum ExerciseType {
    TEXT_WITH_MULTIPLE_CHOICE,
    MULTIPLE_CHOICE
}

const multiple_choice_schema = z.object({
    question: z.string(),
    options: z.array(z.string()),
    correct_answer_index: z.number()
});

export type ReplaceableValues = 'words'|'level';

@Entity()
export class ExerciseTemplate<T extends ExerciseType = ExerciseType> extends BaseEntity{

    static TYPE_TO_SCHEMA_MAP = {
        [ExerciseType.MULTIPLE_CHOICE]: multiple_choice_schema,
        [ExerciseType.TEXT_WITH_MULTIPLE_CHOICE]: z.object({
            text: z.string(),
            multiple_choice_questions: z.array(multiple_choice_schema)
        })

    } as const satisfies {
        [k in ExerciseType]: z.ZodObject
    };

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    prompt: string;

    @Column({nullable: true})
    min_words?: number;

    @Column()
    max_words: number;

    @Column({type: 'enum', array: true, enum: UserLevel, enumName: 'UserLevel'})
    available_levels: UserLevel[];

    @Column({enum: ExerciseType, type: 'enum'})
    type: T;

    getSchema(): typeof ExerciseTemplate.TYPE_TO_SCHEMA_MAP[T]{
        return ExerciseTemplate.TYPE_TO_SCHEMA_MAP[this.type];
    }

    @OneToMany(() => Exercise, e => e.user)
    exercises: Exercise[];
}