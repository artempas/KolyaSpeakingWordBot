import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMessageDirection1752434377280 implements MigrationInterface {
    name = 'AddMessageDirection1752434377280'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM message`);
        await queryRunner.query(`CREATE TYPE "public"."message_direction_enum" AS ENUM('in', 'out')`);
        await queryRunner.query(`ALTER TABLE "message" ADD "direction" "public"."message_direction_enum" NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "message" DROP COLUMN "direction"`);
        await queryRunner.query(`DROP TYPE "public"."message_direction_enum"`);
    }

}
