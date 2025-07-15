import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddQuestionFields1752600646424 implements MigrationInterface {
    name = 'AddQuestionFields1752600646424';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "exercise" DROP CONSTRAINT "FK_d45f4023337894e8fe56520ae03"');
        await queryRunner.query('ALTER TABLE "exercise" DROP CONSTRAINT "FK_486d56516b64030a655861e1aa9"');
        await queryRunner.query('ALTER TABLE "question" DROP CONSTRAINT "FK_7986a9d853c64800fda9515f673"');
        await queryRunner.query('ALTER TABLE "question" DROP CONSTRAINT "FK_d19cb956239272bc44001071274"');
        await queryRunner.query('ALTER TABLE "question" ADD "text" character varying NOT NULL');
        await queryRunner.query('ALTER TABLE "question" ADD "options" text array NOT NULL');
        await queryRunner.query('ALTER TABLE "question" ADD "correct_idx" integer NOT NULL');
        await queryRunner.query('ALTER TABLE "exercise" ALTER COLUMN "template_id" DROP NOT NULL');
        await queryRunner.query('ALTER TYPE "public"."user_position_enum" RENAME TO "user_position_enum_old"');
        await queryRunner.query('CREATE TYPE "public"."user_position_enum" AS ENUM(\'MENU\', \'VOCABULARY\', \'ADD_WORD\', \'REMOVE_WORD\', \'EXERCISE\')');
        await queryRunner.query('ALTER TABLE "user" ALTER COLUMN "position" DROP DEFAULT');
        await queryRunner.query('ALTER TABLE "user" ALTER COLUMN "position" TYPE "public"."user_position_enum"[] USING "position"::"text"::"public"."user_position_enum"[]');
        await queryRunner.query('ALTER TABLE "user" ALTER COLUMN "position" SET DEFAULT \'{MENU}\'');
        await queryRunner.query('DROP TYPE "public"."user_position_enum_old"');
        await queryRunner.query('CREATE SEQUENCE IF NOT EXISTS "question_id_seq" OWNED BY "question"."id"');
        await queryRunner.query('ALTER TABLE "question" ALTER COLUMN "id" SET DEFAULT nextval(\'"question_id_seq"\')');
        await queryRunner.query('ALTER TABLE "exercise" ADD CONSTRAINT "FK_486d56516b64030a655861e1aa9" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE');
        await queryRunner.query('ALTER TABLE "exercise" ADD CONSTRAINT "FK_d45f4023337894e8fe56520ae03" FOREIGN KEY ("template_id") REFERENCES "exercise_template"("id") ON DELETE SET NULL ON UPDATE SET NULL');
        await queryRunner.query('ALTER TABLE "question" ADD CONSTRAINT "FK_6877ef7ed73e1f6448aa2dc84bb" FOREIGN KEY ("word_id") REFERENCES "word"("id") ON DELETE CASCADE ON UPDATE CASCADE');
        await queryRunner.query('ALTER TABLE "question" ADD CONSTRAINT "FK_f7956a1febe4ea2d4ea9acecb75" FOREIGN KEY ("exercise_id") REFERENCES "exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "question" DROP CONSTRAINT "FK_f7956a1febe4ea2d4ea9acecb75"');
        await queryRunner.query('ALTER TABLE "question" DROP CONSTRAINT "FK_6877ef7ed73e1f6448aa2dc84bb"');
        await queryRunner.query('ALTER TABLE "exercise" DROP CONSTRAINT "FK_d45f4023337894e8fe56520ae03"');
        await queryRunner.query('ALTER TABLE "exercise" DROP CONSTRAINT "FK_486d56516b64030a655861e1aa9"');
        await queryRunner.query('ALTER TABLE "question" ALTER COLUMN "id" DROP DEFAULT');
        await queryRunner.query('DROP SEQUENCE "question_id_seq"');
        await queryRunner.query('CREATE TYPE "public"."user_position_enum_old" AS ENUM(\'MENU\', \'VOCABULARY\', \'ADD_WORD\', \'REMOVE_WORD\')');
        await queryRunner.query('ALTER TABLE "user" ALTER COLUMN "position" DROP DEFAULT');
        await queryRunner.query('ALTER TABLE "user" ALTER COLUMN "position" TYPE "public"."user_position_enum_old"[] USING "position"::"text"::"public"."user_position_enum_old"[]');
        await queryRunner.query('ALTER TABLE "user" ALTER COLUMN "position" SET DEFAULT \'{MENU}\'');
        await queryRunner.query('DROP TYPE "public"."user_position_enum"');
        await queryRunner.query('ALTER TYPE "public"."user_position_enum_old" RENAME TO "user_position_enum"');
        await queryRunner.query('ALTER TABLE "exercise" ALTER COLUMN "template_id" SET NOT NULL');
        await queryRunner.query('ALTER TABLE "question" DROP COLUMN "correct_idx"');
        await queryRunner.query('ALTER TABLE "question" DROP COLUMN "options"');
        await queryRunner.query('ALTER TABLE "question" DROP COLUMN "text"');
        await queryRunner.query('ALTER TABLE "question" ADD CONSTRAINT "FK_d19cb956239272bc44001071274" FOREIGN KEY ("word_id") REFERENCES "word"("id") ON DELETE NO ACTION ON UPDATE NO ACTION');
        await queryRunner.query('ALTER TABLE "question" ADD CONSTRAINT "FK_7986a9d853c64800fda9515f673" FOREIGN KEY ("exercise_id") REFERENCES "exercise"("id") ON DELETE NO ACTION ON UPDATE NO ACTION');
        await queryRunner.query('ALTER TABLE "exercise" ADD CONSTRAINT "FK_486d56516b64030a655861e1aa9" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION');
        await queryRunner.query('ALTER TABLE "exercise" ADD CONSTRAINT "FK_d45f4023337894e8fe56520ae03" FOREIGN KEY ("template_id") REFERENCES "exercise_template"("id") ON DELETE NO ACTION ON UPDATE NO ACTION');
    }

}
