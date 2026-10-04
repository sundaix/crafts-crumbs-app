/* Built-in category metadata, copied from shared-catalog.js. Admin-defined
   custom categories are layered on top of these by CategoriesService. */
export type CatLabels = Record<string, { group: string; sub: string }>;

export const BASE_FOOD_CATEGORIES = ['Coffee', 'Non-Coffee', 'Tea', 'Pastries', 'Sandwiches', 'Cakes'];
export const BASE_DRINK_CATEGORIES = ['Coffee', 'Non-Coffee', 'Tea'];
export const BASE_SIZED_CATEGORIES = ['Shirts', 'Caps', 'Shorts', 'Socks'];

export const BASE_DEFAULT_SIZES: Record<string, string[]> = {
  Shirts: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  Shorts: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  Socks: ['S', 'M', 'L'],
  Caps: ['One Size']
};

export const BASE_CAT_LABELS: CatLabels = {
  'Coffee': { group: 'Drinks', sub: 'Caffeine' },
  'Non-Coffee': { group: 'Drinks', sub: 'Non-Caffeine' },
  'Tea': { group: 'Drinks', sub: 'Tea' },
  'Pastries': { group: 'Food', sub: 'Pastries' },
  'Sandwiches': { group: 'Food', sub: 'Sandwiches & Pasta' },
  'Cakes': { group: 'Food', sub: 'Cakes' },
  'Shirts': { group: 'Wearables', sub: 'Shirts' },
  'Caps': { group: 'Wearables', sub: 'Caps' },
  'Shorts': { group: 'Wearables', sub: 'Shorts' },
  'Socks': { group: 'Wearables', sub: 'Socks' },
  'ToteBags': { group: 'Wearables', sub: 'Tote Bags' },
  'Bracelets': { group: 'Merchandise', sub: 'Bracelets' },
  'Keychains': { group: 'Merchandise', sub: 'Keychains' }
};
