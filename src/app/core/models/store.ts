/* combos/{id}: a drink + a pastry sold together at a discount. */
export interface Combo {
  id: string;
  name: string;
  desc?: string;
  img: string;
  drinkId: string;
  pastryId: string;
  discountPercent?: number;
  active?: boolean;
}

/* categories/{id}: admin-defined custom categories. */
export interface CustomCategory {
  id: string;
  label: string;
  group: string;
  pricingType?: string;      // 'sized-price' | 'sized-stock' | (flat)
  sizes?: string[];
  hasFoodFields?: boolean;
}

export interface PromoPopupSettings {
  enabled: boolean; badgeText: string; eyebrow: string; headline: string; copy: string;
  ctaText: string; dismissText: string; category: string; sortMode: string; productIds: string[];
}
export interface PopularSectionSettings {
  eyebrow: string; heading: string; subtext: string; buttonText: string; productIds: string[];
}
/* settings/general */
export interface StoreSettings {
  deliveryFee: number;
  promoPopup: PromoPopupSettings;
  popularSection: PopularSectionSettings;
}
