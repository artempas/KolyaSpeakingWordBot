import { BaseEntity, Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Word } from './Word';
import { Exercise } from './Exercise';

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

    @ManyToOne(() => Word, w => w.answers)
    @JoinColumn({name: 'word_id', referencedColumnName: 'id'})
    user: Word;

    @ManyToOne(() => Exercise, t => t.answers)
    @JoinColumn({name: 'exercise_id', referencedColumnName: 'id'})
    exercise: Exercise;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}