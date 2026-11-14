import { Injectable, inject, signal } from '@angular/core';
import { ProfileService } from './profile.service';
import { userKey } from './storage';

export interface PostComment { id: number; name: string; initials: string; text: string; when: string; mine?: boolean }

const KEY = 'ec-reactions';

/** commentaires déjà présents sous les publications des autres membres (vide tant que l'API n'est pas branchée) */
const SEED: PostComment[] = [];

/**
 * « J’aime » et commentaires des publications.
 *  - J’aime : un clic aime la publication, le 2e clic retire le « J’aime ».
 *  - Commenter : ouvre / ferme la zone de commentaires ; on peut ajouter et supprimer ses commentaires.
 * Chaque publication est repérée par un identifiant (ex. « post-1 »).
 * TODO : remplacer par l'API (réactions et commentaires).
 */
@Injectable({ providedIn: 'root' })
export class ReactionsService {
  private readonly profile = inject(ProfileService);
  private readonly liked = signal<string[]>(this.read().liked);
  private readonly mine = signal<Record<string, PostComment[]>>(this.read().comments);
  /** publications dont la zone de commentaires est ouverte */
  private readonly open = signal<string[]>([]);
  /** commentaire dont le menu « … » est ouvert (un seul à la fois) */
  readonly menu = signal<number | null>(null);

  isLiked(id: string): boolean { return this.liked().includes(id); }

  toggleLike(id: string): void {
    this.liked.update((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));
    this.save();
  }

  /** nombre de réactions : celles de départ + la mienne */
  likes(id: string, base: number): number { return base + (this.isLiked(id) ? 1 : 0); }

  toggleMenu(commentId: number): void { this.menu.update((m) => (m === commentId ? null : commentId)); }
  closeMenu(): void { this.menu.set(null); }

  isOpen(id: string): boolean { return this.open().includes(id); }
  toggleOpen(id: string): void { this.open.update((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id])); }

  /** commentaires d'exemple (les `seed` premiers) puis les miens */
  comments(id: string, seed = 0): PostComment[] { return [...SEED.slice(0, seed), ...(this.mine()[id] ?? [])]; }
  count(id: string, seed = 0): number { return this.comments(id, seed).length; }

  add(id: string, text: string): void {
    const t = text.trim();
    if (!t) return;
    // TODO : envoyer le commentaire à l'API
    const c: PostComment = { id: Date.now(), name: this.profile.info().name, initials: this.profile.initials(), text: t, when: 'À l’instant', mine: true };
    this.mine.update((m) => ({ ...m, [id]: [...(m[id] ?? []), c] }));
    this.save();
  }

  remove(id: string, commentId: number): void {
    // TODO : supprimer le commentaire côté API
    this.menu.set(null);
    this.mine.update((m) => ({ ...m, [id]: (m[id] ?? []).filter((c) => c.id !== commentId) }));
    this.save();
  }

  private read(): { liked: string[]; comments: Record<string, PostComment[]> } {
    try {
      const saved = JSON.parse(localStorage.getItem(userKey(KEY)) ?? 'null');
      if (saved) return { liked: saved.liked ?? [], comments: saved.comments ?? {} };
    } catch { /* stockage indisponible ou illisible */ }
    return { liked: [], comments: {} };
  }

  private save(): void {
    try { localStorage.setItem(userKey(KEY), JSON.stringify({ liked: this.liked(), comments: this.mine() })); } catch { /* stockage indisponible */ }
  }
}

/** « 1 commentaire », « 3 commentaires » */
export function plural(n: number, one: string, many: string): string { return `${n} ${n > 1 ? many : one}`; }
