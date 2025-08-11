import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, BaseEntity, OneToMany } from 'typeorm';
import { User } from './User';
import { Question } from './Question';

@Entity()
export class Word extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    user_id: number;

    @ManyToOne(() => User, user => user.words, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
    @JoinColumn({referencedColumnName: 'id', name: 'user_id'})
    user: User;

    @Column()
    word: string;

    @Column({ nullable: true, type: 'varchar' })
    meaning: string|null;

    @Column({ nullable: true, type: 'varchar' })
    translation: string|null;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created_at: Date;

    @OneToMany(() => Question, a => a.word)
    questions: Question[];
}
