import { MigrationInterface, QueryRunner } from 'typeorm';

export class RefactorExerciseTemplates1754926931797 implements MigrationInterface {
    name = 'RefactorExerciseTemplates1754926931797';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('CREATE TYPE "public"."GenerationType" AS ENUM(\'manual\', \'text_llm\')');
        await queryRunner.query('ALTER TABLE "exercise_template" ADD "generation_type" "public"."GenerationType" NOT NULL DEFAULT \'text_llm\'');
        await queryRunner.query('CREATE TYPE "public"."QuestionSource" AS ENUM(\'word\', \'translation\')');
        await queryRunner.query('ALTER TABLE "exercise_template" ADD "question_source" "public"."QuestionSource"');
        await queryRunner.query('ALTER TABLE "exercise_template" ADD "answer_source" "public"."QuestionSource"');
        await queryRunner.query('ALTER TYPE "public"."ExerciseType" RENAME TO "ExerciseType_old"');
        await queryRunner.query('CREATE TYPE "public"."ExerciseType" AS ENUM(\'choices\', \'match\', \'answer\', \'choice\')');
        await queryRunner.query('ALTER TABLE "exercise_template" ALTER COLUMN "type" TYPE "text"');
        await queryRunner.query(`
            UPDATE "exercise_template"
            SET "type" = CASE
            WHEN "type" = 'text_with_multiple_choice' THEN 'choices'
            WHEN "type" = 'multiple_choice' THEN 'choice'
            WHEN "type" = 'translation_match' THEN 'match'
            ELSE "type"
            END
        `);
        await queryRunner.query('ALTER TABLE "exercise_template" ALTER COLUMN "type" TYPE "public"."ExerciseType" USING "type"::"public"."ExerciseType"');
        await queryRunner.query('DROP TYPE "public"."ExerciseType_old"');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('CREATE TYPE "public"."ExerciseType_old" AS ENUM(\'text_with_multiple_choice\', \'multiple_choice\', \'translation_match\')');
        await queryRunner.query('ALTER TABLE "exercise_template" ALTER COLUMN "type" TYPE "public"."ExerciseType_old" USING "type"::"text"::"public"."ExerciseType_old"');
        await queryRunner.query('DROP TYPE "public"."ExerciseType"');
        await queryRunner.query('ALTER TYPE "public"."ExerciseType_old" RENAME TO "ExerciseType"');
        await queryRunner.query('ALTER TABLE "exercise_template" DROP COLUMN "answer_source"');
        await queryRunner.query('DROP TYPE "public"."QuestionSource"');
        await queryRunner.query('ALTER TABLE "exercise_template" DROP COLUMN "generation_type"');
        await queryRunner.query('DROP TYPE "public"."GenerationType"');
    }

}
