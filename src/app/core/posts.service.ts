import { userKey } from './storage';
import { Injectable, inject, signal } from '@angular/core';
import { RemoteService } from './remote.service';

export type MyPostKind = 'post' | 'shared' | 'experience' | 'solution';

/** Une publication de MON compte : elle apparaît dans le fil et sur mon profil, donc visible par les autres membres. */
export interface MyPost {
  /** identifiant (sert aussi de clé pour les « J'aime » et commentaires) */
  id: string;
  kind: MyPostKind;
  /** « a proposé une solution », « a ajouté une expérience »… */
  label: string;
  /** texte écrit par l'utilisateur (peut être vide pour un simple partage) */
  text: string;
  /** élément mis en avant : publication partagée, expérience, défi résolu… */
  title?: string;
  sub?: string;
  link?: string;
  /** paramètres de l'adresse du lien (ex. { post: 'post-1' }) */
  query?: Record<string, string>;
  at: number;
}

const KEY = 'ec-posts';
const KEY_DRAFT = 'ec-brouillon';

/** Score minimum (en %) du test de connaissance pour qu'un projet ou un certificat soit publié. */
export const PASS_SCORE = 90;

/** Publication en attente du test de connaissance. */
export interface StagedPost { type: string; topic: string; text: string }

/** « il y a 5 min », « il y a 2 h »… */
export function ago(at: number): string {
  const m = Math.floor((Date.now() - at) / 60_000);
  if (m < 1) return 'à l’instant';
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  return `il y a ${Math.floor(h / 24)} j`;
}

/**
 * Publications de mon compte : publication simple, partage d'une publication, expérience partagée, solution à un défi.
 * Chacune est publique : elle s'affiche en haut du fil et dans « Publications » de mon profil.
 * TODO : remplacer par l'API (publication, suppression, visibilité).
 */
@Injectable({ providedIn: 'root' })
export class PostsService {
  private readonly remote = inject(RemoteService);
  readonly items = signal<MyPost[]>(this.read());

  /** publication en attente du test de connaissance (projet / certificat) : publiée seulement si le test est réussi */
  private pending: StagedPost | null = null;

  /** brouillon de « Créer une publication » : gardé sur cet appareil jusqu'à la publication (TODO : API) */
  readonly draft = signal<StagedPost | null>(this.readDraft());

  /** enregistre le brouillon (un seul à la fois) */
  saveDraft(d: StagedPost): void {
    // TODO : envoyer le brouillon à l'API
    this.draft.set(d);
    try { localStorage.setItem(userKey(KEY_DRAFT), JSON.stringify(d)); } catch { /* stockage indisponible */ }
  }

  /** supprime le brouillon (publié ou abandonné) */
  clearDraft(): void {
    this.draft.set(null);
    try { localStorage.removeItem(userKey(KEY_DRAFT)); } catch { /* stockage indisponible */ }
  }

  /** renvoie l'identifiant de la publication créée */
  publish(p: Omit<MyPost, 'id' | 'at'>): string {
    // TODO : envoyer la publication à l'API
    const at = Date.now();
    const id = `my-${at}`;
    this.items.update((l) => [{ ...p, id, at }, ...l]);
    this.save();
    // visible aussi pour mes contacts (leur fil) — TODO : API
    this.remote.publish({ ...p, id, at });
    return id;
  }

  /** garde la publication pendant le test de connaissance */
  stage(s: StagedPost): void { this.pending = s; }
  staged(): StagedPost | null { return this.pending; }
  discard(): void { this.pending = null; }

  /**
   * Fin du test : la publication en attente est publiée seulement si le score atteint PASS_SCORE.
   * Renvoie l'identifiant de la publication, ou null si elle n'est pas publiée (elle reste en attente pour un nouvel essai).
   * TODO : le score sera calculé et contrôlé côté API.
   */
  completeTest(score: number): string | null {
    const s = this.pending;
    if (!s || score < PASS_SCORE) return null;
    this.pending = null;
    this.clearDraft();
    return this.publish({ kind: 'post', label: `a partagé un ${s.type.toLowerCase()} · test réussi ${score} %`, text: s.text });
  }

  private readDraft(): StagedPost | null {
    try {
      const d = JSON.parse(localStorage.getItem(userKey(KEY_DRAFT)) ?? 'null');
      if (d && typeof d.text === 'string' && typeof d.type === 'string' && typeof d.topic === 'string') return d as StagedPost;
    } catch { /* stockage indisponible ou illisible */ }
    return null;
  }

  private read(): MyPost[] {
    try {
      const saved = JSON.parse(localStorage.getItem(userKey(KEY)) ?? 'null');
      if (Array.isArray(saved)) return saved as MyPost[];
    } catch { /* stockage indisponible ou illisible */ }
    return [];
  }

  private save(): void {
    try { localStorage.setItem(userKey(KEY), JSON.stringify(this.items())); } catch { /* stockage indisponible */ }
  }
}
