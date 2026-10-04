import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  IonContent, IonHeader, IonLabel, IonRefresher, IonRefresherContent, IonSearchbar,
  IonSegment, IonSegmentButton, IonSpinner, IonTitle, IonToolbar
} from '@ionic/angular';

import { Product } from '../../core/models/product';
import { CatalogService } from '../../core/services/catalog.service';
import { CategoriesService } from '../../core/services/categories.service';
import { ProductsService } from '../../core/services/products.service';
import { blankPlaceholder, isOutOfStock, priceLabel, productThumb } from '../../core/utils/catalog.utils';

/* One page, two uses: the route's `data` decides the title and which category
   groups it shows (Menu = Drinks + Food, Merchandise = Wearables + Merchandise). */
@Component({
  selector: 'app-menu',
  templateUrl: './menu.page.html',
  styleUrls: ['./menu.page.scss'],
  imports: [
    IonHeader, IonToolbar, IonTitle, IonContent, IonSearchbar, IonSegment, IonSegmentButton,
    IonLabel, IonRefresher, IonRefresherContent, IonSpinner
  ]
})
export class MenuPage implements OnInit {
  private route = inject(ActivatedRoute);
  private catalog = inject(CatalogService);
  private categories = inject(CategoriesService);
  readonly products = inject(ProductsService);

  readonly title: string = this.route.snapshot.data['title'] ?? 'Menu';
  private readonly groups: string[] = this.route.snapshot.data['groups'] ?? ['Drinks', 'Food'];

  readonly search = signal('');
  readonly activeGroup = signal('All');
  readonly activeSub = signal('All');

  /** Categories (built-in + custom) that belong to this page's groups. */
  private pageCategories = computed(() =>
    Object.entries(this.categories.meta().catLabels)
      .filter(([, v]) => this.groups.includes(v.group))
      .map(([id, v]) => ({ id, group: v.group, sub: v.sub }))
  );

  readonly groupTabs = computed(() => [
    'All',
    ...this.groups.filter(g => this.pageCategories().some(c => c.group === g))
  ]);

  readonly subTabs = computed(() =>
    this.pageCategories().filter(c => this.activeGroup() === 'All' || c.group === this.activeGroup())
  );

  readonly visibleProducts = computed<Product[]>(() => {
    const inScope = new Set(this.subTabs().map(c => c.id));
    const sub = this.activeSub();
    const q = this.search().trim().toLowerCase();
    return this.products.products().filter(p =>
      inScope.has(p.cat) &&
      (sub === 'All' || p.cat === sub) &&
      (!q || p.name.toLowerCase().includes(q) || (p.desc || '').toLowerCase().includes(q))
    );
  });

  ngOnInit() {
    void this.catalog.loadAll();
  }

  setGroup(ev: Event) {
    this.activeGroup.set(String((ev as CustomEvent).detail.value ?? 'All'));
    this.activeSub.set('All');
  }

  setSub(id: string) { this.activeSub.set(id); }

  onSearch(ev: Event) {
    this.search.set(String((ev as CustomEvent).detail.value ?? ''));
  }

  async refresh(ev: Event) {
    await this.catalog.loadAll(true);
      (ev.target as unknown as { complete(): void }).complete();
  }

  reload() { void this.catalog.loadAll(true); }

  thumb(p: Product) { return productThumb(p); }
  price(p: Product) { return priceLabel(p); }
  isOut(p: Product) { return isOutOfStock(p); }

  /* If an image URL is broken, swap in the generated placeholder once (no loop). */
  onImgError(ev: Event, p: Product) {
    const el = ev.target as HTMLImageElement;
    if (el.dataset['fallback']) return;
    el.dataset['fallback'] = '1';
    el.src = blankPlaceholder(p.id, p.cat);
  }
}
