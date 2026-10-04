import { environment } from '../../../environments/environment';
import { Product, ProductSize, SizeOption } from '../models/product';
import { Combo } from '../models/store';

/* Ports of the pricing / image helpers in shared-catalog.js. */

export const peso = (n: number) => '₱' + n.toLocaleString('en-PH');

export function getSizeOptions(p: Product): SizeOption[] {
  if (!p.sizes) return [];
  return p.sizes.map(s => {
    if (typeof s === 'string') return { size: s, price: p.price, stock: null };
    return {
      size: s.size,
      price: typeof s.price === 'number' ? s.price : p.price,
      stock: typeof s.stock === 'number' ? s.stock : null
    };
  });
}

export function getDisplayPrice(p: Product): number {
  const opts = getSizeOptions(p);
  if (!opts.length) return p.price;
  return Math.min(...opts.map(o => o.price));
}

/* True when at least two sizes are priced differently (every drink; not wearables). */
export function hasVariablePricing(p: Product): boolean {
  const opts = getSizeOptions(p);
  if (opts.length < 2) return false;
  return new Set(opts.map(o => o.price)).size > 1;
}

export function priceLabel(p: Product): string {
  if (hasVariablePricing(p)) {
    const prices = getSizeOptions(p).map(o => o.price);
    return `${peso(Math.min(...prices))}–${peso(Math.max(...prices))}`;
  }
  return peso(getDisplayPrice(p));
}

/* PROVISIONAL: based on how decrementStock() treats stock (top-level `stock` is
   the shared count, or the sum of per-size stock when sizes track their own).
   I'll replace this with the exact script.js version once I've seen it. */
export function isOutOfStock(p: Product): boolean {
  const perSize = getSizeOptions(p).filter(o => o.stock !== null);
  if (perSize.length) return perSize.every(o => (o.stock as number) <= 0);
  return typeof p.stock === 'number' && p.stock <= 0;
}

/* The website served images from its own root ('/croissant.jpg'). Inside the app
   those bare filenames must point at the live website instead. Cloudinary
   (https://...) and data: URIs pass through untouched. */
export function resolveImageSrc(src?: string | null): string {
  if (!src) return '';
  if (/^(https?:|data:)/i.test(src)) return src;
  return `${environment.apiBaseUrl}/${encodeURI(src.replace(/^\/+/, ''))}`;
}

export function blankPlaceholder(id: string, cat?: string): string {
  const MERCH = ['Accessories', 'Wearables', 'Shirts', 'Caps', 'Shorts', 'Socks', 'ToteBags', 'Bracelets', 'Keychains'];
  const accent = cat === 'Tea' ? '#7C9885'
    : cat === 'Cakes' ? '#B98A9A'
    : cat && MERCH.includes(cat) ? '#7C93A6'
    : '#C08552';
  const label = (cat || 'Crafts & Crumbs').toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
    <defs>
      <linearGradient id="g${id}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#F7F5F1"/>
        <stop offset="1" stop-color="#EFEAE1"/>
      </linearGradient>
    </defs>
    <rect width="400" height="400" fill="url(#g${id})"/>
    <rect x="16" y="16" width="368" height="368" fill="none" stroke="${accent}" stroke-width="1.4" stroke-dasharray="7 7" opacity="0.5"/>
    <g transform="translate(160,148)" stroke="${accent}" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <rect x="0" y="0" width="80" height="60" rx="6"/>
      <circle cx="18" cy="16" r="7"/>
      <path d="M0 50l22-20 18 15 16-13 24 20"/>
    </g>
    <text x="200" y="252" text-anchor="middle" font-family="Poppins, sans-serif" font-size="11" letter-spacing="3" fill="${accent}" font-weight="600">${label}</text>
    <text x="200" y="272" text-anchor="middle" font-family="Poppins, sans-serif" font-size="9" letter-spacing="1.5" fill="${accent}" font-weight="500" opacity="0.75">PHOTO COMING SOON</text>
  </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

/* First image, else the single img, else the generated placeholder. */
export function productThumb(p: Product): string {
  return resolveImageSrc((p.imgs && p.imgs[0]) || p.img) || blankPlaceholder(p.id, p.cat);
}

/* Port of buildComboProducts(): combos become "product-shaped" items. Kept separate
   from the products list so the Menu grids never show a combo as a catalog item. */
export function buildComboProducts(combos: Combo[], products: Product[]): Product[] {
  return combos.filter(c => c.active).map(c => {
    const drink = products.find(p => p.id === c.drinkId);
    const pastry = products.find(p => p.id === c.pastryId);
    if (!drink || !pastry) return null;

    const drinkSizes = getSizeOptions(drink);
    const drinkOpts: SizeOption[] = drinkSizes.length ? drinkSizes : [{ size: null, price: drink.price, stock: null }];
    const discount = Number(c.discountPercent) || 0;
    const originalSizes = drinkOpts.map(o => ({ size: o.size, price: o.price + pastry.price }));
    const sizes = originalSizes.map(o => ({ size: o.size as string, price: Math.round(o.price * (1 - discount / 100)) }));

    const stocks = [drink.stock, pastry.stock].filter((s): s is number => typeof s === 'number');
    const stock = stocks.length ? Math.min(...stocks) : null;

    const combo: Product = {
      id: 'combo_' + c.id,
      name: c.name,
      desc: c.desc || `${drink.name} + ${pastry.name}`,
      img: c.img,
      imgs: [c.img],
      cat: 'Combo',
      sizes: drinkOpts[0].size ? (sizes as ProductSize[]) : undefined,
      price: Math.min(...sizes.map(s => s.price)),
      stock,
      comboMeta: { comboId: c.id, drinkId: drink.id, pastryId: pastry.id, discountPercent: discount, originalSizes }
    };
    return combo;
  }).filter((p): p is Product => p !== null);
}
