/**
 * The whole demo catalogue, composed rather than hand-written.
 *
 * **One source of truth for two consumers.** `seed-catalogue.ts` turns this into
 * products; `tools/generate-placeholders.py` turns it into the placeholder
 * images that print each product's own filterable attributes. If the two ever
 * disagreed, every image in the shop would be a lie and the filters could not be
 * checked by eye — which is the only reason this catalogue is large. So the
 * Python side reads `static/catalogue.json`, exported from here, instead of
 * reimplementing the composition.
 *
 * **Deterministic on purpose.** No `Math.random()` anywhere: tags and ratings
 * cycle off the product's index. A re-run reproduces byte-identical output, so
 * images stay correct without regenerating them.
 *
 * Option titles and values are governed by `OPTION-SHEET.md`, which is frozen.
 * `Volume` and `Diameter`, never `Size`. `Colour`, never `Color`.
 *
 * ---
 *
 * **THE ONE RULE THAT MATTERS HERE: a leaf category is option-uniform.**
 *
 * Every product in a leaf carries the same option titles. That is what lets the
 * storefront show `Wattage` on `/categories/chargers` and hide it on
 * `/categories/mobile-accessories`, where it would apply to only a quarter of
 * the shelf. `COVERAGE_THRESHOLD` (0.6) is what enforces it, and it only works
 * because leaves are uniform — a leaf with mixed options would start hiding its
 * own filters. Adding a product with a different option set to an existing leaf
 * is therefore a bug, not a variation.
 */

export type VariantOption = {
  /** Option name shown on the product page, e.g. "Capacity" or "Bed Size". */
  title: string;
  values: string[];
};

export type ProductBlueprint = {
  title: string;
  handle: string;
  description: string;
  /** Leaf category name — the deepest level, e.g. "Chargers". */
  category: string;
  /** Top-level category, carried through for the image generator's tinting. */
  topCategory: string;
  /** Coarser grouping than category, used for filtering. */
  type: string;
  tags: string[];
  weight: number;
  /** Prefix for generated variant SKUs. */
  skuBase: string;
  /** Variant price in whole rupees — PKR has no minor unit. */
  price: number;
  /** Variant axes. Variants are the cartesian product of these. */
  options: VariantOption[];
  /** Category-specific specs, rendered as a table on the product page. */
  specs: Record<string, string>;
  /** Denormalised for the rating filter; mirrored into product metadata. */
  averageRating: number;
  reviewCount: number;
};

/**
 * Three levels: top → subcategory → leaf.
 *
 * The last four carry products directly and have no children on purpose. They
 * are the test cases for `MIN_PRODUCTS_FOR_FILTERS` — Stationery (2) and
 * Health & Wellness (1) must show sort and no filter sidebar at all.
 */
export const CATEGORY_TREE: Record<string, Record<string, string[]>> = {
  Electronics: {
    "Mobile Accessories": ["Chargers", "Cables", "Power Banks", "Mounts & Wireless"],
    Audio: ["Headphones & Earphones", "Speakers & Microphones"],
    "Computer Accessories": ["Keyboards", "Mice", "Laptop Accessories"],
  },
  Cosmetics: {
    Skincare: ["Serums", "Cleansers", "Moisturisers", "Sunscreens & Masks"],
    Makeup: ["Lip Makeup", "Face Makeup", "Eye Makeup"],
    Fragrances: ["Perfumes", "Attars & Body Mists"],
  },
  Kitchenware: {
    Cookware: ["Frying Pans", "Pots & Karahi", "Tawa & Griddles"],
    "Kitchen Appliances": ["Kettles", "Blenders & Juicers", "Cookers & Fryers"],
    "Storage & Containers": ["Food Containers", "Jars & Canisters", "Lunch Boxes"],
  },
  "Home & Bedding": {
    Bedsheets: ["Bed Sheet Sets", "Duvets & Covers", "Mattress Protectors"],
    "Pillows & Blankets": ["Pillows", "Blankets", "Cushions & Inserts"],
  },
  "Sports & Outdoors": {},
  "Toys & Games": {},
  Stationery: {},
  "Health & Wellness": {},
};

/** Cross-category tags — how a shopper filters across unrelated categories. */
export const PRODUCT_TAGS = [
  "Imported",
  "Bestseller",
  "New Arrival",
  "Warranty Included",
];

export const skuPart = (value: string) =>
  value.toUpperCase().replace(/[^A-Z0-9]/g, "");

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

/** A product before the boilerplate (handle, sku, tags, rating) is filled in. */
type Model = {
  title: string;
  price: number;
  options: VariantOption[];
  /** Overrides the group's default type. */
  type?: string;
  specs?: Record<string, string>;
  weight?: number;
};

type Group = {
  /** Leaf category name. Must appear in CATEGORY_TREE. */
  category: string;
  /** Default product type for every model in the group. */
  type: string;
  /** Three letters, prefixed to every SKU in the group. */
  code: string;
  /** `%s` is replaced with the product title. */
  blurb: string;
  models: Model[];
};

const C = (...values: string[]): VariantOption => ({ title: "Colour", values });

const opt = (title: string, ...values: string[]): VariantOption => ({
  title,
  values,
});

/**
 * Ratings cycle through this rather than being random, so the rating filter has
 * a predictable spread at every threshold and the counts can be reasoned about.
 */
const RATINGS: [number, number][] = [
  [5, 12],
  [4.5, 8],
  [4, 21],
  [3.5, 5],
  [5, 3],
  [4, 9],
  [4.5, 16],
  [3, 4],
  [5, 7],
  [4, 2],
];

/**
 * Coverage is designed, not incidental.
 *
 * Within a leaf every option sits at 100% and always renders. One level up, an
 * option that belongs to a single leaf lands near 25% and is hidden by the 0.6
 * threshold — which is the whole point: `Wattage` is a charger fact, not a
 * mobile-accessory fact. `Colour` is deliberately given to every leaf under
 * Mobile Accessories so it survives at the subcategory level and the sidebar is
 * never empty.
 */
