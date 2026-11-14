import { userKey } from './storage';
import { Injectable, computed, inject, signal } from '@angular/core';
import { ShareItem } from './messages.service';
import { NotificationsService } from './notifications.service';

export type ChallengeDomain = 'Télécoms' | 'Énergie' | 'Santé' | 'Autre';

/** Qui a publié le défi : une entreprise (sa page) ou un membre (son profil). */
export interface ChallengeAuthor {
  kind: 'company' | 'person';
  name: string;
  /** page entreprise ou profil ouvert au clic sur le nom */
  link: string;
  /** titre du membre (ex. « Ingénieur · Embarqué ») */
  role?: string;
}

/** document fourni par l'entreprise pour aider à résoudre le défi */
export interface ChallengeResource { name: string; kind: string; size: string; url: string }

export interface Challenge {
  id: number;
  domain: ChallengeDomain;
  title: string;
  text: string;
  long: string;
  /** description complète affichée dans « Voir le projet » (un paragraphe par ligne) */
  details: string[];
  goals: string[];
  skills: string[];
  progress: number;
  solutions: number;
  /** dossiers d'aide à la résolution (certains défis n'en ont pas) */
  resources: ChallengeResource[];
  /** entreprise ou personne qui a publié le défi */
  author: ChallengeAuthor;
  /** défi publié par MON compte (page entreprise) : c'est moi qui reçois les solutions */
  mine?: boolean;
}

export interface SolutionFile { path: string; size: number }
export interface SentSolution { challengeId: number; text: string; files: SolutionFile[]; at: number }

/** Solution reçue sur UN DE MES défis : envoyée par un autre membre. */
export interface ReceivedSolution {
  id: number;
  challengeId: number;
  name: string;
  initials: string;
  role: string;
  score: number;
  text: string;
  files: number;
  at: number;
}

const KEY = 'ec-defis';
const KEY_MINE = 'ec-defis-publies';
const KEY_RECEIVED = 'ec-defis-recus';

/** secteur de la page entreprise → domaine du défi */
function domainOf(sector: string): ChallengeDomain {
  if (sector === 'Énergie') return 'Énergie';
  if (sector === 'Santé') return 'Santé';
  if (sector === 'Télécommunications') return 'Télécoms';
  return 'Autre';
}

/**
 * Défis et solutions, partagés entre la liste, « Voir le projet » et « Proposer une solution ».
 *  - chaque défi a un auteur : une entreprise ou une personne ;
 *  - quand quelqu'un résout un défi publié par MON compte, je reçois une notification ; un clic dessus
 *    ouvre la page Défis sur cette solution.
 */
@Injectable({ providedIn: 'root' })
export class ChallengesService {
  private readonly notifs = inject(NotificationsService);

  // TODO : remplacer par l'API (défis publiés par les entreprises et les membres) ; vide au départ
  private readonly base: Challenge[] = [];

  /** défis publiés par mon compte (page entreprise) */
  private readonly published = signal<Challenge[]>(this.readList<Challenge>(KEY_MINE));
  /** tous les défis : les miens d'abord, puis ceux des autres entreprises et membres */
  readonly all = computed<Challenge[]>(() => [...this.published(), ...this.base]);

  /** solutions que j'ai envoyées (les fichiers eux-mêmes partent à l'API ; on ne garde ici que leur liste) */
  readonly sent = signal<SentSolution[]>(this.read());
  /** solutions que les autres membres ont envoyées à MES défis */
  readonly received = signal<ReceivedSolution[]>(this.readList<ReceivedSolution>(KEY_RECEIVED));

  find(id: number | null): Challenge | undefined { return this.all().find((c) => c.id === id); }
  /** ma solution à ce défi (visible sous le défi par les autres membres) */
  mineOf(id: number): SentSolution | undefined { return this.sent().find((s) => s.challengeId === id); }
  isProposed(id: number): boolean { return this.sent().some((s) => s.challengeId === id); }

