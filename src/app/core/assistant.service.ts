import { Injectable, signal } from '@angular/core';

/** Ouvre / ferme l'assistant d'aide depuis n'importe où (ex. « Centre d'aide » dans le menu). */
@Injectable({ providedIn: 'root' })
export class AssistantService {
  readonly isOpen = signal(false);
  /** true : l'assistant est caché (ex. page de résultat de la vérification) */
  readonly hidden = signal(false);
  open(): void { this.isOpen.set(true); }
  toggle(): void { this.isOpen.update((v) => !v); }
  close(): void { this.isOpen.set(false); }
}
