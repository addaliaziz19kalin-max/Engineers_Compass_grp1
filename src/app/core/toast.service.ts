import { Injectable, signal } from '@angular/core';

export interface Toast {
  text: string;
  /** lien d'action (ex. « Voir ») */
  link?: string;
  query?: Record<string, string>;
  label?: string;
}

/** Petit message en bas de l'écran (« Publication enregistrée », « Envoyé à… »), affiché par la barre du compte. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly current = signal<Toast | null>(null);
  private timer?: ReturnType<typeof setTimeout>;

  show(t: Toast): void {
    this.current.set(t);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.current.set(null), 3500);
  }
}
