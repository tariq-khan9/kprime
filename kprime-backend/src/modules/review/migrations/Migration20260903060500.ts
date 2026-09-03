import { Migration } from "@medusajs/framework/mikro-orm/migrations";

/**
 * Scopes the one-review-per-order-per-product rule to top-level reviews.
 *
 * Written by hand: `db:generate` reports "no changes detected" for a change to
 * an index's `where` clause, so the model and the database would otherwise
 * disagree silently.
 *
 * The original index covered every row. A merchant reply copies its parent's
 * `order_id` and `product_id`, so replying to any review failed with a unique
 * violation — reproduced against the live database before this was written.
 */
export class Migration20260903060500 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `drop index if exists "IDX_review_order_id_product_id_unique";`
    );
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_review_order_id_product_id_unique" ` +
        `ON "review" ("order_id", "product_id") ` +
        `WHERE parent_id IS NULL AND deleted_at IS NULL;`
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      `drop index if exists "IDX_review_order_id_product_id_unique";`
    );
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_review_order_id_product_id_unique" ` +
        `ON "review" ("order_id", "product_id") WHERE deleted_at IS NULL;`
    );
  }
}
