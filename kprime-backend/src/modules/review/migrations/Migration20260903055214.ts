import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260903055214 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "review" add column if not exists "reviewer_name" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "review" drop column if exists "reviewer_name";`);
  }

}
