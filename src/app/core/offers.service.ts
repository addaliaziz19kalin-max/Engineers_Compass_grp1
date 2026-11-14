import { Injectable, signal } from '@angular/core';
import { loadJson, saveJson } from './storage';

export interface Offer {
  id: string;
  title: string;
  /** titre affiché sur la page de détail */
  headline: string;
  kind: 'PFE' | 'Stage';
  company: string;
  duration: string;
  place: string;
  mode: string;
  remote?: boolean;
  posted: string;
  candidates: number;
  deadline: string;
  tags: string[];
  description: string;
  requirements: string[];
}

const KEY_APPLIED = 'ec-candidatures';

/** Offres et candidatures, partagées entre la liste et la page de détail. */
@Injectable({ providedIn: 'root' })
export class OffersService {
  // TODO : remplacer par l'API (offres publiées par les pages entreprise) ; vide tant qu'aucune page n'en a publié
  readonly offers: Offer[] = [];

  /** offres auxquelles j'ai postulé (identifiants) : aucune au départ, gardées pour CE compte (TODO : l'API les fournit) */
  readonly applied = signal<string[]>(loadJson<string[]>(KEY_APPLIED, []));

  find(id: string | null): Offer | undefined { return this.offers.find((o) => o.id === id); }
  isApplied(id: string): boolean { return this.applied().includes(id); }
  apply(id: string): void {
    // TODO : appeler l'API de candidature
    this.applied.update((a) => (a.includes(id) ? a : [...a, id]));
    saveJson(KEY_APPLIED, this.applied());
  }
}
