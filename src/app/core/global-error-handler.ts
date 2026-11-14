import { ErrorHandler, Injectable, NgZone, inject } from '@angular/core';
import { Router } from '@angular/router';

/**
 * Erreurs d'exécution côté client (bug dans l'application) :
 * on garde la trace dans la console puis on affiche la page « Quelque chose s'est mal passé ».
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly router = inject(Router);
  private readonly zone = inject(NgZone);
  private lastRedirect = 0;

  handleError(error: unknown): void {
    console.error(error);
    const now = Date.now();
    // évite les boucles : une seule redirection toutes les 5 s, et jamais depuis une page d'erreur
    if (this.router.url.startsWith('/erreur') || now - this.lastRedirect < 5000) return;
    this.lastRedirect = now;
    this.zone.run(() => void this.router.navigate(['/erreur', 'client'], { skipLocationChange: true }));
  }
}
