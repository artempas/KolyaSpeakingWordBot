import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWordTranslation1752853928790 implements MigrationInterface {
    name = 'AddWordTranslation1752853928790';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "word" ADD "translation" character varying');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "word" DROP COLUMN "translation"');
    }

}
