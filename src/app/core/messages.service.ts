import { Injectable, computed, inject, signal } from '@angular/core';
import { NetworkService, Person } from './network.service';
import { RemoteUser } from './remote-store';
import { RemoteService } from './remote.service';
import { loadJson, saveJson } from './storage';

const KEY = 'ec-messages';

/** Élément qu'on peut partager (publication ou défi) : envoyé dans une conversation, il s'affiche comme une carte cliquable. */
export interface ShareItem {
  /** identifiant (publication ou défi) */
  id: string;
  kind: 'post' | 'challenge';
  title: string;
  sub?: string;
  link: string;
  query?: Record<string, string>;
}
export type MsgShare = Pick<ShareItem, 'title' | 'sub' | 'link' | 'query'>;

/** Destinataire possible d'un partage : un groupe, une discussion existante ou un contact sans discussion. */
export interface ShareTarget {
  key: string;
  name: string;
  initials: string;
  group: boolean;
  sub: string;
  conversationId?: number;
  person?: Person;
}

export interface Msg { from: 'me' | 'them'; text: string; who?: string; share?: MsgShare }
export interface Conversation {
  id: number;
  initials: string;
  name: string;
  group: boolean;
  verified?: boolean;
  status: string;
  time: string;
  unread: number;
  /** message envoyé à quelqu'un qui n'est pas dans mes contacts : il est rangé dans les indésirables (Spam) */
  spam?: boolean;
  /** compte de la personne (discussion à deux) : mes messages lui sont livrés, les siens arrivent ici */
  email?: string;
  messages: Msg[];
}

/** Conversations partagées entre le panneau « Messenger » de la barre du haut et la page /messages. */
@Injectable({ providedIn: 'root' })
export class MessagesService {
  private readonly net = inject(NetworkService);
  private readonly remote = inject(RemoteService);

  // TODO : remplacer par l'API / WebSocket
  /** vide au départ : les conversations naissent des messages envoyés et reçus */
  readonly conversations = signal<Conversation[]>(loadJson<Conversation[]>(KEY, []));

  readonly unreadTotal = computed(() => this.conversations().reduce((n, c) => n + c.unread, 0));
  /** discussions normales (sans les indésirables) : celles du panneau « Messenger » de la barre du haut */
  readonly inbox = computed(() => this.conversations().filter((c) => !c.spam));

  /** à qui on peut envoyer une publication ou un défi : groupes d'abord, puis discussions et contacts */
  readonly targets = computed<ShareTarget[]>(() => {
    const convs = this.inbox();
    const asTarget = (c: Conversation): ShareTarget => ({ key: `c:${c.id}`, conversationId: c.id, name: c.name, initials: c.initials, group: c.group, sub: c.status });
    const direct = convs.filter((c) => !c.group).map(asTarget);
    const known = new Set(direct.map((t) => t.name));
    const others = this.net.contacts()
      .filter((p) => !known.has(p.name))
      .map((p): ShareTarget => ({ key: `p:${p.name}`, person: p, name: p.name, initials: p.initials, group: false, sub: p.role }));
    return [...convs.filter((c) => c.group).map(asTarget), ...direct, ...others];
  });

  preview(c: Conversation): string {
    const m = c.messages[c.messages.length - 1];
    if (!m) return '';
    const text = m.share ? `${m.text} : ${m.share.title}` : m.text;
    return m.from === 'me' ? `Vous : ${text}` : m.who ? `${m.who} : ${text}` : text;
  }

  markRead(id: number): void {
    this.conversations.update((list) => list.map((c) => (c.id === id && c.unread ? { ...c, unread: 0 } : c)));
    this.persist();
  }

  private persist(): void { saveJson(KEY, this.conversations()); }

