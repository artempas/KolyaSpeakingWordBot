import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, BaseEntity, OneToMany } from 'typeorm';
import { User } from './User';
import { Answer } from './Answer';

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

    @Column({ nullable: true })
    meaning?: string;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created_at: Date;

    @OneToMany(() => Answer, a => a.word)
    answers: Answer[];
}
