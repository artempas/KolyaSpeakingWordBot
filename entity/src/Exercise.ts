import { BaseEntity, Column, CreateDateColumn, Entity, ForeignKey, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from './User';
import { ExerciseTemplate } from './ExerciseTemplate';
import { Question } from './Question';
import { ExerciseStatus, ExerciseType } from './enums';
import z from 'zod';

@Entity()
export class Exercise<T extends ExerciseType> extends BaseEntity{

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    user_id: number;

    @Column({nullable: true})
    template_id: number|null;

    @Column({enum: ExerciseStatus, type: 'enum'})
    status: ExerciseStatus;

    @Column({type: 'jsonb'})
    generated: typeof ExerciseTemplate.TYPE_TO_SCHEMA_MAP[T];

    @ManyToOne(() => User, user => user.exercises, {onDelete: 'CASCADE', onUpdate: 'CASCADE'})
    @JoinColumn({name: 'user_id', referencedColumnName: 'id'})
    user: User;

    @ManyToOne(() => ExerciseTemplate, t => t.exercises, {onDelete: 'SET NULL', onUpdate: 'SET NULL'})
    @JoinColumn({name: 'template_id', referencedColumnName: 'id'})
    template: ExerciseTemplate<T> | null;

    @OneToMany(() => Question, a => a.exercise, {cascade: true})
    questions: Question[];

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}