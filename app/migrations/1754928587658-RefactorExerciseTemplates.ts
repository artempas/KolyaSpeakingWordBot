import { MigrationInterface, QueryRunner } from 'typeorm';

export class RefactorExerciseTemplates1754928587658 implements MigrationInterface {
    name = 'RefactorExerciseTemplates1754928587658';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "exercise_template" DROP COLUMN "requires_translation"');
        await queryRunner.query('ALTER TABLE "exercise_template" ADD "examples" json array');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "exercise_template" DROP COLUMN "examples"');
        await queryRunner.query('ALTER TABLE "exercise_template" ADD "requires_translation" boolean NOT NULL DEFAULT false');
    }

}
