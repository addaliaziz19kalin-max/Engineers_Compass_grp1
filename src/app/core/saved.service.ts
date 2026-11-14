import { Injectable, signal } from '@angular/core';
import { loadJson, saveJson } from './storage';

export interface SavedItem {
  id: string;
  kind: 'post' | 'offer' | 'challenge';
  title: string;
  sub: string;
  link: string;
  /** paramètres de l'adresse (ex. { post: 'post-1' } pour ouvrir la publication dans le fil) */
  query?: Record<string, string>;
}

const KEY = 'ec-enregistres';

/** Éléments « Enregistrés » (publications, offres, défis). */
@Injectable({ providedIn: 'root' })
export class SavedService {
  // TODO : remplacer par l'API ; en attendant, gardés pour CE compte
  readonly items = signal<SavedItem[]>(loadJson<SavedItem[]>(KEY, []));

  has(id: string): boolean { return this.items().some((i) => i.id === id); }

  /** ajoute ou retire l'élément ; renvoie true s'il est maintenant enregistré */
  toggle(item: SavedItem): boolean {
    if (this.has(item.id)) {
      this.items.update((l) => l.filter((i) => i.id !== item.id));
      this.persist();
      return false;
    }
    this.items.update((l) => [item, ...l]);
    this.persist();
    return true;
  }

  remove(id: string): void { this.items.update((l) => l.filter((i) => i.id !== id)); this.persist(); }

  private persist(): void { saveJson(KEY, this.items()); }
}
