import { Injectable, inject } from '@angular/core';
import { CategoriesService } from './categories.service';
import { CombosService } from './combos.service';
import { ProductsService } from './products.service';
import { SettingsService } from './settings.service';

/* One call that loads everything the storefront needs, in parallel.
   Equivalent of the website's startup loaders (loadSettingsFromFirestore,
   loadCategoriesFromFirestore, loadProductsFromFirestore, combos). A failure in
   one (e.g. combos) never blocks the others. */
@Injectable({ providedIn: 'root' })
export class CatalogService {
  private settings = inject(SettingsService);
  private categories = inject(CategoriesService);
  private products = inject(ProductsService);
  private combos = inject(CombosService);

  async loadAll(force = false): Promise<void> {
    await Promise.allSettled([
      this.settings.load(),
      this.categories.load(),
      this.products.load(force),
      this.combos.load()
    ]);
  }
}