const GROUPS: Group[] = [
  // ============================ Electronics > Mobile Accessories ============
  {
    category: "Chargers",
    type: "Power & Charging",
    code: "CHG",
    blurb: "%s — sized for a Pakistani wall socket, and it survives the voltage swings.",
    models: [
      { title: "18W Basic Wall Charger", price: 1100, options: [opt("Wattage", "18W"), C("White")] },
      { title: "20W USB-C Wall Charger", price: 1450, options: [opt("Wattage", "20W"), C("White", "Black")] },
      { title: "25W Fast Wall Charger", price: 1750, options: [opt("Wattage", "25W"), C("White")] },
      { title: "30W Compact Wall Charger", price: 1950, options: [opt("Wattage", "30W"), C("Black")] },
      { title: "45W GaN Wall Charger", price: 2200, options: [opt("Wattage", "45W"), C("White", "Black")] },
      { title: "65W Dual-Port Wall Charger", price: 3400, options: [opt("Wattage", "65W"), C("Black")] },
      { title: "100W Desktop Charger", price: 6200, options: [opt("Wattage", "100W"), C("Black", "Silver")] },
      { title: "30W Car Charger", price: 1250, options: [opt("Wattage", "30W"), C("Black")] },
      { title: "45W Dual Car Charger", price: 1850, options: [opt("Wattage", "45W"), C("Black", "Silver")] },
      { title: "20W Travel Charger with Adapter", price: 2400, options: [opt("Wattage", "20W"), C("White")] },
      { title: "65W Laptop Power Adapter", price: 4900, options: [opt("Wattage", "65W"), C("Black")] },
      { title: "100W Four-Port Charging Station", price: 8600, options: [opt("Wattage", "100W"), C("Black", "White")] },
    ],
  },
  {
    category: "Cables",
    type: "Cables & Connectors",
    code: "CBL",
    blurb: "%s — braided, because the cheap ones always fray at the connector first.",
    models: [
      { title: "Braided USB-C Cable", price: 560, options: [opt("Length", "1m", "2m"), C("Grey", "Black")] },
      { title: "Braided Lightning Cable", price: 780, options: [opt("Length", "1m", "2m"), C("White")] },
      { title: "Micro-USB Charging Cable", price: 320, options: [opt("Length", "1m"), C("Black")] },
      { title: "3m USB-C Charging Cable", price: 890, options: [opt("Length", "3m"), C("Black", "White")] },
      { title: "Short Sync Cable", price: 290, options: [opt("Length", "0.5m"), C("Grey")] },
      { title: "USB-C to USB-C 100W Cable", price: 1200, options: [opt("Length", "1.5m", "2m"), C("Black")] },
      { title: "Right-Angle Gaming Cable", price: 950, options: [opt("Length", "1.5m"), C("Red", "Black")] },
      { title: "Nylon Lightning Cable 3m", price: 1150, options: [opt("Length", "3m"), C("White", "Grey")] },
      { title: "USB-A to USB-C Cable", price: 420, options: [opt("Length", "1m"), C("Black", "White")] },
      { title: "Magnetic Charging Cable", price: 1350, options: [opt("Length", "1m", "2m"), C("Black")] },
      { title: "Coiled Desk Cable", price: 1050, options: [opt("Length", "0.5m"), C("Grey", "Navy")] },
      { title: "Flat Anti-Tangle Cable", price: 640, options: [opt("Length", "1.5m"), C("White")] },
    ],
  },
  {
    category: "Power Banks",
    type: "Power & Charging",
    code: "PWB",
    blurb: "%s — enough charge for a load-shedding evening with the router still running.",
    models: [
      { title: "5000mAh Pocket Power Bank", price: 2100, options: [opt("Capacity", "5000mAh"), C("White", "Blue")] },
      { title: "10000mAh Slim Power Bank", price: 3200, options: [opt("Capacity", "10000mAh"), C("Black", "White")] },
      { title: "10000mAh Magnetic Power Bank", price: 4400, options: [opt("Capacity", "10000mAh"), C("Black")] },
      { title: "20000mAh Fast Power Bank", price: 4500, options: [opt("Capacity", "20000mAh"), C("Black", "Navy")] },
      { title: "20000mAh Digital Display Power Bank", price: 5300, options: [opt("Capacity", "20000mAh"), C("Black")] },
      { title: "30000mAh Travel Power Bank", price: 6900, options: [opt("Capacity", "30000mAh"), C("Black")] },
      { title: "30000mAh Laptop Power Bank", price: 9800, options: [opt("Capacity", "30000mAh"), C("Black", "Grey")] },
      { title: "10000mAh Solar Power Bank", price: 5100, options: [opt("Capacity", "10000mAh"), C("Green", "Black")] },
      { title: "5000mAh Lipstick Power Bank", price: 1900, options: [opt("Capacity", "5000mAh"), C("Red", "Silver")] },
      { title: "20000mAh Rugged Power Bank", price: 6400, options: [opt("Capacity", "20000mAh"), C("Black", "Green")] },
      { title: "5000mAh Built-In Cable Power Bank", price: 2600, options: [opt("Capacity", "5000mAh"), C("White")] },
    ],
  },
  {
    category: "Mounts & Wireless",
    type: "Phone Mounts",
    code: "MNT",
    blurb: "%s — holds through a Karachi pothole, which is the only test that matters.",
    models: [
      { title: "Magnetic Car Mount", price: 1100, options: [C("Black", "Silver"), opt("Connection", "Wired")] },
      { title: "Dashboard Phone Holder", price: 1450, options: [C("Black"), opt("Connection", "Wired")] },
      { title: "Air Vent Phone Clip", price: 850, options: [C("Black", "Grey"), opt("Connection", "Wired")] },
      { title: "Wireless Charging Pad", price: 2600, options: [C("Black", "White"), opt("Connection", "Wireless")] },
      { title: "Wireless Charging Stand", price: 3300, options: [C("Black"), opt("Connection", "Wireless")] },
      { title: "3-in-1 Wireless Charging Dock", price: 6800, options: [C("Black", "White"), opt("Connection", "Wireless")] },
      { title: "Magnetic Wireless Car Charger", price: 4200, options: [C("Black"), opt("Connection", "Wireless")] },
      { title: "Adjustable Desk Phone Stand", price: 1250, options: [C("Silver", "Black"), opt("Connection", "Wired")] },
      { title: "Bike Handlebar Mount", price: 1650, options: [C("Black"), opt("Connection", "Wired")] },
      { title: "Foldable Travel Charging Stand", price: 2950, options: [C("White", "Grey"), opt("Connection", "Wireless")] },
    ],
  },
  // ==================================== Electronics > Audio =================
  {
    category: "Headphones & Earphones",
    type: "Headphones",
    code: "HPH",
    blurb: "%s — tuned for traffic noise and a ceiling fan, which is where it will be used.",
    models: [
      { title: "Wireless Noise-Cancelling Earbuds", price: 8900, options: [opt("Connection", "Wireless"), opt("Fit", "In-Ear")] },
      { title: "True Wireless Sport Earbuds", price: 5400, options: [opt("Connection", "Wireless"), opt("Fit", "In-Ear")] },
      { title: "Budget True Wireless Earbuds", price: 2800, options: [opt("Connection", "Wireless"), opt("Fit", "In-Ear")] },
      { title: "Over-Ear Studio Headphones", price: 12500, options: [opt("Connection", "Wired"), opt("Fit", "Over-Ear")] },
      { title: "Bluetooth Over-Ear Headphones", price: 7300, options: [opt("Connection", "Bluetooth"), opt("Fit", "Over-Ear")] },
      { title: "Active Noise-Cancelling Headphones", price: 16400, options: [opt("Connection", "Bluetooth"), opt("Fit", "Over-Ear")] },
      { title: "On-Ear Foldable Headphones", price: 4200, options: [opt("Connection", "Wireless"), opt("Fit", "On-Ear")] },
      { title: "On-Ear Kids Headphones", price: 2600, options: [opt("Connection", "Wired"), opt("Fit", "On-Ear")] },
      { title: "Wired In-Ear Earphones", price: 1300, options: [opt("Connection", "Wired"), opt("Fit", "In-Ear")] },
      { title: "In-Ear Monitors with Mic", price: 3900, options: [opt("Connection", "Wired"), opt("Fit", "In-Ear")] },
      { title: "Gaming Headset", price: 6800, options: [opt("Connection", "Wired"), opt("Fit", "Over-Ear")] },
      { title: "Wireless Gaming Headset", price: 11200, options: [opt("Connection", "Wireless"), opt("Fit", "Over-Ear")] },
      { title: "Sports Neckband Earphones", price: 2900, options: [opt("Connection", "Bluetooth"), opt("Fit", "In-Ear")] },
      { title: "Open-Ear Bone Conduction Headset", price: 9600, options: [opt("Connection", "Bluetooth"), opt("Fit", "On-Ear")] },
      { title: "Studio Monitoring Headphones", price: 14800, options: [opt("Connection", "Wired"), opt("Fit", "Over-Ear")] },
      { title: "Sleep Earbuds", price: 3400, options: [opt("Connection", "Bluetooth"), opt("Fit", "In-Ear")] },
    ],
  },
  {
    category: "Speakers & Microphones",
    type: "Speakers & Mics",
    code: "SPK",
    blurb: "%s — loud enough for a rooftop gathering without turning to mush.",
    models: [
      { title: "Portable Bluetooth Speaker", price: 5600, options: [opt("Connection", "Bluetooth"), C("Black", "Blue")] },
      { title: "Mini Bluetooth Speaker", price: 2400, options: [opt("Connection", "Bluetooth"), C("Red", "Black")] },
      { title: "Party Bluetooth Speaker", price: 15900, options: [opt("Connection", "Bluetooth"), C("Black")] },
      { title: "Waterproof Shower Speaker", price: 3100, options: [opt("Connection", "Bluetooth"), C("Blue", "White")] },
      { title: "Soundbar for TV", price: 18500, options: [opt("Connection", "Bluetooth"), C("Black")] },
      { title: "Soundbar with Subwoofer", price: 27400, options: [opt("Connection", "Bluetooth"), C("Black")] },
      { title: "Bookshelf Speaker Pair", price: 21800, options: [opt("Connection", "Wired"), C("Brown", "Black")] },
      { title: "Desktop Computer Speakers", price: 4700, options: [opt("Connection", "Wired"), C("Black")] },
      { title: "USB Desk Microphone", price: 7100, options: [opt("Connection", "Wired"), C("Black", "Silver")] },
      { title: "Condenser Studio Microphone", price: 13600, options: [opt("Connection", "Wired"), C("Silver")] },
      { title: "Clip-On Lapel Microphone", price: 1800, options: [opt("Connection", "Wired"), C("Black")] },
      { title: "Wireless Lapel Microphone Set", price: 8900, options: [opt("Connection", "Wireless"), C("Black", "White")] },
      { title: "Podcast Microphone Bundle", price: 16700, options: [opt("Connection", "Wired"), C("Black")] },
      { title: "Karaoke Microphone Speaker", price: 4300, options: [opt("Connection", "Bluetooth"), C("Gold", "Black")] },
    ],
  },
  // ====================== Electronics > Computer Accessories =================
  {
    category: "Keyboards",
    type: "Keyboards",
    code: "KBD",
    blurb: "%s — built for a desk that is used all day, every day.",
    models: [
      { title: "Mechanical Keyboard TKL", price: 9800, options: [opt("Switch Type", "Blue", "Brown"), opt("Layout", "TKL")] },
      { title: "60% Mechanical Keyboard", price: 8200, options: [opt("Switch Type", "Red"), opt("Layout", "60%")] },
      { title: "Full Size Mechanical Keyboard", price: 11400, options: [opt("Switch Type", "Brown"), opt("Layout", "Full Size")] },
      { title: "75% Wireless Keyboard", price: 10600, options: [opt("Switch Type", "Silent Red"), opt("Layout", "75%")] },
      { title: "Hot-Swap TKL Keyboard", price: 13200, options: [opt("Switch Type", "Brown", "Red"), opt("Layout", "TKL")] },
      { title: "Compact 60% Gaming Keyboard", price: 9100, options: [opt("Switch Type", "Blue"), opt("Layout", "60%")] },
      { title: "Low-Profile Full Size Keyboard", price: 7400, options: [opt("Switch Type", "Silent Red"), opt("Layout", "Full Size")] },
      { title: "RGB Mechanical Keyboard", price: 12800, options: [opt("Switch Type", "Blue"), opt("Layout", "Full Size")] },
      { title: "Silent Office Keyboard", price: 6300, options: [opt("Switch Type", "Silent Red"), opt("Layout", "TKL")] },
      { title: "75% Hot-Swap Keyboard", price: 11900, options: [opt("Switch Type", "Brown"), opt("Layout", "75%")] },
      { title: "Wireless 60% Keyboard", price: 8800, options: [opt("Switch Type", "Red"), opt("Layout", "60%")] },
    ],
  },
  {
    category: "Mice",
    type: "Mice & Pointing",
    code: "MSE",
    blurb: "%s — the click still feels right after a year of use.",
    models: [
      { title: "Silent Wireless Mouse", price: 2400, options: [opt("Connection", "Wireless"), C("Black", "Grey")] },
      { title: "Ergonomic Vertical Mouse", price: 4300, options: [opt("Connection", "Wireless"), C("Black")] },
      { title: "Gaming Mouse", price: 5900, options: [opt("Connection", "Wired"), C("Black")] },
      { title: "Lightweight Gaming Mouse", price: 7200, options: [opt("Connection", "Wired"), C("White", "Black")] },
      { title: "Bluetooth Travel Mouse", price: 1900, options: [opt("Connection", "Bluetooth"), C("Grey", "Navy")] },
      { title: "Trackball Mouse", price: 6600, options: [opt("Connection", "Wireless"), C("Black")] },
      { title: "Multi-Device Bluetooth Mouse", price: 5400, options: [opt("Connection", "Bluetooth"), C("Grey", "White")] },
      { title: "Wired Office Mouse", price: 950, options: [opt("Connection", "Wired"), C("Black")] },
      { title: "Rechargeable Wireless Mouse", price: 3300, options: [opt("Connection", "Wireless"), C("Silver", "Black")] },
      { title: "Wireless Mouse and Keypad Set", price: 4800, options: [opt("Connection", "Wireless"), C("Black")] },
      { title: "MMO Gaming Mouse", price: 9400, options: [opt("Connection", "Wired"), C("Black")] },
      { title: "Compact Bluetooth Mouse", price: 2100, options: [opt("Connection", "Bluetooth"), C("Blue", "Grey")] },
    ],
  },
  {
    category: "Laptop Accessories",
    type: "Desk & Laptop",
    code: "LAP",
    blurb: "%s — the unglamorous part of a desk that you notice only when it is missing.",
    models: [
      { title: "Laptop Cooling Stand", price: 3100, options: [C("Silver", "Black"), opt("Material", "Aluminium")] },
      { title: "Extended Desk Mat", price: 1600, options: [C("Black", "Grey"), opt("Material", "Fabric")] },
      { title: "Laptop Sleeve 14 inch", price: 2300, options: [C("Grey", "Navy"), opt("Material", "Fabric")] },
      { title: "Leather Laptop Folio 13 inch", price: 5900, options: [C("Brown", "Black"), opt("Material", "Leather")] },
      { title: "Adjustable Laptop Riser", price: 4200, options: [C("Silver"), opt("Material", "Aluminium")] },
      { title: "USB-C Hub 7-in-1", price: 4800, options: [C("Silver", "Grey"), opt("Material", "Aluminium")] },
      { title: "Webcam 1080p", price: 6400, options: [C("Black"), opt("Material", "Plastic")] },
      { title: "Laptop Backpack 15 inch", price: 6800, options: [C("Black", "Navy"), opt("Material", "Fabric")] },
      { title: "Privacy Screen Filter 14 inch", price: 3400, options: [C("Transparent"), opt("Material", "Plastic")] },
      { title: "Foldable Laptop Table", price: 5200, options: [C("Brown", "Black"), opt("Material", "Plastic")] },
    ],
  },
  // ================================= Cosmetics > Skincare ===================
  {
    category: "Serums",
    type: "Skincare",
    code: "SRM",
    blurb: "%s — for skin that spends the day in dust, sun and air conditioning.",
    models: [
      { title: "Vitamin C Brightening Serum", price: 3200, options: [opt("Volume", "30ml", "50ml"), opt("Skin Type", "All Skin Types")] },
      { title: "Niacinamide Pore Serum", price: 2800, options: [opt("Volume", "30ml"), opt("Skin Type", "Oily")] },
      { title: "Hyaluronic Hydrating Serum", price: 3400, options: [opt("Volume", "30ml", "50ml"), opt("Skin Type", "Dry")] },
      { title: "Retinol Night Serum", price: 4100, options: [opt("Volume", "30ml"), opt("Skin Type", "Combination")] },
      { title: "Salicylic Acid Serum", price: 2900, options: [opt("Volume", "30ml"), opt("Skin Type", "Oily")] },
      { title: "Peptide Firming Serum", price: 5200, options: [opt("Volume", "30ml"), opt("Skin Type", "All Skin Types")] },
      { title: "Azelaic Acid Serum", price: 3600, options: [opt("Volume", "30ml"), opt("Skin Type", "Sensitive")] },
      { title: "Centella Calming Serum", price: 3100, options: [opt("Volume", "50ml"), opt("Skin Type", "Sensitive")] },
      { title: "Alpha Arbutin Dark Spot Serum", price: 3800, options: [opt("Volume", "30ml"), opt("Skin Type", "Combination")] },
      { title: "Squalane Face Oil", price: 4400, options: [opt("Volume", "30ml", "50ml"), opt("Skin Type", "Dry")] },
      { title: "Rosehip Repair Serum", price: 4700, options: [opt("Volume", "30ml"), opt("Skin Type", "Dry")] },
    ],
  },
  {
    category: "Cleansers",
    type: "Skincare",
    code: "CLN",
    blurb: "%s — takes the day off without leaving skin tight and squeaking.",
    models: [
      { title: "Gentle Foaming Cleanser", price: 1900, options: [opt("Volume", "100ml", "200ml"), opt("Skin Type", "Sensitive")] },
      { title: "Salicylic Acid Face Wash", price: 1600, options: [opt("Volume", "100ml"), opt("Skin Type", "Oily")] },
      { title: "Cream Cleanser", price: 2100, options: [opt("Volume", "200ml"), opt("Skin Type", "Dry")] },
      { title: "Micellar Cleansing Water", price: 1750, options: [opt("Volume", "200ml"), opt("Skin Type", "All Skin Types")] },
      { title: "Charcoal Deep Clean Wash", price: 1850, options: [opt("Volume", "100ml"), opt("Skin Type", "Oily")] },
      { title: "Oil Cleansing Balm", price: 3200, options: [opt("Volume", "100ml"), opt("Skin Type", "Combination")] },
      { title: "Aloe Gel Cleanser", price: 1450, options: [opt("Volume", "100ml", "200ml"), opt("Skin Type", "Sensitive")] },
      { title: "Exfoliating Face Scrub", price: 1650, options: [opt("Volume", "100ml"), opt("Skin Type", "Combination")] },
      { title: "Rice Water Cleanser", price: 2250, options: [opt("Volume", "200ml"), opt("Skin Type", "All Skin Types")] },
      { title: "Tea Tree Acne Wash", price: 1950, options: [opt("Volume", "100ml"), opt("Skin Type", "Oily")] },
      { title: "Hydrating Cream-to-Foam Wash", price: 2400, options: [opt("Volume", "200ml"), opt("Skin Type", "Dry")] },
    ],
  },
  {
    category: "Moisturisers",
    type: "Skincare",
    code: "MST",
    blurb: "%s — sits under sunscreen without pilling, which most of them fail at.",
    models: [
      { title: "Oil-Free Daily Moisturiser", price: 2400, options: [opt("Volume", "50ml", "100ml"), opt("Skin Type", "Oily")] },
      { title: "Ceramide Repair Moisturiser", price: 3600, options: [opt("Volume", "50ml"), opt("Skin Type", "Dry")] },
      { title: "Gel Water Cream", price: 2900, options: [opt("Volume", "50ml"), opt("Skin Type", "Combination")] },
      { title: "Rich Night Cream", price: 4200, options: [opt("Volume", "50ml"), opt("Skin Type", "Dry")] },
      { title: "Barrier Repair Lotion", price: 3300, options: [opt("Volume", "100ml"), opt("Skin Type", "Sensitive")] },
      { title: "Under-Eye Recovery Cream", price: 2700, options: [opt("Volume", "30ml"), opt("Skin Type", "All Skin Types")] },
      { title: "Vitamin E Body Lotion", price: 1900, options: [opt("Volume", "200ml"), opt("Skin Type", "Dry")] },
      { title: "Mattifying Day Cream", price: 2600, options: [opt("Volume", "50ml"), opt("Skin Type", "Oily")] },
      { title: "Shea Butter Hand Cream", price: 1200, options: [opt("Volume", "75ml"), opt("Skin Type", "Dry")] },
      { title: "Lightweight Face Emulsion", price: 3100, options: [opt("Volume", "100ml"), opt("Skin Type", "Combination")] },
      { title: "Fragrance-Free Face Cream", price: 3400, options: [opt("Volume", "50ml"), opt("Skin Type", "Sensitive")] },
    ],
  },
  {
    category: "Sunscreens & Masks",
    type: "Skincare",
    code: "SUN",
    blurb: "%s — no white cast, which is the only reason people actually reapply.",
    models: [
      { title: "Mineral Sunscreen SPF 50", price: 2900, options: [opt("Volume", "50ml", "75ml"), opt("Skin Type", "Sensitive")] },
      { title: "Gel Sunscreen SPF 30", price: 2200, options: [opt("Volume", "50ml"), opt("Skin Type", "Combination")] },
      { title: "Invisible Fluid Sunscreen SPF 50", price: 3800, options: [opt("Volume", "50ml"), opt("Skin Type", "Oily")] },
      { title: "Tinted Sunscreen SPF 40", price: 3400, options: [opt("Volume", "50ml"), opt("Skin Type", "All Skin Types")] },
      { title: "Body Sunscreen Lotion SPF 50", price: 3100, options: [opt("Volume", "200ml"), opt("Skin Type", "All Skin Types")] },
      { title: "Clay Purifying Mask", price: 1800, options: [opt("Volume", "75ml"), opt("Skin Type", "Oily")] },
      { title: "Overnight Sleeping Mask", price: 3100, options: [opt("Volume", "50ml"), opt("Skin Type", "All Skin Types")] },
      { title: "Hydrating Sheet Mask Pack", price: 1400, options: [opt("Volume", "30ml"), opt("Skin Type", "Dry")] },
      { title: "Charcoal Peel-Off Mask", price: 1650, options: [opt("Volume", "75ml"), opt("Skin Type", "Oily")] },
      { title: "Oatmeal Soothing Mask", price: 2100, options: [opt("Volume", "75ml"), opt("Skin Type", "Sensitive")] },
      { title: "Brightening Vitamin C Mask", price: 2450, options: [opt("Volume", "75ml"), opt("Skin Type", "Combination")] },
    ],
  },
  // ================================== Cosmetics > Makeup =====================
  {
    category: "Lip Makeup",
    type: "Makeup",
    code: "LIP",
    blurb: "%s — the shade looks the same in daylight as it does under a shop tube light.",
    models: [
      { title: "Matte Liquid Lipstick", price: 1400, options: [opt("Shade", "Nude", "Ruby", "Mauve"), opt("Finish", "Matte")] },
      { title: "Satin Lipstick Bullet", price: 1650, options: [opt("Shade", "Plum", "Coral"), opt("Finish", "Satin")] },
      { title: "Glossy Lip Tint", price: 1100, options: [opt("Shade", "Berry", "Coral"), opt("Finish", "Glossy")] },
      { title: "Velvet Lip Crayon", price: 1250, options: [opt("Shade", "Ruby", "Nude"), opt("Finish", "Matte")] },
      { title: "Transfer-Proof Lip Stain", price: 1800, options: [opt("Shade", "Berry", "Plum"), opt("Finish", "Matte")] },
      { title: "Plumping Lip Gloss", price: 1350, options: [opt("Shade", "Nude", "Coral"), opt("Finish", "Glossy")] },
      { title: "Creamy Lip Balm Tint", price: 850, options: [opt("Shade", "Coral"), opt("Finish", "Satin")] },
      { title: "Matte Lip Liner", price: 700, options: [opt("Shade", "Nude", "Mauve"), opt("Finish", "Matte")] },
      { title: "Overnight Lip Mask", price: 1550, options: [opt("Shade", "Nude"), opt("Finish", "Glossy")] },
      { title: "Two-in-One Lip and Cheek Tint", price: 1450, options: [opt("Shade", "Berry", "Coral"), opt("Finish", "Satin")] },
      { title: "Long-Wear Lipstick Duo", price: 2400, options: [opt("Shade", "Ruby", "Plum"), opt("Finish", "Matte")] },
    ],
  },
  {
    category: "Face Makeup",
    type: "Makeup",
    code: "FCE",
    blurb: "%s — holds up through a wedding function in July.",
    models: [
      { title: "Long-Wear Foundation", price: 3400, options: [opt("Shade", "Nude", "Beige"), opt("Finish", "Matte")] },
      { title: "Dewy Skin Tint", price: 2900, options: [opt("Shade", "Nude", "Beige"), opt("Finish", "Glossy")] },
      { title: "Full Coverage Concealer", price: 1900, options: [opt("Shade", "Beige", "Nude"), opt("Finish", "Matte")] },
      { title: "Pressed Powder Compact", price: 1800, options: [opt("Shade", "Beige", "Nude"), opt("Finish", "Matte")] },
      { title: "Loose Setting Powder", price: 2200, options: [opt("Shade", "Nude"), opt("Finish", "Matte")] },
      { title: "Cream Blush Stick", price: 1500, options: [opt("Shade", "Coral", "Berry"), opt("Finish", "Satin")] },
      { title: "Powder Blush Duo", price: 1700, options: [opt("Shade", "Plum", "Coral"), opt("Finish", "Matte")] },
      { title: "Highlighter Palette", price: 2600, options: [opt("Shade", "Gold", "Nude"), opt("Finish", "Glossy")] },
      { title: "Contour and Bronzer Stick", price: 2100, options: [opt("Shade", "Beige"), opt("Finish", "Matte")] },
      { title: "Makeup Setting Spray", price: 2350, options: [opt("Shade", "Nude"), opt("Finish", "Glossy")] },
      { title: "Colour Correcting Primer", price: 2800, options: [opt("Shade", "Nude", "Beige"), opt("Finish", "Satin")] },
    ],
  },
  {
    category: "Eye Makeup",
    type: "Makeup",
    code: "EYE",
    blurb: "%s — does not smudge on the second day of a three-day function.",
    models: [
      { title: "Eyeshadow Palette 12 Shades", price: 3800, options: [opt("Shade", "Nude", "Plum"), opt("Finish", "Matte")] },
      { title: "Shimmer Eyeshadow Palette", price: 3400, options: [opt("Shade", "Gold", "Berry"), opt("Finish", "Glossy")] },
      { title: "Waterproof Liquid Eyeliner", price: 950, options: [opt("Shade", "Black"), opt("Finish", "Matte")] },
      { title: "Gel Eyeliner Pot", price: 1300, options: [opt("Shade", "Black", "Brown"), opt("Finish", "Satin")] },
      { title: "Kohl Kajal Pencil", price: 600, options: [opt("Shade", "Black"), opt("Finish", "Matte")] },
      { title: "Volumising Mascara", price: 1350, options: [opt("Shade", "Black"), opt("Finish", "Satin")] },
      { title: "Lengthening Mascara", price: 1450, options: [opt("Shade", "Black", "Brown"), opt("Finish", "Matte")] },
      { title: "Brow Definer Pencil", price: 900, options: [opt("Shade", "Brown"), opt("Finish", "Matte")] },
      { title: "Tinted Brow Gel", price: 1150, options: [opt("Shade", "Brown", "Black"), opt("Finish", "Satin")] },
      { title: "Cream Eyeshadow Stick", price: 1250, options: [opt("Shade", "Gold", "Mauve"), opt("Finish", "Glossy")] },
      { title: "Eyeshadow Primer", price: 1600, options: [opt("Shade", "Nude"), opt("Finish", "Matte")] },
    ],
  },
  // =============================== Cosmetics > Fragrances ====================
  {
    category: "Perfumes",
    type: "Fragrances",
    code: "PRF",
    blurb: "%s — holds through a Karachi afternoon, which is the only test that matters.",
    models: [
      { title: "Oud Eau de Parfum", price: 8900, options: [opt("Volume", "50ml", "100ml")] },
      { title: "Amber Musk Eau de Parfum", price: 7400, options: [opt("Volume", "50ml", "100ml")] },
      { title: "Citrus Fresh Eau de Toilette", price: 4600, options: [opt("Volume", "100ml")] },
      { title: "Sandalwood Eau de Parfum", price: 9600, options: [opt("Volume", "50ml", "100ml")] },
      { title: "Leather Noir Eau de Parfum", price: 11200, options: [opt("Volume", "50ml")] },
      { title: "Saffron Oud Gift Set", price: 14500, options: [opt("Volume", "75ml")] },
      { title: "Jasmine Bloom Eau de Parfum", price: 6800, options: [opt("Volume", "50ml", "100ml")] },
      { title: "Vetiver Green Eau de Toilette", price: 5300, options: [opt("Volume", "100ml")] },
      { title: "Rose Damascena Eau de Parfum", price: 10400, options: [opt("Volume", "50ml")] },
      { title: "Vanilla Amber Eau de Parfum", price: 7900, options: [opt("Volume", "50ml", "100ml")] },
      { title: "Aqua Marine Eau de Toilette", price: 4900, options: [opt("Volume", "100ml")] },
      { title: "Spiced Tobacco Eau de Parfum", price: 12600, options: [opt("Volume", "50ml")] },
    ],
  },
  {
    category: "Attars & Body Mists",
    type: "Fragrances",
    code: "ATR",
    blurb: "%s — light enough for daily wear, strong enough to be noticed.",
    models: [
      { title: "Rose Attar Roll-On", price: 2200, options: [opt("Volume", "30ml")] },
      { title: "Jasmine Attar Roll-On", price: 2100, options: [opt("Volume", "30ml")] },
      { title: "Oud Attar Roll-On", price: 3400, options: [opt("Volume", "30ml")] },
      { title: "Musk Attar Roll-On", price: 2600, options: [opt("Volume", "30ml")] },
      { title: "Vanilla Bloom Body Mist", price: 1600, options: [opt("Volume", "200ml")] },
      { title: "Ocean Breeze Body Mist", price: 1500, options: [opt("Volume", "200ml")] },
      { title: "Cherry Blossom Body Mist", price: 1550, options: [opt("Volume", "200ml")] },
      { title: "White Musk Pocket Spray", price: 1250, options: [opt("Volume", "30ml")] },
      { title: "Citrus Splash Body Mist", price: 1450, options: [opt("Volume", "200ml")] },
      { title: "Amber Attar Gift Vial", price: 3900, options: [opt("Volume", "30ml")] },
      { title: "Sandal Attar Roll-On", price: 3100, options: [opt("Volume", "30ml")] },
    ],
  },
  // ================================ Kitchenware > Cookware ==================
  {
    category: "Frying Pans",
    type: "Cookware",
    code: "FRY",
    blurb: "%s — heavy enough to hold heat, light enough to lift when it is full.",
    models: [
      { title: "Non-Stick Frying Pan", price: 3900, options: [opt("Diameter", "24cm", "28cm"), opt("Material", "Non-Stick")] },
      { title: "Granite Coated Frying Pan", price: 4600, options: [opt("Diameter", "26cm", "30cm"), opt("Material", "Granite")] },
      { title: "Cast Iron Skillet", price: 6800, options: [opt("Diameter", "26cm"), opt("Material", "Cast Iron")] },
      { title: "Stainless Steel Frying Pan", price: 5200, options: [opt("Diameter", "24cm", "28cm"), opt("Material", "Stainless Steel")] },
      { title: "Deep Non-Stick Fry Pan", price: 4400, options: [opt("Diameter", "28cm"), opt("Material", "Non-Stick")] },
      { title: "Ceramic Omelette Pan", price: 2900, options: [opt("Diameter", "20cm"), opt("Material", "Non-Stick")] },
      { title: "Granite Grill Pan", price: 5400, options: [opt("Diameter", "26cm"), opt("Material", "Granite")] },
      { title: "Cast Iron Grill Pan", price: 7600, options: [opt("Diameter", "28cm"), opt("Material", "Cast Iron")] },
      { title: "Tri-Ply Steel Sauté Pan", price: 8900, options: [opt("Diameter", "24cm", "30cm"), opt("Material", "Stainless Steel")] },
      { title: "Non-Stick Egg Pan", price: 1900, options: [opt("Diameter", "20cm"), opt("Material", "Non-Stick")] },
      { title: "Granite Deep Fry Pan", price: 5100, options: [opt("Diameter", "30cm"), opt("Material", "Granite")] },
      { title: "Cast Iron Crepe Pan", price: 5900, options: [opt("Diameter", "26cm"), opt("Material", "Cast Iron")] },
    ],
  },
  {
    category: "Pots & Karahi",
    type: "Cookware",
    code: "POT",
    blurb: "%s — sized for a family dinner rather than a magazine photograph.",
    models: [
      { title: "Deep Karahi Wok", price: 5900, options: [opt("Diameter", "30cm"), opt("Material", "Cast Iron")] },
      { title: "Non-Stick Karahi", price: 4300, options: [opt("Diameter", "28cm", "30cm"), opt("Material", "Non-Stick")] },
      { title: "Granite Karahi", price: 5200, options: [opt("Diameter", "30cm"), opt("Material", "Granite")] },
      { title: "Stainless Steel Saucepan", price: 3200, options: [opt("Diameter", "20cm"), opt("Material", "Stainless Steel")] },
      { title: "Non-Stick Saucepan", price: 2700, options: [opt("Diameter", "20cm", "24cm"), opt("Material", "Non-Stick")] },
      { title: "Stainless Steel Stock Pot", price: 7400, options: [opt("Diameter", "30cm"), opt("Material", "Stainless Steel")] },
      { title: "Granite Casserole Pot", price: 6100, options: [opt("Diameter", "26cm"), opt("Material", "Granite")] },
      { title: "Cast Iron Dutch Oven", price: 12400, options: [opt("Diameter", "28cm"), opt("Material", "Cast Iron")] },
      { title: "Stainless Steel Steamer Insert", price: 3600, options: [opt("Diameter", "24cm"), opt("Material", "Stainless Steel")] },
      { title: "Non-Stick Milk Pan", price: 1800, options: [opt("Diameter", "20cm"), opt("Material", "Non-Stick")] },
      { title: "Granite Biryani Pot", price: 8200, options: [opt("Diameter", "30cm"), opt("Material", "Granite")] },
      { title: "Steel Pressure Cooker Pot", price: 9600, options: [opt("Diameter", "26cm"), opt("Material", "Stainless Steel")] },
    ],
  },
  {
    category: "Tawa & Griddles",
    type: "Cookware",
    code: "TWA",
    blurb: "%s — seasons properly and stops sticking after the third roti.",
    models: [
      { title: "Cast Iron Tawa", price: 4100, options: [opt("Diameter", "28cm"), opt("Material", "Cast Iron")] },
      { title: "Non-Stick Tawa", price: 2400, options: [opt("Diameter", "26cm", "30cm"), opt("Material", "Non-Stick")] },
      { title: "Granite Coated Tawa", price: 3100, options: [opt("Diameter", "28cm"), opt("Material", "Granite")] },
      { title: "Heavy Cast Iron Roti Tawa", price: 5200, options: [opt("Diameter", "30cm"), opt("Material", "Cast Iron")] },
      { title: "Concave Paratha Tawa", price: 2800, options: [opt("Diameter", "26cm"), opt("Material", "Non-Stick")] },
      { title: "Steel Flat Griddle", price: 4600, options: [opt("Diameter", "30cm"), opt("Material", "Stainless Steel")] },
      { title: "Non-Stick Dosa Tawa", price: 3300, options: [opt("Diameter", "30cm"), opt("Material", "Non-Stick")] },
      { title: "Granite Grill Griddle", price: 4900, options: [opt("Diameter", "28cm"), opt("Material", "Granite")] },
      { title: "Mini Cast Iron Tawa", price: 2200, options: [opt("Diameter", "20cm"), opt("Material", "Cast Iron")] },
      { title: "Double-Sided Steel Griddle", price: 6400, options: [opt("Diameter", "30cm"), opt("Material", "Stainless Steel")] },
      { title: "Non-Stick Sandwich Griddle", price: 2600, options: [opt("Diameter", "24cm"), opt("Material", "Non-Stick")] },
    ],
  },
  // =========================== Kitchenware > Kitchen Appliances ==============
  {
    category: "Kettles",
    type: "Small Appliances",
    code: "KET",
    blurb: "%s — rated for the voltage swings a Pakistani kitchen actually sees.",
    models: [
      { title: "1.7L Electric Kettle", price: 4200, options: [opt("Capacity", "1.7L"), C("Steel", "Black")] },
      { title: "1.5L Glass Kettle", price: 4800, options: [opt("Capacity", "1.5L"), C("Transparent")] },
      { title: "1L Travel Kettle", price: 2900, options: [opt("Capacity", "1L"), C("White")] },
      { title: "2L Electric Kettle", price: 5100, options: [opt("Capacity", "2L"), C("Steel")] },
      { title: "1.7L Temperature Control Kettle", price: 8600, options: [opt("Capacity", "1.7L"), C("Black", "Steel")] },
      { title: "1.5L Gooseneck Kettle", price: 7200, options: [opt("Capacity", "1.5L"), C("Black")] },
      { title: "1.7L Coffee Maker", price: 9200, options: [opt("Capacity", "1.7L"), C("Black")] },
      { title: "1L Milk Frother Kettle", price: 5600, options: [opt("Capacity", "1L"), C("Silver", "White")] },
      { title: "2L Cordless Kettle", price: 4700, options: [opt("Capacity", "2L"), C("White", "Black")] },
      { title: "1.5L Double-Wall Kettle", price: 6300, options: [opt("Capacity", "1.5L"), C("Steel")] },
      { title: "1.7L Glass Kettle with Filter", price: 5400, options: [opt("Capacity", "1.7L"), C("Transparent", "Black")] },
      { title: "1L Electric Tea Maker", price: 6800, options: [opt("Capacity", "1L"), C("White")] },
    ],
  },
  {
    category: "Blenders & Juicers",
    type: "Small Appliances",
    code: "BLD",
    blurb: "%s — the motor does not smell of burning after a jug of lassi.",
    models: [
      { title: "1.5L Blender Jug", price: 7300, options: [opt("Capacity", "1.5L"), C("White", "Black")] },
      { title: "2L Food Processor", price: 12400, options: [opt("Capacity", "2L"), C("White")] },
      { title: "1L Hand Blender Set", price: 5600, options: [opt("Capacity", "1L"), C("Steel", "White")] },
      { title: "1.5L Slow Juicer", price: 13600, options: [opt("Capacity", "1.5L"), C("Silver", "White")] },
      { title: "1L Personal Smoothie Blender", price: 4300, options: [opt("Capacity", "1L"), C("Black", "Blue")] },
      { title: "2L High-Speed Blender", price: 18900, options: [opt("Capacity", "2L"), C("Black")] },
      { title: "1.5L Citrus Juicer", price: 3900, options: [opt("Capacity", "1.5L"), C("White")] },
      { title: "1L Spice and Coffee Grinder", price: 3400, options: [opt("Capacity", "1L"), C("Steel")] },
      { title: "2L Chopper and Mincer", price: 6100, options: [opt("Capacity", "2L"), C("White", "Green")] },
      { title: "1.5L Stand Mixer", price: 21500, options: [opt("Capacity", "1.5L"), C("Red", "Silver")] },
      { title: "1L Portable USB Blender", price: 2800, options: [opt("Capacity", "1L"), C("White", "Blue")] },
    ],
  },
  {
    category: "Cookers & Fryers",
    type: "Small Appliances",
    code: "CKR",
    blurb: "%s — one less pot on the stove during a load-shedding evening.",
    models: [
      { title: "1.5L Rice Cooker", price: 6900, options: [opt("Capacity", "1.5L"), C("White")] },
      { title: "2L Air Fryer", price: 15800, options: [opt("Capacity", "2L"), C("Black")] },
      { title: "1L Sandwich Maker", price: 4400, options: [opt("Capacity", "1L"), C("Black", "Steel")] },
      { title: "2L Electric Pressure Cooker", price: 19400, options: [opt("Capacity", "2L"), C("Silver", "Black")] },
      { title: "1.5L Slow Cooker", price: 8700, options: [opt("Capacity", "1.5L"), C("White", "Brown")] },
      { title: "1L Egg Boiler", price: 2600, options: [opt("Capacity", "1L"), C("White")] },
      { title: "2L Deep Fryer", price: 11200, options: [opt("Capacity", "2L"), C("Steel")] },
      { title: "1.5L Multi Cooker", price: 14600, options: [opt("Capacity", "1.5L"), C("Black")] },
      { title: "1L Electric Steamer", price: 5300, options: [opt("Capacity", "1L"), C("White", "Transparent")] },
      { title: "2L Toaster Oven", price: 13900, options: [opt("Capacity", "2L"), C("Silver", "Black")] },
      { title: "1.7L Electric Grill", price: 10400, options: [opt("Capacity", "1.7L"), C("Black")] },
    ],
  },
  // ========================= Kitchenware > Storage & Containers ==============
  {
    category: "Food Containers",
    type: "Food Storage",
    code: "CTR",
    blurb: "%s — seals tight enough to keep atta dry through a Karachi monsoon.",
    models: [
      { title: "Airtight Storage Container Set", price: 3400, options: [opt("Pack Size", "Pack of 3", "Pack of 5"), opt("Material", "Plastic")] },
      { title: "Glass Meal Prep Box", price: 3100, options: [opt("Pack Size", "Pack of 3"), opt("Material", "Glass")] },
      { title: "Vacuum Seal Food Box", price: 2600, options: [opt("Pack Size", "Pack of 2"), opt("Material", "Plastic")] },
      { title: "Steel Food Storage Bowls", price: 4200, options: [opt("Pack Size", "Pack of 3"), opt("Material", "Stainless Steel")] },
      { title: "Atta Storage Drum", price: 4200, options: [opt("Pack Size", "Single"), opt("Material", "Plastic")] },
      { title: "Fridge Organiser Tray", price: 1700, options: [opt("Pack Size", "Pack of 5"), opt("Material", "Plastic")] },
      { title: "Stackable Freezer Boxes", price: 2900, options: [opt("Pack Size", "Pack of 5"), opt("Material", "Plastic")] },
      { title: "Glass Bowl Set with Lids", price: 4600, options: [opt("Pack Size", "Pack of 3"), opt("Material", "Glass")] },
      { title: "Steel Roti Box", price: 2400, options: [opt("Pack Size", "Single"), opt("Material", "Stainless Steel")] },
      { title: "Cereal Dispenser", price: 2800, options: [opt("Pack Size", "Pack of 2"), opt("Material", "Plastic")] },
      { title: "Collapsible Storage Box Set", price: 2200, options: [opt("Pack Size", "Pack of 7"), opt("Material", "Plastic")] },
    ],
  },
  {
    category: "Jars & Canisters",
    type: "Food Storage",
    code: "JAR",
    blurb: "%s — the lid still seals after a year on a warm shelf.",
    models: [
      { title: "Glass Storage Jar Set", price: 4900, options: [opt("Pack Size", "Pack of 3"), opt("Material", "Glass")] },
      { title: "Stainless Steel Canister Set", price: 6200, options: [opt("Pack Size", "Pack of 3", "Pack of 5"), opt("Material", "Stainless Steel")] },
      { title: "Spice Jar Rack", price: 2200, options: [opt("Pack Size", "Pack of 7"), opt("Material", "Glass")] },
      { title: "Clip-Top Glass Jars", price: 3600, options: [opt("Pack Size", "Pack of 3"), opt("Material", "Glass")] },
      { title: "Plastic Pantry Canisters", price: 2700, options: [opt("Pack Size", "Pack of 5"), opt("Material", "Plastic")] },
      { title: "Steel Tea and Sugar Canisters", price: 3200, options: [opt("Pack Size", "Pack of 2"), opt("Material", "Stainless Steel")] },
      { title: "Glass Oil Dispenser", price: 1900, options: [opt("Pack Size", "Pack of 2"), opt("Material", "Glass")] },
      { title: "Masala Dabba Steel Box", price: 3900, options: [opt("Pack Size", "Single"), opt("Material", "Stainless Steel")] },
      { title: "Honey and Jam Jar Set", price: 2100, options: [opt("Pack Size", "Pack of 2"), opt("Material", "Glass")] },
      { title: "Large Pickle Jar", price: 1600, options: [opt("Pack Size", "Single"), opt("Material", "Glass")] },
      { title: "Plastic Spice Shaker Set", price: 1400, options: [opt("Pack Size", "Pack of 7"), opt("Material", "Plastic")] },
    ],
  },
  {
    category: "Lunch Boxes",
    type: "Food Storage",
    code: "LNC",
    blurb: "%s — survives being carried on a motorbike without leaking daal.",
    models: [
      { title: "Lunch Box with Compartments", price: 1900, options: [opt("Pack Size", "Single"), opt("Material", "Plastic")] },
      { title: "Steel Tiffin Carrier", price: 3600, options: [opt("Pack Size", "Single"), opt("Material", "Stainless Steel")] },
      { title: "Insulated Steel Lunch Box", price: 4400, options: [opt("Pack Size", "Single"), opt("Material", "Stainless Steel")] },
      { title: "Glass Lunch Box with Sleeve", price: 3300, options: [opt("Pack Size", "Single"), opt("Material", "Glass")] },
      { title: "Kids Bento Lunch Box", price: 2100, options: [opt("Pack Size", "Single"), opt("Material", "Plastic")] },
      { title: "Three-Tier Tiffin Set", price: 5200, options: [opt("Pack Size", "Pack of 3"), opt("Material", "Stainless Steel")] },
      { title: "Leak-Proof Soup Container", price: 2400, options: [opt("Pack Size", "Pack of 2"), opt("Material", "Plastic")] },
      { title: "Office Lunch Bag Set", price: 2800, options: [opt("Pack Size", "Pack of 2"), opt("Material", "Plastic")] },
      { title: "Glass Salad Container", price: 2600, options: [opt("Pack Size", "Pack of 2"), opt("Material", "Glass")] },
      { title: "Steel Snack Boxes", price: 1800, options: [opt("Pack Size", "Pack of 3"), opt("Material", "Stainless Steel")] },
      { title: "Compartment Meal Tray", price: 1500, options: [opt("Pack Size", "Pack of 5"), opt("Material", "Plastic")] },
    ],
  },
  // ============================ Home & Bedding > Bedsheets ==================
  {
    category: "Bed Sheet Sets",
    type: "Bed Linen",
    code: "BSS",
    blurb: "%s — survives a wash every week, which is what a Pakistani summer demands.",
    models: [
      { title: "Cotton Bedsheet Set", price: 5400, options: [opt("Bed Size", "Double", "Queen", "King"), C("White", "Beige")] },
      { title: "Percale Cotton Bedsheet", price: 6200, options: [opt("Bed Size", "Queen", "King"), C("White")] },
      { title: "Satin Bedsheet Set", price: 7800, options: [opt("Bed Size", "Queen", "King"), C("Navy", "Grey")] },
      { title: "Microfibre Bedsheet Set", price: 3600, options: [opt("Bed Size", "Single", "Double"), C("Grey", "Blue")] },
      { title: "Printed Cotton Bedsheet", price: 4700, options: [opt("Bed Size", "Double", "Queen"), C("Beige", "Green")] },
      { title: "Striped Cotton Bedsheet", price: 4900, options: [opt("Bed Size", "Queen"), C("Navy", "White")] },
      { title: "Single Bed Cotton Sheet", price: 2900, options: [opt("Bed Size", "Single"), C("White", "Blue")] },
      { title: "Cotton Blend Bedsheet", price: 4100, options: [opt("Bed Size", "Double"), C("Grey", "Beige")] },
      { title: "Luxury Sateen Bedsheet", price: 9400, options: [opt("Bed Size", "King"), C("Navy")] },
      { title: "Fitted Cotton Sheet", price: 3300, options: [opt("Bed Size", "Double", "Queen"), C("White")] },
      { title: "Embroidered Bedsheet Set", price: 8900, options: [opt("Bed Size", "King"), C("Beige", "Gold")] },
      { title: "Summer Cotton Bed Spread", price: 3800, options: [opt("Bed Size", "Double"), C("Blue", "Green")] },
    ],
  },
  {
    category: "Duvets & Covers",
    type: "Bed Linen",
    code: "DUV",
    blurb: "%s — the buttons stay on, which is more than most manage.",
    models: [
      { title: "Quilted Bed Cover", price: 8600, options: [opt("Bed Size", "Queen", "King"), C("Beige", "Brown")] },
      { title: "Reversible Duvet Cover", price: 7200, options: [opt("Bed Size", "Double", "Queen"), C("Grey", "Navy")] },
      { title: "Cotton Duvet Cover Set", price: 9100, options: [opt("Bed Size", "Queen", "King"), C("White", "Beige")] },
      { title: "Printed Duvet Cover", price: 6400, options: [opt("Bed Size", "Double"), C("Green", "Blue")] },
      { title: "Satin Duvet Cover", price: 10800, options: [opt("Bed Size", "King"), C("Navy", "Gold")] },
      { title: "Single Duvet Cover", price: 4200, options: [opt("Bed Size", "Single"), C("Grey", "White")] },
      { title: "Winter Comforter Set", price: 12600, options: [opt("Bed Size", "Queen", "King"), C("Brown", "Navy")] },
      { title: "Lightweight Summer Quilt", price: 5300, options: [opt("Bed Size", "Double", "Queen"), C("White", "Blue")] },
      { title: "Embroidered Bed Cover", price: 11400, options: [opt("Bed Size", "King"), C("Beige")] },
      { title: "Microfibre Duvet Cover", price: 3900, options: [opt("Bed Size", "Single", "Double"), C("Grey")] },
      { title: "Patchwork Bed Throw", price: 4600, options: [opt("Bed Size", "Double"), C("Brown", "Green")] },
    ],
  },
  {
    category: "Mattress Protectors",
    type: "Bed Linen",
    code: "MTP",
    blurb: "%s — the boring purchase that saves a mattress you paid a lot for.",
    models: [
      { title: "Waterproof Mattress Protector", price: 4400, options: [opt("Bed Size", "Double", "Queen"), C("White")] },
      { title: "Quilted Mattress Pad", price: 5800, options: [opt("Bed Size", "Queen", "King"), C("White", "Beige")] },
      { title: "Cotton Fitted Mattress Cover", price: 3600, options: [opt("Bed Size", "Single", "Double"), C("White")] },
      { title: "Anti-Allergy Mattress Protector", price: 6200, options: [opt("Bed Size", "Queen"), C("White", "Grey")] },
      { title: "Cooling Mattress Topper", price: 11800, options: [opt("Bed Size", "King"), C("Grey")] },
      { title: "Memory Foam Mattress Topper", price: 14500, options: [opt("Bed Size", "Queen", "King"), C("White")] },
      { title: "Single Bed Mattress Protector", price: 2700, options: [opt("Bed Size", "Single"), C("White")] },
      { title: "Bamboo Mattress Protector", price: 7400, options: [opt("Bed Size", "Double", "Queen"), C("Beige")] },
      { title: "Elasticated Mattress Cover", price: 3100, options: [opt("Bed Size", "Double"), C("Grey", "White")] },
      { title: "Terry Waterproof Protector", price: 4900, options: [opt("Bed Size", "King"), C("White")] },
      { title: "Kids Waterproof Sheet", price: 2300, options: [opt("Bed Size", "Single"), C("Blue", "White")] },
    ],
  },
  // ======================= Home & Bedding > Pillows & Blankets ===============
  {
    category: "Pillows",
    type: "Bedding",
    code: "PLW",
    blurb: "%s — keeps its loft past the first month, unlike the cheap ones.",
    models: [
      { title: "Microfibre Pillow", price: 1800, options: [opt("Pack Size", "Single", "Pack of 2"), opt("Filling", "Microfibre")] },
      { title: "Memory Foam Pillow", price: 4600, options: [opt("Pack Size", "Single"), opt("Filling", "Memory Foam")] },
      { title: "Cotton Filled Pillow", price: 2400, options: [opt("Pack Size", "Pack of 2"), opt("Filling", "Cotton")] },
      { title: "Contour Neck Pillow", price: 3900, options: [opt("Pack Size", "Single"), opt("Filling", "Memory Foam")] },
      { title: "Hotel Style Pillow Pair", price: 3200, options: [opt("Pack Size", "Pack of 2"), opt("Filling", "Microfibre")] },
      { title: "Body Support Pillow", price: 5400, options: [opt("Pack Size", "Single"), opt("Filling", "Microfibre")] },
      { title: "Travel Neck Pillow", price: 1600, options: [opt("Pack Size", "Single"), opt("Filling", "Memory Foam")] },
      { title: "Cooling Gel Pillow", price: 6100, options: [opt("Pack Size", "Single"), opt("Filling", "Memory Foam")] },
      { title: "Cotton Bolster Pillow", price: 2900, options: [opt("Pack Size", "Single"), opt("Filling", "Cotton")] },
      { title: "Firm Support Pillow Pair", price: 3800, options: [opt("Pack Size", "Pack of 2"), opt("Filling", "Microfibre")] },
      { title: "Kids Soft Pillow", price: 1400, options: [opt("Pack Size", "Pack of 2"), opt("Filling", "Cotton")] },
    ],
  },
  {
    category: "Blankets",
    type: "Bedding",
    code: "BLK",
    blurb: "%s — warm without being the weight of a wet carpet.",
    models: [
      { title: "Fleece Blanket", price: 3400, options: [C("Grey", "Navy"), opt("Filling", "Microfibre")] },
      { title: "Sherpa Winter Blanket", price: 6800, options: [C("Beige", "Brown"), opt("Filling", "Microfibre")] },
      { title: "Cotton Summer Blanket", price: 2900, options: [C("White", "Blue"), opt("Filling", "Cotton")] },
      { title: "Weighted Blanket", price: 11400, options: [C("Grey"), opt("Filling", "Microfibre")] },
      { title: "Electric Heated Blanket", price: 9600, options: [C("Brown"), opt("Filling", "Microfibre")] },
      { title: "Mink Double Blanket", price: 8200, options: [C("Brown", "Beige"), opt("Filling", "Microfibre")] },
      { title: "Cotton Waffle Throw", price: 3600, options: [C("Beige", "Green"), opt("Filling", "Cotton")] },
      { title: "Travel Fleece Throw", price: 1900, options: [C("Navy", "Red"), opt("Filling", "Microfibre")] },
      { title: "Quilted Sofa Throw", price: 4300, options: [C("Grey", "Brown"), opt("Filling", "Microfibre")] },
      { title: "Kids Printed Blanket", price: 2200, options: [C("Blue", "Green"), opt("Filling", "Microfibre")] },
      { title: "Handloom Cotton Throw", price: 5100, options: [C("Beige", "Navy"), opt("Filling", "Cotton")] },
    ],
  },
  {
    category: "Cushions & Inserts",
    type: "Bedding",
    code: "CSH",
    blurb: "%s — plump enough that the sofa does not look deflated by March.",
    models: [
      { title: "Cushion Filler Pair", price: 1500, options: [opt("Pack Size", "Pack of 2"), opt("Filling", "Microfibre")] },
      { title: "Duvet Insert", price: 7100, options: [opt("Pack Size", "Single"), opt("Filling", "Microfibre")] },
      { title: "Cotton Cushion Inserts", price: 1900, options: [opt("Pack Size", "Pack of 3"), opt("Filling", "Cotton")] },
      { title: "Memory Foam Seat Cushion", price: 3400, options: [opt("Pack Size", "Single"), opt("Filling", "Memory Foam")] },
      { title: "Floor Cushion Set", price: 4600, options: [opt("Pack Size", "Pack of 2"), opt("Filling", "Cotton")] },
      { title: "Lumbar Support Cushion", price: 2800, options: [opt("Pack Size", "Single"), opt("Filling", "Memory Foam")] },
      { title: "Cotton Pillow Cover Pair", price: 1400, options: [opt("Pack Size", "Pack of 2"), opt("Filling", "Cotton")] },
      { title: "Sofa Cushion Insert Set", price: 3100, options: [opt("Pack Size", "Pack of 5"), opt("Filling", "Microfibre")] },
      { title: "Round Bolster Insert", price: 2100, options: [opt("Pack Size", "Single"), opt("Filling", "Microfibre")] },
      { title: "Car Seat Cushion", price: 2600, options: [opt("Pack Size", "Pack of 2"), opt("Filling", "Memory Foam")] },
    ],
  },
  // ============================ The small categories (1-7 each) =============
  //
  // No third level and deliberately thin. Sports & Outdoors and Toys & Games sit
  // above MIN_PRODUCTS_FOR_FILTERS and still show a sidebar; Stationery (2) and
  // Health & Wellness (1) fall below it and must show sort only.
  {
    category: "Sports & Outdoors",
    type: "Fitness",
    code: "SPT",
    blurb: "%s — for a rooftop workout, which is where most of them happen.",
    models: [
      { title: "Yoga Mat 6mm", price: 3200, options: [C("Navy", "Green"), opt("Material", "Plastic")] },
      { title: "Adjustable Dumbbell Pair", price: 14800, options: [C("Black"), opt("Material", "Cast Iron")] },
      { title: "Resistance Band Set", price: 2100, options: [C("Red"), opt("Material", "Plastic")] },
      { title: "Skipping Rope", price: 900, options: [C("Black", "Blue"), opt("Material", "Plastic")] },
      { title: "Insulated Water Bottle", price: 2600, options: [C("Steel", "Navy"), opt("Material", "Stainless Steel")] },
      { title: "Gym Duffel Bag", price: 4300, options: [C("Black", "Grey"), opt("Material", "Fabric")] },
    ],
  },
  {
    category: "Toys & Games",
    type: "Toys",
    code: "TOY",
    blurb: "%s — survives being handed between cousins at a family dinner.",
    models: [
      { title: "Wooden Building Blocks", price: 3400, options: [opt("Age Range", "3+"), C("Beige")] },
      { title: "Remote Control Car", price: 5600, options: [opt("Age Range", "6+"), C("Red", "Blue")] },
      { title: "Family Board Game", price: 2900, options: [opt("Age Range", "8+"), C("Green")] },
      { title: "1000 Piece Jigsaw Puzzle", price: 1800, options: [opt("Age Range", "12+"), C("Blue")] },
    ],
  },
  {
    category: "Stationery",
    type: "Office Supplies",
    code: "STN",
    blurb: "%s — the boring kind that actually lasts a school year.",
    models: [
      { title: "A5 Hardbound Notebook", price: 650, options: [C("Navy", "Black"), opt("Pack Size", "Pack of 2")] },
      { title: "Gel Pen Set", price: 480, options: [C("Black", "Blue"), opt("Pack Size", "Pack of 5")] },
    ],
  },
  {
    category: "Health & Wellness",
    type: "Supplements",
    code: "HLT",
    blurb: "%s — plainly labelled, with the dose on the front where it belongs.",
    models: [
      { title: "Vitamin D3 Drops", price: 1900, options: [opt("Volume", "30ml")] },
    ],
  },
];

