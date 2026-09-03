import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260903054319 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "review" add column if not exists "parent_id" text null;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_review_parent_id" ON "review" ("parent_id") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "IDX_review_parent_id";`);
    this.addSql(`alter table if exists "review" drop column if exists "parent_id";`);
  }

}
