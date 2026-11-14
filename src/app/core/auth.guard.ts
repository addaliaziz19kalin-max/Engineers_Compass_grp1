import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { VerificationResultService } from './verification-result.service';

/**
 * Pages du compte : il faut une session ouverte, sinon retour à la connexion.
 * Seule exception : le résultat d'une inscription refusée (il n'y a pas de compte à ouvrir).
 */
export const authGuard: CanActivateFn & CanActivateChildFn = (_route, state) => {
  if (inject(AuthService).isLoggedIn()) return true;
  const refused = inject(VerificationResultService).current();
  if (state.url.split('?')[0] === '/verification' && refused?.from === 'signup' && refused.s === 'refused') return true;
  return inject(Router).createUrlTree(['/connexion']);
};
