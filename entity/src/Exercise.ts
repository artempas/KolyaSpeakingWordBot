import { BaseEntity, Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from './User';
import { ExerciseTemplate } from './ExerciseTemplate';
import { Answer } from './Answer';


export enum ExerciseStatus {
    GENERATED = 'GENERATED',
    ASKED = 'ASKED',
    ANSWERED = 'ANSWERED'
}

@Entity()
export class Exercise extends BaseEntity{

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    user_id: number;

    @Column()
    template_id: number;

    @Column({enum: ExerciseStatus, type: 'enum'})
    status: ExerciseStatus;

    @Column({type: 'jsonb'})
    generated: ReturnType<ExerciseTemplate['getSchema']>;

    @ManyToOne(() => User, user => user.exercises)
    @JoinColumn({name: 'user_id', referencedColumnName: 'id'})
    user: User;

    @ManyToOne(() => ExerciseTemplate, t => t.exercises)
    @JoinColumn({name: 'template_id', referencedColumnName: 'id'})
    template: ExerciseTemplate;

    @OneToMany(() => Answer, a => a.exercise)
    answers: Answer[];

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}