import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

/**
 * Erreurs de l'API :
 *  - pas de réseau (status 0)  → /erreur/offline
 *  - 401                       → /connexion (session expirée)
 *  - 403                       → /erreur/403
 *  - 500, 502, 503, 504        → /erreur/<code>  (erreurs côté serveur)
 * Les autres statuts (400, 404, 422…) sont laissés à l'appelant (message dans le formulaire, etc.).
 * L'erreur est toujours relancée pour que l'appelant puisse aussi réagir.
 */
export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse) {
        const target = err.status === 0 ? ['/erreur', 'offline']
          : err.status === 401 ? ['/connexion']
          : [403, 500, 502, 503, 504].includes(err.status) ? ['/erreur', String(err.status)]
          : null;
        // on ne redirige pas si on est déjà sur une page d'erreur (évite les boucles)
        if (target && !router.url.startsWith('/erreur')) void router.navigate(target, { skipLocationChange: target[0] === '/erreur' });
      }
      return throwError(() => err);
    }),
  );
};
