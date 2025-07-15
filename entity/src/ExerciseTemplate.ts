import { BaseEntity, Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import * as z from 'zod';
import { Exercise } from './Exercise';
import { ExerciseType, UserLevel } from './enums';


export type ReplaceableValues = 'words'|'level' | 'schema';

@Entity()
export class ExerciseTemplate<T extends ExerciseType> extends BaseEntity{

    static TYPE_TO_SCHEMA_MAP = {
        [ExerciseType.MULTIPLE_CHOICE]: {
            "question":"Вопрос про слово",
            "options":[
                "A",
                "B",
                "C",
                "D"
            ],
            "correct_answer_index": 0
        }, 
        [ExerciseType.TEXT_WITH_MULTIPLE_CHOICE]: {
            "text":"Текст, содержащий все перечисленные слова, не более 500 слов",
            "multiple_choice_questions":[
                {
                    "question":"Вопрос 1 с использованием одного из слов",
                    "options":[
                        "A",
                        "B",
                        "C",
                        "D"
                    ],
                    "correct_answer_index": 0
                },
            ]
        }
    } satisfies {
        [k in ExerciseType]: Record<string, any>
    };

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    prompt: string;

    @Column({nullable: true})
    min_words?: number;

    @Column()
    max_words: number;

    @Column({default: true})
    is_active: boolean

    @Column({type: 'enum', array: true, enum: UserLevel, enumName: 'UserLevel'})
    available_levels: UserLevel[];

    @Column({enum: ExerciseType, type: 'enum', enumName: 'ExerciseType'})
    type: T;

    getSchema(): typeof ExerciseTemplate.TYPE_TO_SCHEMA_MAP[T]{
        return ExerciseTemplate.TYPE_TO_SCHEMA_MAP[this.type];
    }

    @OneToMany(() => Exercise, e => e.user)
    exercises: Exercise<T>[];
}