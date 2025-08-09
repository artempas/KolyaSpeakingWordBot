import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStart1754763356267 implements MigrationInterface {
    name = 'AddStart1754763356267';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TYPE "public"."user_position_enum" RENAME TO "user_position_enum_old"');
        await queryRunner.query('CREATE TYPE "public"."user_position_enum" AS ENUM(\'START\', \'MENU\', \'VOCABULARY\', \'ADD_WORD\', \'REMOVE_WORD\', \'EXERCISE\', \'SETTINGS\', \'MULTIPLE_CHOICE\', \'MATCHING\')');
        await queryRunner.query('ALTER TABLE "user" ALTER COLUMN "position" DROP DEFAULT');
        await queryRunner.query('ALTER TABLE "user" ALTER COLUMN "position" TYPE "public"."user_position_enum"[] USING "position"::"text"::"public"."user_position_enum"[]');
        await queryRunner.query('ALTER TABLE "user" ALTER COLUMN "position" SET DEFAULT \'{START}\'');
        await queryRunner.query('DROP TYPE "public"."user_position_enum_old"');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('CREATE TYPE "public"."user_position_enum_old" AS ENUM(\'MENU\', \'VOCABULARY\', \'ADD_WORD\', \'REMOVE_WORD\', \'EXERCISE\', \'SETTINGS\', \'MULTIPLE_CHOICE\', \'MATCHING\')');
        await queryRunner.query('ALTER TABLE "user" ALTER COLUMN "position" DROP DEFAULT');
        await queryRunner.query('ALTER TABLE "user" ALTER COLUMN "position" TYPE "public"."user_position_enum_old"[] USING "position"::"text"::"public"."user_position_enum_old"[]');
        await queryRunner.query('ALTER TABLE "user" ALTER COLUMN "position" SET DEFAULT \'{MENU}\'');
        await queryRunner.query('DROP TYPE "public"."user_position_enum"');
        await queryRunner.query('ALTER TYPE "public"."user_position_enum_old" RENAME TO "user_position_enum"');
    }

}
