import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthServices } from '../../features/auth/services/auth.services';

export const authGuard: CanActivateFn = async (_route, state) => {
  const router = inject(Router);
  const authServices = inject(AuthServices);

  const user =await  authServices.getCurrentUser();

  if (!user) {
    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url },
    });
  }

  return true;
};
