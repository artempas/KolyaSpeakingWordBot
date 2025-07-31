import { BaseEntity, Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Exercise } from './Exercise';
import { ExerciseType, UserLevel } from './enums';
import { Word } from './Word';


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
        [ExerciseType.TEXT_WITH_MULTIPLE_CHOICE]: {"text":"Yesterday, I read an interesting article in the newspaper about how technology has changed the way people spend their holiday. It mentioned a family who decided to embark on a journey to a remote mountain instead of going to the beach. They used the internet to find a unique program that combines education with adventure. The program was designed by a doctor from a well-known university, aiming to teach children about the ecosystem through hands-on activities. The article highlighted how this innovative system of learning outside the traditional school environment can enhance knowledge. It also featured a photo of the family sitting on a chair near a window, deeply engaged in a book about local wildlife. The story made me think about how much office workers miss by not stepping out of their routine.","multiple_choice_questions":[{"options":["Internet","Newspaper","Technology","Education"],"question":"What has changed the way people spend their holiday according to the text?","correct_answer_index":2,"word_id":12},{"options":["Beach","Mountain","University","Office"],"question":"Where did the family decide to go for their holiday?","correct_answer_index":1,"word_id":28},{"options":["Book","Internet","Newspaper","School"],"question":"What did the family use to find their holiday program?","correct_answer_index":1,"word_id":12},{"options":["Teacher","Doctor","Family","People"],"question":"Who designed the program the family participated in?","correct_answer_index":1,"word_id":7},{"options":["School","University","Office","Mountain"],"question":"Where was the doctor from?","correct_answer_index":1,"word_id":24}]},
        [ExerciseType.TRANSLATION_MATCH]: {
            question: 'Сопоставь слова с их переводом',
            options: [
                [{word: {}, correct_answer_idx: 0}],
                ['RUSSIAN']
            ],
        } as {question: string, options: [{word: Word, correct_answer_idx: number}[], string[]]}
    } satisfies {
        [k in ExerciseType]: Record<string, any>
    };

    @PrimaryGeneratedColumn()
    id: number;

    @Column({default: 'DefaultExerciseName'})
    name: string;

    @Column({nullable: true})
    prompt?: string;

    @Column({default: false})
    requires_translation: boolean

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