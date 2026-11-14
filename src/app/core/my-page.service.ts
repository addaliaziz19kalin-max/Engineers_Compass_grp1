import { userKey } from './storage';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { slugify } from '../shared/slug';
import { ChallengesService } from './challenges.service';
import { ago } from './posts.service';
import { UserService } from './user.service';

export type PageStatus = 'pending' | 'verified';
export type PostKind = 'post' | 'offer' | 'challenge';

export interface MyPage {
  slug: string;
  name: string;
  initials: string;
  sector: string;
  city: string;
  size: string;
  about: string;
  status: PageStatus;
  /** date de création (ms) : le délai de vérification de 14 jours part de là */
  createdAt: number;
  warnings: number;
}

export type PageData = Pick<MyPage, 'name' | 'sector' | 'city' | 'size' | 'about'>;

export interface PagePost { id: number; kind: PostKind; title: string; text: string; when: string; photo?: string }
export interface Applicant { id: number; offerId: number; name: string; initials: string; role: string; score: number; when: string }
export interface Solution { id: number; challengeId: number; name: string; initials: string; role: string; score: number; when: string; text: string }

/** Délai (en jours) pour envoyer les documents, puis nombre d'avertissements avant suspension. */
export const VERIFY_DAYS = 14;
export const MAX_WARNINGS = 3;

/** Choix proposés à la création et à la modification de la page. */
export const SECTORS = ['Télécommunications', 'Logiciel et IT', 'Data et IA', 'Énergie', 'Industrie', 'Santé', 'Éducation et recherche', 'Autre'];
export const SIZES = ['1-10', '10-50', '50-200', '200-500', '+500'];

const KEY = 'ec-my-page';
const DAY = 86_400_000;

export function initialsOf(name: string): string {
  const w = name.replace(/[.’']/g, ' ').split(/\s+/).filter(Boolean);
  return (w.length > 1 ? w[0][0] + w[w.length - 1][0] : (w[0] ?? '').slice(0, 2)).toUpperCase();
}

/**
 * Page entreprise créée par un employeur.
 * Elle n'est gérée que depuis le compte de son administrateur (/ma-page) : les outils
 * (candidatures, tableau de bord, solutions, modification) ne sont jamais montrés à un visiteur.
 * TODO : remplacer par l'API (création, vérification des documents, publications).
 */
@Injectable({ providedIn: 'root' })
export class MyPageService {
  private readonly user = inject(UserService);
  private readonly challengesSvc = inject(ChallengesService);

  readonly page = signal<MyPage | null>(this.read().page);
  readonly posts = signal<PagePost[]>(this.read().posts);

  /** candidatures reçues sur les offres de la page (TODO : API) */
  readonly applicants = signal<Applicant[]>([]);
  /** solutions proposées aux défis de la page : celles que reçoit le service des défis (TODO : API) */
  readonly solutions = computed<Solution[]>(() =>
    this.challengesSvc.received().map((s) => {
      const t = ago(s.at);
      return { id: s.id, challengeId: s.challengeId, name: s.name, initials: s.initials, role: s.role, score: s.score, when: t.charAt(0).toUpperCase() + t.slice(1), text: s.text };
    }),
  );

  readonly offers = computed(() => this.posts().filter((p) => p.kind === 'offer'));
  readonly challenges = computed(() => this.posts().filter((p) => p.kind === 'challenge'));
  readonly publications = computed(() => this.posts().filter((p) => p.kind === 'post'));

  /** jours restants pour envoyer les documents officiels */
  readonly daysLeft = computed(() => {
    const p = this.page();
    return p ? Math.max(0, VERIFY_DAYS - Math.floor((Date.now() - p.createdAt) / DAY)) : 0;
  });

  constructor() {
    // règle : seul un employeur possède une page. Si le compte n'est pas (ou plus) employeur, aucune page n'est conservée.
    effect(() => { if (!this.user.isEmployer() && this.page()) this.clear(); });
  }

  /** nouveau compte ou compte non employeur : repart sans page */
  clear(): void {
    this.page.set(null);
    this.posts.set([]);
    this.applicants.set([]);
    this.challengesSvc.clearMine();
    this.save();
  }

  create(data: PageData, verified: boolean): void {
    if (!this.user.isEmployer()) return; // seuls les employeurs créent une page
    this.page.set({
      ...data,
      slug: slugify(data.name),
      initials: initialsOf(data.name),
      status: verified ? 'verified' : 'pending',
      createdAt: Date.now(),
      warnings: 0,
    });
    this.posts.set([]);
    this.save();
  }

  update(data: PageData): void {
    this.page.update((p) => (p ? { ...p, ...data, slug: slugify(data.name), initials: initialsOf(data.name) } : p));
    this.save();
  }

  verify(): void {
    this.page.update((p) => (p ? { ...p, status: 'verified', warnings: 0 } : p));
    this.save();
  }

  publish(kind: PostKind, title: string, text: string, photo?: string): void {
    // TODO : envoyer la publication / l'offre / le défi à l'API
    const id = Date.now();
    this.posts.update((l) => [{ id, kind, title, text, when: 'À l’instant', photo }, ...l]);
    this.save();
    // un défi publié apparaît aussi dans la page Défis (même identifiant), avec cette page comme auteur
    const pg = this.page();
    if (kind === 'challenge' && pg) this.challengesSvc.addMine(id, { name: pg.name, sector: pg.sector }, title, text);
  }

  applicantsOf(offerId: number): Applicant[] { return this.applicants().filter((a) => a.offerId === offerId); }
  solutionsOf(challengeId: number): Solution[] { return this.solutions().filter((s) => s.challengeId === challengeId); }

  private read(): { page: MyPage | null; posts: PagePost[] } {
    try {
      const saved = JSON.parse(localStorage.getItem(userKey(KEY)) ?? 'null');
      if (saved?.page) return { page: saved.page as MyPage, posts: (saved.posts as PagePost[]) ?? [] };
    } catch { /* stockage indisponible ou illisible */ }
    return { page: null, posts: [] };
  }

  private save(): void {
    try { localStorage.setItem(userKey(KEY), JSON.stringify({ page: this.page(), posts: this.posts() })); } catch { /* stockage indisponible */ }
  }
}
