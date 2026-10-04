import { Injectable, computed, signal } from '@angular/core';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { StoreSettings } from '../models/store';
import { readCache, writeCache } from '../utils/cache';

const CACHE_KEY = 'cc_settings_cache_v1';
export const DEFAULT_DELIVERY_FEE = 60;

export const DEFAULT_SETTINGS: StoreSettings = {
  deliveryFee: DEFAULT_DELIVERY_FEE,
  promoPopup: {
    enabled: true, badgeText: 'New', eyebrow: 'Just Dropped',
    headline: 'Fresh Brews,<br>Fresh Merch.',
    copy: 'New seasonal drinks and a handcrafted merch line just landed at Crafts & Crumbs. Brewed and stitched with the same care as always.',
    ctaText: 'Take a Look', dismissText: 'Maybe later', category: '', sortMode: 'featured', productIds: []
  },
  /* productIds empty = use the built-in "best sellers" fallback list (added with the Home page). */
  popularSection: {
    eyebrow: 'Loved by regulars', heading: 'Popular this week',
    subtext: 'Favorites our regulars keep reordering.', buttonText: 'View full menu', productIds: []
  }
};

/* Read-only port of settings-service.js (the update* functions are admin-only). */
@Injectable({ providedIn: 'root' })
export class SettingsService {
  readonly settings = signal<StoreSettings>(DEFAULT_SETTINGS);
  readonly deliveryFee = computed(() => this.settings().deliveryFee);

  constructor() {
    const cached = readCache<StoreSettings>(CACHE_KEY);
    if (cached) this.settings.set(this.merge(cached));
  }

  private merge(data: Partial<StoreSettings>): StoreSettings {
    return {
      ...DEFAULT_SETTINGS,
      ...data,
      promoPopup: { ...DEFAULT_SETTINGS.promoPopup, ...(data.promoPopup || {}) },
      popularSection: { ...DEFAULT_SETTINGS.popularSection, ...(data.popularSection || {}) }
    };
  }

  async load(): Promise<void> {
    try {
      const snap = await getDoc(doc(db, 'settings', 'general'));
      const merged = this.merge(snap.exists() ? (snap.data() as Partial<StoreSettings>) : {});
      this.settings.set(merged);
      writeCache(CACHE_KEY, merged);
    } catch (err) {
      console.warn('Could not load settings; using cached/default values.', err);
    }
  }
}
