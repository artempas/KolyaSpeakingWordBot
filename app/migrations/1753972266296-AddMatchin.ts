import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMatchin1753972266296 implements MigrationInterface {
    name = 'AddMatchin1753972266296';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "exercise_template" ADD "requires_translation" boolean NOT NULL DEFAULT false');
        await queryRunner.query('ALTER TABLE "exercise_template" ALTER COLUMN "prompt" DROP NOT NULL');
        await queryRunner.query('ALTER TYPE "public"."ExerciseType" RENAME TO "ExerciseType_old"');
        await queryRunner.query('CREATE TYPE "public"."ExerciseType" AS ENUM(\'text_with_multiple_choice\', \'multiple_choice\', \'translation_match\')');
        await queryRunner.query('ALTER TABLE "exercise_template" ALTER COLUMN "type" TYPE "public"."ExerciseType" USING "type"::"text"::"public"."ExerciseType"');
        await queryRunner.query('DROP TYPE "public"."ExerciseType_old"');
        await queryRunner.query('ALTER TYPE "public"."user_position_enum" RENAME TO "user_position_enum_old"');
        await queryRunner.query('CREATE TYPE "public"."user_position_enum" AS ENUM(\'MENU\', \'VOCABULARY\', \'ADD_WORD\', \'REMOVE_WORD\', \'EXERCISE\', \'SETTINGS\', \'MULTIPLE_CHOICE\', \'MATCHING\')');
        await queryRunner.query('ALTER TABLE "user" ALTER COLUMN "position" DROP DEFAULT');
        await queryRunner.query('ALTER TABLE "user" ALTER COLUMN "position" TYPE "public"."user_position_enum"[] USING "position"::"text"::"public"."user_position_enum"[]');
        await queryRunner.query('ALTER TABLE "user" ALTER COLUMN "position" SET DEFAULT \'{MENU}\'');
        await queryRunner.query('DROP TYPE "public"."user_position_enum_old"');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('CREATE TYPE "public"."user_position_enum_old" AS ENUM(\'MENU\', \'VOCABULARY\', \'ADD_WORD\', \'REMOVE_WORD\', \'EXERCISE\', \'SETTINGS\', \'MULTIPLE_CHOICE\')');
        await queryRunner.query('ALTER TABLE "user" ALTER COLUMN "position" DROP DEFAULT');
        await queryRunner.query('ALTER TABLE "user" ALTER COLUMN "position" TYPE "public"."user_position_enum_old"[] USING "position"::"text"::"public"."user_position_enum_old"[]');
        await queryRunner.query('ALTER TABLE "user" ALTER COLUMN "position" SET DEFAULT \'{MENU}\'');
        await queryRunner.query('DROP TYPE "public"."user_position_enum"');
        await queryRunner.query('ALTER TYPE "public"."user_position_enum_old" RENAME TO "user_position_enum"');
        await queryRunner.query('CREATE TYPE "public"."ExerciseType_old" AS ENUM(\'text_with_multiple_choice\', \'multiple_choice\')');
        await queryRunner.query('ALTER TABLE "exercise_template" ALTER COLUMN "type" TYPE "public"."ExerciseType_old" USING "type"::"text"::"public"."ExerciseType_old"');
        await queryRunner.query('DROP TYPE "public"."ExerciseType"');
        await queryRunner.query('ALTER TYPE "public"."ExerciseType_old" RENAME TO "ExerciseType"');
        await queryRunner.query('ALTER TABLE "exercise_template" ALTER COLUMN "prompt" SET NOT NULL');
        await queryRunner.query('ALTER TABLE "exercise_template" DROP COLUMN "requires_translation"');
    }

}
