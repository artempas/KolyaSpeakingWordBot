import { Entity, PrimaryGeneratedColumn, Column, OneToMany, BaseEntity } from 'typeorm';
import { Word } from './Word';
import { Message } from './Message';
import { Exercise } from './Exercise';

export enum Position {
  MENU = 'MENU',
  VOCABULARY = 'VOCABULARY',
  ADD_WORD = 'ADD_WORD',
  REMOVE_WORD = 'REMOVE_WORD',
}

export enum UserLevel {
    A1 = 'A1',
    A2 = 'A2',
    B1 = 'B1',
    B2 = 'B2',
    C1 = 'C1',
    C2 = 'C2'
}

export type AddWordContextData = {
    repeat?: boolean
    asked?: true
};
export type RemoveWordContextData = {
    page?: number,
}
export type ContextData<P extends Position> =
      P extends 'ADD_WORD' ? AddWordContextData
    : P extends 'REMOVE_WORD' ? RemoveWordContextData
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
        default: [Position.MENU],
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

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created_at: Date;

    @OneToMany(() => Exercise, e => e.user)
    exercises: Exercise[];
}
