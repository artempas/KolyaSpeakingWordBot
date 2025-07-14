import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExerciseTemplate1752499370357 implements MigrationInterface {
    name = 'AddExerciseTemplate1752499370357';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('CREATE TYPE "public"."UserLevel" AS ENUM(\'A1\', \'A2\', \'B1\', \'B2\', \'C1\', \'C2\')');
        await queryRunner.query('CREATE TYPE "public"."exercise_template_type_enum" AS ENUM(\'0\', \'1\')');
        await queryRunner.query('CREATE TABLE "exercise_template" ("id" SERIAL NOT NULL, "prompt" character varying NOT NULL, "min_words" integer, "max_words" integer, "available_levels" "public"."UserLevel" array NOT NULL, "type" "public"."exercise_template_type_enum" NOT NULL, CONSTRAINT "PK_d45f4023337894e8fe56520ae03" PRIMARY KEY ("id"))');
        await queryRunner.query('ALTER TABLE "user" ADD "level" "public"."UserLevel" NOT NULL DEFAULT \'A1\'');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "user" DROP COLUMN "level"');
        await queryRunner.query('DROP TABLE "exercise_template"');
        await queryRunner.query('DROP TYPE "public"."UserLevel"');
        await queryRunner.query('DROP TYPE "public"."exercise_template_type_enum"');
    }

}
