import { MigrationInterface, QueryRunner } from 'typeorm';

export class RefactorExerciseTemplates1754932700982 implements MigrationInterface {
    name = 'RefactorExerciseTemplates1754932700982';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "exercise_template" ADD "question_text" character varying NOT NULL DEFAULT \'\'');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "exercise_template" DROP COLUMN "question_text"');
    }

}
