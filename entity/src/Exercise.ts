import { BaseEntity, Column, CreateDateColumn, Entity, ForeignKey, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from './User';
import { Question } from './Question';
import { ExerciseStatus, ExerciseType } from './enums';

@Entity()
export class Exercise<T extends Record<any, any> = Record<any, any>> extends BaseEntity{

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    user_id: number;

    @Column({enum: ExerciseStatus, type: 'enum'})
    status: ExerciseStatus;

    @Column({enum: ExerciseType, type: 'enum'})
    type: ExerciseType;

    @Column({type: 'jsonb'})
    generated: T;

    @ManyToOne(() => User, user => user.exercises, {onDelete: 'CASCADE', onUpdate: 'CASCADE'})
    @JoinColumn({name: 'user_id', referencedColumnName: 'id'})
    user: User;

    @OneToMany(() => Question, a => a.exercise, {cascade: true})
    questions: Question<T>[];

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}