  /** ajoute mon message ; la conversation remonte en haut de la liste */
  send(id: number, text: string, share?: MsgShare): void {
    const t = text.trim();
    if (!t) return;
    // TODO : envoyer au serveur
    const email = this.conversations().find((x) => x.id === id)?.email;
    this.conversations.update((list) => {
      const c = list.find((x) => x.id === id);
      if (!c) return list;
      const msg: Msg = share ? { from: 'me', text: t, share } : { from: 'me', text: t };
      return [{ ...c, time: 'À l’instant', messages: [...c.messages, msg] }, ...list.filter((x) => x.id !== id)];
    });
    this.persist();
    this.remote.send(email, { type: 'message', text: t, share });
  }

  /**
   * Message reçu d'un autre compte (appelé par SyncService) : il rejoint la discussion avec cette personne, non lu.
   * Une personne qui n'est pas dans mes contacts va dans les indésirables (Spam). Renvoie l'identifiant de la discussion.
   */
  receive(from: RemoteUser, text: string, share?: MsgShare): number {
    const known = this.net.contacts().some((c) => c.email === from.email);
    const msg: Msg = share ? { from: 'them', text, share } : { from: 'them', text };
    let id = 0;
    this.conversations.update((list) => {
      const ex = list.find((c) => !c.group && (c.email === from.email || (!c.email && c.name === from.name)));
      if (ex) {
        id = ex.id;
        return [{ ...ex, email: from.email, spam: known ? false : ex.spam, time: 'À l’instant', unread: ex.unread + 1, messages: [...ex.messages, msg] }, ...list.filter((x) => x.id !== ex.id)];
      }
      id = Math.max(Date.now(), ...list.map((c) => c.id + 1));
      return [{ id, initials: from.initials, name: from.name, group: false, status: from.role, time: 'À l’instant', unread: 1, spam: !known, email: from.email, messages: [msg] }, ...list];
    });
    this.persist();
    return id;
  }

  /**
   * Envoie une publication ou un défi à un groupe ou un contact (liste `targets`) : le message arrive dans la conversation.
   * Renvoie l'identifiant de la conversation (créée si le contact n'en avait pas encore).
   */
  share(t: ShareTarget, text: string, item: MsgShare): number | null {
    const share: MsgShare = { title: item.title, sub: item.sub, link: item.link, query: item.query };
    if (t.conversationId !== undefined) {
      this.send(t.conversationId, text, share);
      return t.conversationId;
    }
    return t.person ? this.start({ initials: t.person.initials, name: t.person.name, role: t.person.role, email: t.person.email }, text, true, share) : null;
  }

  /**
   * Nouveau message à une personne.
   *  - une conversation existe déjà avec elle : le message y est ajouté ;
   *  - sinon on crée la conversation ; si la personne n'est pas dans mes contacts, elle va dans les indésirables (Spam).
   * Renvoie l'identifiant de la conversation (null si le message est vide).
   */
  start(to: { initials: string; name: string; role: string; email?: string }, text: string, isContact: boolean, share?: MsgShare): number | null {
    const t = text.trim();
    if (!t) return null;
    const existing = this.conversations().find((c) => !c.group && (to.email && c.email ? c.email === to.email : c.name === to.name));
    if (existing) {
      // une discussion créée sans compte (anciennes données) reçoit l'e-mail : les messages suivants sont livrés
      if (to.email && !existing.email) { this.conversations.update((l) => l.map((c) => (c.id === existing.id ? { ...c, email: to.email } : c))); }
      this.send(existing.id, t, share);
      return existing.id;
    }
    // TODO : envoyer au serveur
    // identifiant unique, même si deux conversations naissent dans la même milliseconde
    const id = Math.max(Date.now(), ...this.conversations().map((c) => c.id + 1));
    this.conversations.update((list) => [
      { id, initials: to.initials, name: to.name, group: false, status: to.role, time: 'À l’instant', unread: 0, spam: !isContact, email: to.email, messages: [share ? { from: 'me', text: t, share } : { from: 'me', text: t }] },
      ...list,
    ]);
    this.persist();
    this.remote.send(to.email, { type: 'message', text: t, share });
    return id;
  }
}
