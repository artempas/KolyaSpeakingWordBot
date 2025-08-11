import { Entity, PrimaryGeneratedColumn, Column, OneToMany, BaseEntity } from 'typeorm';
import { Word } from './Word';
import { Message } from './Message';
import { Exercise } from './Exercise';
import { ExerciseType, OnboardingSteps, Position, UserLevel } from './enums';


export type AddWordContextData = {
    repeat?: boolean
    asked?: true
};
export type RemoveWordContextData = {
    page?: number,
}

export type MatchingContextData = {
    question_selected_id?: number,
    option_selected_idx?: number,
    current_exercise_id: number
}

export type StartContextData = {
    step: OnboardingSteps,
    words: {
        asked: boolean
    }
}

export type ContextData<P extends Position> =
      P extends 'ADD_WORD' ? AddWordContextData
    : P extends 'REMOVE_WORD' ? RemoveWordContextData
    : P extends 'MATCHING' ? MatchingContextData
    : P extends 'START' ? StartContextData
    : Record<never, never>;

@Entity()
export class User extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    telegram_id: number;

    @Column({ nullable: true })
    username?: string;

    @Column({ nullable: true })
    first_name?: string;

    @Column({ nullable: true })
    last_name?: string;

    @Column('json', { default: {} })
    context: {
        [K in Position]?: ContextData<K>
    };

    @Column({
        type: 'enum',
        enum: Position,
        array: true,
        default: [Position.START],
    })
    position: Position[];

    @OneToMany(() => Word, word => word.user)
    words: Word[];

    @OneToMany(() => Message, message => message.user)
    messages: Message[];

    @Column({
        enum: UserLevel,
        type: 'enum',
        default: UserLevel.A1,
        enumName: 'UserLevel'
    })
    level: UserLevel;

    @OneToMany(() => Exercise, e => e.user)
    exercises: Exercise<ExerciseType>[];

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created_at: Date;
}
