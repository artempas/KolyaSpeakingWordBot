import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateExerciseTemplate1755013922893 implements MigrationInterface {
    name = 'UpdateExerciseTemplate1755013922893'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "exercise_template" DROP COLUMN "examples"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "exercise_template" ADD "examples" json array`);
    }

}
