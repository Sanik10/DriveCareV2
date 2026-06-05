import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUpdatedByToOrders1759999999999 implements MigrationInterface {
  name = 'AddUpdatedByToOrders1759999999999'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1️⃣ Добавляем колонку
    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD COLUMN "updatedBy" uuid
    `);

    // 2️⃣ Добавляем индекс (по желанию, но правильно)
    await queryRunner.query(`
      CREATE INDEX "IDX_orders_updatedBy"
      ON "orders" ("updatedBy")
    `);

    // 3️⃣ Добавляем foreign key
    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD CONSTRAINT "FK_orders_updatedBy_user"
      FOREIGN KEY ("updatedBy")
      REFERENCES "users"("id")
      ON DELETE SET NULL
      ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "orders"
      DROP CONSTRAINT "FK_orders_updatedBy_user"
    `);

    await queryRunner.query(`
      DROP INDEX "public"."IDX_orders_updatedBy"
    `);

    await queryRunner.query(`
      ALTER TABLE "orders"
      DROP COLUMN "updatedBy"
    `);
  }
}
