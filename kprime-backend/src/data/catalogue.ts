/**
 * The category tree. Two levels: top category → subcategory.
 *
 * Categories only — no products are seeded. Products are added by hand in the
 * admin and assigned to a subcategory.
 */
export const CATEGORY_TREE: Record<string, string[]> = {
  Electronics: ["Home Appliances", "Home Entertainment", "Computers & Laptops"],
  Cosmetics: ["Makeup", "Skincare", "Hair Care", "Fragrance", "Gift Sets"],
  Kitchenware: [
    "Cookware & Bakeware",
    "Kitchen Tools & Cutlery",
    "Tableware & Drinkware",
    "Kitchen Appliances",
  ],
  "Home & Bedding": ["Bedding", "Home Textiles", "Home Decor"],
};

/**
 * Explicit category handles. Medusa's auto-slug keeps "&" verbatim, so
 * "Home & Bedding" becomes the handle "home-&-bedding" and lands an ampersand in
 * the URL path. Spell "and" out instead.
 */
export const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
