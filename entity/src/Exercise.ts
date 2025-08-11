import { BaseEntity, Column, CreateDateColumn, Entity, ForeignKey, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from './User';
import { ExerciseTemplate, GenerationType } from './ExerciseTemplate';
import { Question } from './Question';
import { ExerciseStatus, ExerciseType } from './enums';
import z from 'zod';

type a = z.infer<typeof ExerciseTemplate.SCHEMA_ZOD_MAP[ExerciseType.MATCH]>

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
    generated: z.infer<typeof ExerciseTemplate.SCHEMA_ZOD_MAP[T]>;

    @ManyToOne(() => User, user => user.exercises, {onDelete: 'CASCADE', onUpdate: 'CASCADE'})
    @JoinColumn({name: 'user_id', referencedColumnName: 'id'})
    user: User;

    @ManyToOne(() => ExerciseTemplate, t => t.exercises, {onDelete: 'SET NULL', onUpdate: 'SET NULL'})
    @JoinColumn({name: 'template_id', referencedColumnName: 'id'})
    template: ExerciseTemplate<T, GenerationType> | null;

    isOfType<T extends ExerciseType>(type: T): this is Exercise<T>{
        return this.template?.type as ExerciseType === type as ExerciseType;
    }

    @OneToMany(() => Question, a => a.exercise, {cascade: true})
    questions: Question[];

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}