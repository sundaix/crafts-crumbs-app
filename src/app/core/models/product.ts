/* products/{id}. Sizes come in two shapes: plain strings (wearables, flat
   price) or {size, price, stock} objects (drinks, per-size price/stock). */
export interface ProductSize { size: string; price?: number; stock?: number; }
export type RawSize = string | ProductSize;

/* Normalised by getSizeOptions(). size is null only for combos built from an unsized drink. */
export interface SizeOption { size: string | null; price: number; stock: number | null; }

export interface OptionChoice {
  id: string; label: string; price: number; kcal: number | null; available: boolean; default: boolean;
}
export interface OptionGroup {
  id: string; label: string; type: string; max: number | null; choices: OptionChoice[];
}
export interface Nutrition {
  servingSize?: string; carbs?: number; sugar?: number; protein?: number; fat?: number; sodium?: number;
}

export interface ComboMeta {
  comboId: string; drinkId: string; pastryId: string; discountPercent: number;
  originalSizes: { size: string | null; price: number }[];
}

export interface Product {
  id: string;
  name: string;
  cat: string;
  price: number;
  desc?: string;
  img?: string;
  imgs?: string[];
  ingredients?: string;
  allergens?: string;
  stock?: number | null;
  sizes?: RawSize[];
  fit?: string;
  optionGroups?: OptionGroup[];
  calories?: number;
  aboutText?: string;
  nutrition?: Nutrition;
  comboMeta?: ComboMeta;   // only on combo-derived products
}
