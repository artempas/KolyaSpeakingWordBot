import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateExerciseAndUserEnums1755346122437 implements MigrationInterface {
    name = 'UpdateExerciseAndUserEnums1755346122437';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "exercise" DROP CONSTRAINT "FK_d45f4023337894e8fe56520ae03"');
        await queryRunner.query('ALTER TABLE "exercise" RENAME COLUMN "template_id" TO "type"');
        await queryRunner.query('ALTER TABLE "question" DROP COLUMN "text"');
        await queryRunner.query('ALTER TABLE "question" DROP COLUMN "options"');
        await queryRunner.query('ALTER TABLE "question" DROP COLUMN "correct_idx"');
        await queryRunner.query('ALTER TABLE "exercise" DROP COLUMN "type"');
        await queryRunner.query('DELETE FROM "exercise"');
        await queryRunner.query('CREATE TYPE "public"."exercise_type_enum" AS ENUM(\'AI_TEXT\', \'MATCH_TRANSLATION\', \'TRANSLATE_TO_FOREIGN\', \'TRANSLATE_TO_NATIVE\')');
        await queryRunner.query('ALTER TABLE "exercise" ADD "type" "public"."exercise_type_enum" NOT NULL');
        await queryRunner.query('ALTER TYPE "public"."user_position_enum" RENAME TO "user_position_enum_old"');
        await queryRunner.query('CREATE TYPE "public"."user_position_enum" AS ENUM(\'START\', \'MENU\', \'VOCABULARY\', \'ADD_WORD\', \'REMOVE_WORD\', \'EXERCISE\', \'SETTINGS\', \'AI_TEXT\', \'MATCH_TRANSLATION\', \'TRANSLATE_TO_FOREIGN\', \'TRANSLATE_TO_NATIVE\')');
        await queryRunner.query('ALTER TABLE "user" ALTER COLUMN "position" DROP DEFAULT');
        await queryRunner.query('ALTER TABLE "user" ALTER COLUMN "position" TYPE "public"."user_position_enum"[] USING "position"::"text"::"public"."user_position_enum"[]');
        await queryRunner.query('ALTER TABLE "user" ALTER COLUMN "position" SET DEFAULT \'{START}\'');
        await queryRunner.query('DROP TYPE "public"."user_position_enum_old"');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('CREATE TYPE "public"."user_position_enum_old" AS ENUM(\'START\', \'MENU\', \'VOCABULARY\', \'ADD_WORD\', \'REMOVE_WORD\', \'EXERCISE\', \'SETTINGS\', \'MULTIPLE_CHOICE\', \'MATCHING\')');
        await queryRunner.query('ALTER TABLE "user" ALTER COLUMN "position" DROP DEFAULT');
        await queryRunner.query('ALTER TABLE "user" ALTER COLUMN "position" TYPE "public"."user_position_enum_old"[] USING "position"::"text"::"public"."user_position_enum_old"[]');
        await queryRunner.query('ALTER TABLE "user" ALTER COLUMN "position" SET DEFAULT \'{START}\'');
        await queryRunner.query('DROP TYPE "public"."user_position_enum"');
        await queryRunner.query('ALTER TYPE "public"."user_position_enum_old" RENAME TO "user_position_enum"');
        await queryRunner.query('ALTER TABLE "exercise" DROP COLUMN "type"');
        await queryRunner.query('DROP TYPE "public"."exercise_type_enum"');
        await queryRunner.query('ALTER TABLE "exercise" ADD "type" integer');
        await queryRunner.query('ALTER TABLE "question" ADD "correct_idx" integer NOT NULL');
        await queryRunner.query('ALTER TABLE "question" ADD "options" text array NOT NULL');
        await queryRunner.query('ALTER TABLE "question" ADD "text" character varying NOT NULL');
        await queryRunner.query('ALTER TABLE "exercise" RENAME COLUMN "type" TO "template_id"');
        await queryRunner.query('ALTER TABLE "exercise" ADD CONSTRAINT "FK_d45f4023337894e8fe56520ae03" FOREIGN KEY ("template_id") REFERENCES "exercise_template"("id") ON DELETE SET NULL ON UPDATE SET NULL');
    }

}