/**
 * Leaf category -> top-level category.
 *
 * Derived from CATEGORY_TREE rather than written out again, so a new leaf cannot
 * be added without the image generator learning which colour to tint it. A
 * category with no children maps to itself — that is the small categories.
 */
const TOP_OF_LEAF: Record<string, string> = Object.fromEntries(
  Object.entries(CATEGORY_TREE).flatMap(([top, subs]) => {
    const leaves = Object.values(subs).flat();
    return leaves.length
      ? leaves.map((leaf) => [leaf, top])
      : [[top, top] as [string, string]];
  })
);

/**
 * Tags cycle rather than repeat, so no single tag covers the whole catalogue and
 * the tag filter has something to narrow. Every product gets one or two.
 */
function tagsFor(index: number): string[] {
  const first = PRODUCT_TAGS[index % PRODUCT_TAGS.length];
  const second = PRODUCT_TAGS[(index * 3 + 1) % PRODUCT_TAGS.length];

  return first === second ? [first] : [first, second];
}

/**
 * Specs shown on the product page. Built from the model's own options so a
 * product never claims a fact that contradicts what it can be bought as, plus
 * a row or two of context.
 */
function specsFor(model: Model, group: Group): Record<string, string> {
  if (model.specs) {
    return model.specs;
  }

  const fromOptions = Object.fromEntries(
    model.options.map((option) => [option.title, option.values.join(", ")])
  );

  return {
    ...fromOptions,
    Category: group.category,
    Warranty:
      group.type === "Skincare" || group.type === "Makeup" || group.type === "Fragrances"
        ? "N/A"
        : "6 months",
  };
}

