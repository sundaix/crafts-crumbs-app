import { Injectable, signal } from '@angular/core';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Product } from '../models/product';
import { readCache, writeCache } from '../utils/cache';

const CACHE_KEY = 'cc_products_cache_v2';

/* Read-only port of products-services.js (admin CRUD + maintenance tools are not
   needed in the customer app). decrementStock() comes with the checkout step.
   Shows cached products instantly, then refreshes from Firestore. */
@Injectable({ providedIn: 'root' })
export class ProductsService {
  readonly products = signal<Product[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  private fetchedThisSession = false;
  private inflight: Promise<void> | null = null;

  constructor() {
    const cached = readCache<Product[]>(CACHE_KEY);
    if (cached?.length) this.products.set(cached);
  }

  async load(force = false): Promise<void> {
    if (this.inflight) return this.inflight;
    if (this.fetchedThisSession && !force) return;

    this.loading.set(true);
    this.error.set(null);
    this.inflight = (async () => {
      try {
        const snap = await getDocs(collection(db, 'products'));
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Product);
        this.products.set(list);
        writeCache(CACHE_KEY, list);
        this.fetchedThisSession = true;
      } catch (err) {
        console.error('Could not load products from Firestore.', err);
        // Keep showing cached products if we have them; only surface an error when there is nothing to show.
        if (!this.products().length) this.error.set('Could not load the menu. Check your connection and try again.');
      } finally {
        this.loading.set(false);
        this.inflight = null;
      }
    })();
    return this.inflight;
  }

  byId(id: string): Product | undefined {
    return this.products().find(p => p.id === id);
  }
}
