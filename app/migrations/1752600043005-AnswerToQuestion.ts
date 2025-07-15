import { MigrationInterface, QueryRunner } from 'typeorm';

export class AnswerToQuestion1752600043005 implements MigrationInterface {
    name = 'AnswerToQuestion1752600043005';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE answer rename to question');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE question RENAME TO answer');
    }

}