  /** solutions reçues sur l'un de mes défis (les plus récentes d'abord) */
  receivedOf(challengeId: number): ReceivedSolution[] { return this.received().filter((s) => s.challengeId === challengeId); }
  findReceived(id: number | null): ReceivedSolution | undefined { return this.received().find((s) => s.id === id); }
  /** nombre de solutions proposées : celles de départ + les reçues + la mienne */
  count(c: Challenge): number { return c.solutions + this.receivedOf(c.id).length + (this.isProposed(c.id) ? 1 : 0); }

  /** de quoi partager un défi (envoyé dans un groupe ou à un contact depuis la page Défis) */
  shareItem(c: Challenge): ShareItem {
    return { id: `challenge-${c.id}`, kind: 'challenge', title: c.title, sub: `${c.domain} · ${c.author.name}`, link: `/defis/${c.id}` };
  }

  /**
   * J'envoie ma solution au défi de quelqu'un d'autre (`by` : mon nom) :
   *  - l'auteur du défi est prévenu (sa notification est préparée pour l'API) ;
   *  - je reçois moi aussi une notification qui confirme qu'il est prévenu.
   */
  propose(challengeId: number, text: string, files: SolutionFile[], by: string): void {
    // TODO : envoyer la solution et ses fichiers à l'API (multipart) ; l'API prévient l'auteur du défi
    if (this.isProposed(challengeId)) return;
    this.sent.update((l) => [...l, { challengeId, text: text.trim(), files, at: Date.now() }]);
    this.save();

    const c = this.find(challengeId);
    if (!c || c.mine) return;
    const a = c.author;
    this.notifs.pushTo(a.name, {
      icon: 'award', cat: 'challenge',
      text: `${by} a proposé une solution à votre défi « ${c.title} »`,
      link: '/defis',
    });
    this.notifs.push({
      icon: 'check', cat: 'challenge',
      text: `Votre solution à « ${c.title} » est envoyée : ${a.name} ${a.kind === 'company' ? 'a été prévenue' : 'a été prévenu(e)'}`,
      link: `/defis/${c.id}`,
    });
  }

  /** mon entreprise publie un défi : il apparaît dans la page Défis, avec elle comme auteur */
  addMine(id: number, page: { name: string; sector: string }, title: string, text: string): void {
    // TODO : envoyer le défi à l'API
    const clean = text.trim();
    const challenge: Challenge = {
      id, domain: domainOf(page.sector), title,
      text: clean.length > 110 ? `${clean.slice(0, 107)}…` : clean,
      long: clean,
      details: clean.split(/\n+/).filter(Boolean),
      goals: [], skills: [], progress: 0, solutions: 0, resources: [],
      author: { kind: 'company', name: page.name, link: '/ma-page' },
      mine: true,
    };
    this.published.update((l) => [challenge, ...l]);
    this.saveList(KEY_MINE, this.published());
    // TODO : l'API livre les solutions envoyées par les autres membres (et la notification « a résolu votre défi »)
  }

  /** nouveau compte ou compte non employeur : plus de défi publié ni de solution reçue */
  clearMine(): void {
    this.published.set([]);
    this.received.set([]);
    this.saveList(KEY_MINE, []);
    this.saveList(KEY_RECEIVED, []);
  }

  private read(): SentSolution[] {
    try {
      const saved = JSON.parse(localStorage.getItem(userKey(KEY)) ?? 'null');
      if (Array.isArray(saved)) return saved as SentSolution[];
    } catch { /* stockage indisponible ou illisible */ }
    return [];
  }

  private save(): void {
    try { localStorage.setItem(userKey(KEY), JSON.stringify(this.sent())); } catch { /* stockage indisponible */ }
  }

  private readList<T>(key: string): T[] {
    try {
      const saved = JSON.parse(localStorage.getItem(userKey(key)) ?? 'null');
      if (Array.isArray(saved)) return saved as T[];
    } catch { /* stockage indisponible ou illisible */ }
    return [];
  }

  private saveList(key: string, list: unknown[]): void {
    try { localStorage.setItem(userKey(key), JSON.stringify(list)); } catch { /* stockage indisponible */ }
  }
}
