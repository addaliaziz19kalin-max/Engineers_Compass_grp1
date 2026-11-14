import { userKey } from './storage';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IconName } from '../shared/icon';
import { ago } from './posts.service';

export type NotifCat = 'challenge' | 'offer' | 'verif' | 'network' | 'message';

export interface Notif {
  id: number;
  icon: IconName;
  text: string;
  time: string;
  group: 'today' | 'earlier';
  cat: NotifCat;
  unread: boolean;
  /** page ouverte au clic sur la notification (ex. « /defis ») */
  link?: string;
  query?: Record<string, string>;
  /** date de création (notifications ajoutées par l'application) : sert à recalculer « Il y a … » */
  at?: number;
}

/** Notification à ajouter : le reste (identifiant, heure, non lue) est rempli par le service. */
export type NewNotif = Pick<Notif, 'icon' | 'text' | 'cat' | 'link' | 'query'>;

const KEY = 'ec-notifs-2';
const KEY_OUT = 'ec-notifs-sortantes';

/** Notification destinée à UN AUTRE membre (ex. l'auteur d'un défi que je viens de résoudre). */
export interface OutgoingNotif extends NewNotif { to: string; at: number }
const DAY = 86_400_000;

/** État partagé des notifications (panneau de la cloche + page d'historique). */
@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly router = inject(Router);

  // TODO : remplacer par l'appel API
  readonly items = signal<Notif[]>(this.read() ?? []);

  /**
   * Notifications que j'ai déclenchées pour d'autres membres. TODO : l'API les livre au destinataire
   * (cloche + e-mail) ; en attendant elles sont gardées ici, prêtes à être envoyées.
   */
  readonly outbox = signal<OutgoingNotif[]>(this.readOutbox());

  readonly unreadCount = computed(() => this.items().filter((n) => n.unread).length);

  /** ajoute une notification en haut de la liste (ex. « quelqu'un a résolu votre défi ») */
  push(n: NewNotif): number {
    // TODO : les notifications viendront de l'API (push serveur)
    const id = Math.max(0, ...this.items().map((x) => x.id)) + 1;
    this.items.update((l) => [{ ...n, id, time: 'À l’instant', group: 'today', unread: true, at: Date.now() }, ...l]);
    this.save();
    return id;
  }

  /** prévient un autre membre (il la verra dans sa propre cloche) */
  pushTo(to: string, n: NewNotif): void {
    // TODO : envoyer au serveur, qui crée la notification chez le destinataire
    this.outbox.update((l) => [{ ...n, to, at: Date.now() }, ...l]);
    try { localStorage.setItem(userKey(KEY_OUT), JSON.stringify(this.outbox())); } catch { /* stockage indisponible */ }
  }

  /** clic sur une notification : elle est lue, puis la page liée s'ouvre (si elle en a une) */
  open(n: Notif): void {
    this.markRead(n.id);
    if (n.link) void this.router.navigate([n.link], { queryParams: n.query });
  }

  markAllRead(): void {
    this.items.update((l) => l.map((n) => ({ ...n, unread: false })));
    this.save();
  }

  markRead(id: number): void {
    this.items.update((l) => l.map((n) => (n.id === id ? { ...n, unread: false } : n)));
    this.save();
  }

  private read(): Notif[] | null {
    try {
      const saved = JSON.parse(localStorage.getItem(userKey(KEY)) ?? 'null');
      if (!Array.isArray(saved)) return null;
      // les notifications ajoutées par l'application vieillissent : « À l'instant » devient « Il y a 5 min »
      return (saved as Notif[]).map((n) => {
        if (!n.at) return n;
        const t = ago(n.at);
        return { ...n, time: t.charAt(0).toUpperCase() + t.slice(1), group: Date.now() - n.at < DAY ? 'today' : 'earlier' };
      });
    } catch { return null; /* stockage indisponible ou illisible */ }
  }

  private readOutbox(): OutgoingNotif[] {
    try {
      const saved = JSON.parse(localStorage.getItem(userKey(KEY_OUT)) ?? 'null');
      if (Array.isArray(saved)) return saved as OutgoingNotif[];
    } catch { /* stockage indisponible ou illisible */ }
    return [];
  }

  private save(): void {
    try { localStorage.setItem(userKey(KEY), JSON.stringify(this.items())); } catch { /* stockage indisponible */ }
  }
}
