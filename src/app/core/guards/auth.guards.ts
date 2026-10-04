import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/* For pages that need a real account (orders, wishlist, addresses, profile).
   Guests (anonymous sessions) are sent to login. Checkout is NOT guarded:
   guest checkout must keep working. */
export const registeredGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = await auth.whenAuthResolved();
  if (user && !user.isAnonymous) return true;
  return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
};

/* For login/register pages: bounce already-signed-in people to Home. */
export const guestOnlyGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = await auth.whenAuthResolved();
  return user && !user.isAnonymous ? router.createUrlTree(['/tabs/home']) : true;
};
