import { Injectable, computed, signal } from '@angular/core';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { CustomCategory } from '../models/store';
import { readCache, writeCache } from '../utils/cache';
import {
  BASE_CAT_LABELS, BASE_DEFAULT_SIZES, BASE_DRINK_CATEGORIES, BASE_FOOD_CATEGORIES,
  BASE_SIZED_CATEGORIES, CatLabels
} from '../utils/catalog.constants';

const CACHE_KEY = 'cc_categories_cache_v1';

/* Built-in categories + admin-defined custom ones. Replaces the mutable globals in
   shared-catalog.js (CAT_LABELS, DRINK_CATEGORIES, ...) with an immutable computed
   `meta` that rebuilds whenever the custom list changes. */
@Injectable({ providedIn: 'root' })
export class CategoriesService {
  readonly custom = signal<CustomCategory[]>(readCache<CustomCategory[]>(CACHE_KEY) ?? []);

  readonly meta = computed(() => {
    const catLabels: CatLabels = { ...BASE_CAT_LABELS };
    const drinkCategories = [...BASE_DRINK_CATEGORIES];
    const sizedCategories = [...BASE_SIZED_CATEGORIES];
    const foodCategories = [...BASE_FOOD_CATEGORIES];
    const defaultSizes: Record<string, string[]> = { ...BASE_DEFAULT_SIZES };

    // Same rules as applyCustomCategoryCore() in shared-catalog.js
    for (const c of this.custom()) {
      if (catLabels[c.id]) continue;
      catLabels[c.id] = { group: c.group, sub: c.label };
      if (c.pricingType === 'sized-price') {
        if (!drinkCategories.includes(c.id)) drinkCategories.push(c.id);
      } else if (c.pricingType === 'sized-stock') {
        if (!sizedCategories.includes(c.id)) sizedCategories.push(c.id);
        defaultSizes[c.id] = c.sizes && c.sizes.length ? c.sizes : ['One Size'];
      }
      if (c.hasFoodFields && !foodCategories.includes(c.id)) foodCategories.push(c.id);
    }
    return { catLabels, drinkCategories, sizedCategories, foodCategories, defaultSizes };
  });

  async load(): Promise<void> {
    try {
      const snap = await getDocs(collection(db, 'categories'));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }) as CustomCategory);
      this.custom.set(list);
      writeCache(CACHE_KEY, list);
    } catch (err) {
      console.warn('Could not load custom categories; using cached list.', err);
    }
  }
}
