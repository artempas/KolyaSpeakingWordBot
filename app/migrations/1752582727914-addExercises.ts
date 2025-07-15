import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExercises1752582727914 implements MigrationInterface {
    name = 'AddExercises1752582727914';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "message" RENAME COLUMN "createdAt" TO "created_at"');
        await queryRunner.query('ALTER TABLE "user" RENAME COLUMN "createdAt" TO "created_at"');
        await queryRunner.query('ALTER TABLE "word" RENAME COLUMN "createdAt" TO "created_at"');
        await queryRunner.query('CREATE TYPE "public"."exercise_status_enum" AS ENUM(\'GENERATED\', \'ASKED\', \'ANSWERED\')');
        await queryRunner.query('CREATE TABLE "exercise" ("id" SERIAL NOT NULL, "user_id" integer NOT NULL, "template_id" integer NOT NULL, "status" "public"."exercise_status_enum" NOT NULL, "generated" jsonb NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a0f107e3a2ef2742c1e91d97c14" PRIMARY KEY ("id"))');
        await queryRunner.query('CREATE TABLE "answer" ("id" SERIAL NOT NULL, "exercise_id" integer NOT NULL, "word_id" integer NOT NULL, "is_correct" boolean, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_9232db17b63fb1e94f97e5c224f" PRIMARY KEY ("id"))');
        await queryRunner.query('ALTER TABLE "exercise_template" ADD "is_active" boolean NOT NULL DEFAULT \'TRUE\'');
        await queryRunner.query('ALTER TABLE "exercise_template" ALTER COLUMN "max_words" SET NOT NULL');
        await queryRunner.query('ALTER TYPE "public"."exercise_template_type_enum" RENAME TO "exercise_template_type_enum_old"');
        await queryRunner.query('CREATE TYPE "public"."ExerciseType" AS ENUM(\'text_with_multiple_choice\', \'multiple_choice\')');
        await queryRunner.query('ALTER TABLE "exercise_template" ALTER COLUMN "type" TYPE "public"."ExerciseType" USING "type"::"text"::"public"."ExerciseType"');
        await queryRunner.query('DROP TYPE "public"."exercise_template_type_enum_old"');
        await queryRunner.query('ALTER TABLE "exercise" ADD CONSTRAINT "FK_486d56516b64030a655861e1aa9" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION');
        await queryRunner.query('ALTER TABLE "exercise" ADD CONSTRAINT "FK_d45f4023337894e8fe56520ae03" FOREIGN KEY ("template_id") REFERENCES "exercise_template"("id") ON DELETE NO ACTION ON UPDATE NO ACTION');
        await queryRunner.query('ALTER TABLE "answer" ADD CONSTRAINT "FK_d19cb956239272bc44001071274" FOREIGN KEY ("word_id") REFERENCES "word"("id") ON DELETE NO ACTION ON UPDATE NO ACTION');
        await queryRunner.query('ALTER TABLE "answer" ADD CONSTRAINT "FK_7986a9d853c64800fda9515f673" FOREIGN KEY ("exercise_id") REFERENCES "exercise"("id") ON DELETE NO ACTION ON UPDATE NO ACTION');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "answer" DROP CONSTRAINT "FK_7986a9d853c64800fda9515f673"');
        await queryRunner.query('ALTER TABLE "answer" DROP CONSTRAINT "FK_d19cb956239272bc44001071274"');
        await queryRunner.query('ALTER TABLE "exercise" DROP CONSTRAINT "FK_d45f4023337894e8fe56520ae03"');
        await queryRunner.query('ALTER TABLE "exercise" DROP CONSTRAINT "FK_486d56516b64030a655861e1aa9"');
        await queryRunner.query('CREATE TYPE "public"."exercise_template_type_enum_old" AS ENUM(\'0\', \'1\')');
        await queryRunner.query('ALTER TABLE "exercise_template" ALTER COLUMN "type" TYPE "public"."exercise_template_type_enum_old" USING "type"::"text"::"public"."exercise_template_type_enum_old"');
        await queryRunner.query('DROP TYPE "public"."ExerciseType"');
        await queryRunner.query('ALTER TYPE "public"."exercise_template_type_enum_old" RENAME TO "exercise_template_type_enum"');
        await queryRunner.query('ALTER TABLE "exercise_template" ALTER COLUMN "max_words" DROP NOT NULL');
        await queryRunner.query('ALTER TABLE "exercise_template" DROP COLUMN "is_active"');
        await queryRunner.query('DROP TABLE "answer"');
        await queryRunner.query('DROP TABLE "exercise"');
        await queryRunner.query('DROP TYPE "public"."exercise_status_enum"');
        await queryRunner.query('ALTER TABLE "word" RENAME COLUMN "created_at" TO "createdAt"');
        await queryRunner.query('ALTER TABLE "user" RENAME COLUMN "created_at" TO "createdAt"');
        await queryRunner.query('ALTER TABLE "message" RENAME COLUMN "created_at" TO "createdAt"');
    }

}
