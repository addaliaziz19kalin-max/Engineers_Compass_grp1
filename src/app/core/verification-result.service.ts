import { Injectable, signal } from '@angular/core';

export type VerifState = 'accepted' | 'refused' | 'pending';
export type VerifOrigin = 'signup' | 'publish' | 'page';

export interface VerifResult { from: VerifOrigin; s: VerifState; score?: number; type?: string }

/**
 * Résultat de la vérification affiché par /verification.
 * Il est posé par la page qui vient de faire la vérification (inscription, test, création de page) et gardé
 * seulement en mémoire : il ne passe plus par l'adresse, donc on ne peut pas l'écrire à la main.
 * TODO : le résultat viendra de la réponse de l'API.
 */
@Injectable({ providedIn: 'root' })
export class VerificationResultService {
  readonly current = signal<VerifResult | null>(null);

  set(r: VerifResult): void { this.current.set(r); }
  clear(): void { this.current.set(null); }
}
