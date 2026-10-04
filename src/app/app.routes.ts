import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'menu',
    data: { title: 'Menu', groups: ['Drinks', 'Food'] },
    loadComponent: () => import('./pages/menu/menu.page').then((m) => m.MenuPage),
  },
  {
    path: 'merchandise',
    data: { title: 'Merchandise', groups: ['Wearables', 'Merchandise'] },
    loadComponent: () => import('./pages/menu/menu.page').then((m) => m.MenuPage),
  },
  {
    path: '',
    redirectTo: 'menu',
    pathMatch: 'full',
  },
];
