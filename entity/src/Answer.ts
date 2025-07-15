import { BaseEntity, Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Word } from './Word';
import { Exercise } from './Exercise';
import { ExerciseType } from './enums';

@Entity()
export class Answer extends BaseEntity{

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    exercise_id: number;

    @Column()
    word_id: number;

    @Column({nullable: true})
    is_correct?: boolean;

    @ManyToOne(() => Word, w => w.answers, {onDelete: 'CASCADE', onUpdate: 'CASCADE'})
    @JoinColumn({name: 'word_id', referencedColumnName: 'id'})
    word: Word;

    @ManyToOne(() => Exercise, t => t.answers, {onDelete: 'CASCADE', onUpdate: 'CASCADE'})
    @JoinColumn({name: 'exercise_id', referencedColumnName: 'id'})
    exercise: Exercise<ExerciseType>;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}