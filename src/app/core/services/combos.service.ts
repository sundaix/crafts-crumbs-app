import { Injectable, computed, inject, signal } from '@angular/core';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Combo } from '../models/store';
import { buildComboProducts } from '../utils/catalog.utils';
import { ProductsService } from './products.service';

/* Read-only port of combos-service.js. Combo stock is derived from the linked
   products (see buildComboProducts), never stored. */
@Injectable({ providedIn: 'root' })
export class CombosService {
  private productsSvc = inject(ProductsService);

  readonly combos = signal<Combo[]>([]);
  /** Active combos converted to product-shaped items. Recomputes when products or combos change. */
  readonly comboProducts = computed(() => buildComboProducts(this.combos(), this.productsSvc.products()));

  async load(): Promise<void> {
    try {
      const snap = await getDocs(collection(db, 'combos'));
      this.combos.set(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Combo));
    } catch (err) {
      console.warn('Could not load combos.', err);
    }
  }
}