/**
 * Expands the groups above into the flat list the seed consumes.
 *
 * Two guards, both of which have already caught real mistakes in this file:
 *
 * - **Duplicate handles.** Handles are global, and with ~390 titles two
 *   products called the same thing in different categories is easy to do.
 *   Medusa would fail deep inside a workflow with a message that does not name
 *   the offender.
 * - **A leaf that is not option-uniform.** The storefront's 0.6 coverage
 *   threshold assumes every product in a leaf carries the same option titles;
 *   one that does not would quietly hide its own filters, which is the exact
 *   bug this whole structure exists to prevent.
 */
export function buildCatalogue(): ProductBlueprint[] {
  const out: ProductBlueprint[] = [];
  const seenHandles = new Map<string, string>();
  let index = 0;

  for (const group of GROUPS) {
    const top = TOP_OF_LEAF[group.category];

    if (!top) {
      throw new Error(
        `Group "${group.category}" is not a leaf in CATEGORY_TREE. ` +
          `Add it to the tree, or the products would have nowhere to live.`
      );
    }

    const signature = [...new Set(group.models[0].options.map((o) => o.title))]
      .sort()
      .join(" + ");

    let withinGroup = 0;

    for (const model of group.models) {
      const handle = slugify(model.title);
      const clash = seenHandles.get(handle);

      if (clash) {
        throw new Error(
          `Duplicate handle "${handle}": "${model.title}" collides with "${clash}". ` +
            `Product handles are global, so rename one of them.`
        );
      }

      seenHandles.set(handle, model.title);

      const mine = [...new Set(model.options.map((o) => o.title))].sort().join(" + ");

      if (mine !== signature) {
        throw new Error(
          `"${model.title}" has options [${mine}] but its category ` +
            `"${group.category}" is [${signature}]. A leaf must be option-uniform ` +
            `— see the note at the top of this file.`
        );
      }

      const [averageRating, reviewCount] = RATINGS[index % RATINGS.length];

      out.push({
        title: model.title,
        handle,
        description: group.blurb.replace("%s", model.title),
        category: group.category,
        topCategory: top,
        type: model.type ?? group.type,
        tags: tagsFor(index),
        weight: model.weight ?? 400,
        // Unique per product, so two products in the same group cannot generate
        // the same variant SKU from the same option values.
        skuBase: `${group.code}${String(withinGroup + 1).padStart(3, "0")}`,
        price: model.price,
        options: model.options,
        specs: specsFor(model, group),
        averageRating,
        reviewCount,
      });

      index += 1;
      withinGroup += 1;
    }
  }

  return out;
}
