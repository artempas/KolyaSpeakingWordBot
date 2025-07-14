import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1752404819767 implements MigrationInterface {
    name = 'Init1752404819767';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
        await queryRunner.query('CREATE TABLE "adminUser" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "username" character varying(50) NOT NULL, "password" character varying(128) NOT NULL, CONSTRAINT "UQ_58bd2b086488ba1ba90847a192e" UNIQUE ("username"), CONSTRAINT "PK_f155e50a944f2658dc1ccb477a2" PRIMARY KEY ("id"))');
        await queryRunner.query('CREATE TABLE "word" ("id" SERIAL NOT NULL, "user_id" integer NOT NULL, "word" character varying NOT NULL, "meaning" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ad026d65e30f80b7056ca31f666" PRIMARY KEY ("id"))');
        await queryRunner.query('CREATE TYPE "public"."user_position_enum" AS ENUM(\'MENU\', \'VOCABULARY\', \'ADD_WORD\', \'REMOVE_WORD\')');
        await queryRunner.query('CREATE TABLE "user" ("id" SERIAL NOT NULL, "telegram_id" integer NOT NULL, "username" character varying, "first_name" character varying, "last_name" character varying, "context" json NOT NULL DEFAULT \'{}\', "position" "public"."user_position_enum" array NOT NULL DEFAULT \'{MENU}\', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_c1ed111fba8a34b812d11f42352" UNIQUE ("telegram_id"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))');
        await queryRunner.query('CREATE TABLE "message" ("id" SERIAL NOT NULL, "telegram_id" character varying NOT NULL, "user_id" integer NOT NULL, "content" json NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ba01f0a3e0123651915008bc578" PRIMARY KEY ("id"))');
        await queryRunner.query('ALTER TABLE "word" ADD CONSTRAINT "FK_1c83814fa8345d290cccefdc705" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE');
        await queryRunner.query('ALTER TABLE "message" ADD CONSTRAINT "FK_54ce30caeb3f33d68398ea10376" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "message" DROP CONSTRAINT "FK_54ce30caeb3f33d68398ea10376"');
        await queryRunner.query('ALTER TABLE "word" DROP CONSTRAINT "FK_1c83814fa8345d290cccefdc705"');
        await queryRunner.query('DROP TABLE "message"');
        await queryRunner.query('DROP TABLE "user"');
        await queryRunner.query('DROP TYPE "public"."user_position_enum"');
        await queryRunner.query('DROP TABLE "word"');
        await queryRunner.query('DROP TABLE "adminUser"');
    }

}
