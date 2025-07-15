import { BaseEntity, Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Word } from './Word';
import { Exercise } from './Exercise';
import { ExerciseType } from './enums';

@Entity()
export class Question extends BaseEntity{

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    exercise_id: number;

    @Column()
    word_id: number;

    @Column()
    text: string;

    @Column({
        type: 'text',
        array: true
    })
    options: string[];

    @Column()
    correct_idx: number;

    @Column({nullable: true})
    is_correct?: boolean;

    @ManyToOne(() => Word, w => w.questions, {onDelete: 'CASCADE', onUpdate: 'CASCADE'})
    @JoinColumn({name: 'word_id', referencedColumnName: 'id'})
    word: Word;

    @ManyToOne(() => Exercise, t => t.questions, {onDelete: 'CASCADE', onUpdate: 'CASCADE'})
    @JoinColumn({name: 'exercise_id', referencedColumnName: 'id'})
    exercise: Exercise<ExerciseType>;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}