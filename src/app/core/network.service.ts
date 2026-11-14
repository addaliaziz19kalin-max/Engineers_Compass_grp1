import { loadJson, saveJson, userKey } from './storage';
import { Injectable, computed, inject, signal } from '@angular/core';
import { NotificationsService } from './notifications.service';
import { RemoteUser } from './remote-store';
import { RemoteService } from './remote.service';

/** `email` : compte du membre (sert à lui envoyer l'invitation et les messages) ; absent pour une personne sans compte */
export interface Person { id: number; initials: string; name: string; role: string; mutual: number; email?: string }

/** identifiant numérique stable d'un compte (le même à chaque lecture) */
const idOf = (email: string): number => { let h = 7; for (const c of email) h = (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0; return h; };
const personOf = (u: RemoteUser): Person => ({ id: idOf(u.email), email: u.email, initials: u.initials, name: u.name, role: u.role, mutual: 0 });
const KEY_SENT = 'ec-reseau-envoyees';
const KEY = 'ec-reseau';

export interface Page { id: number; initials: string; name: string; sector: string; followers: string }

/** Réseau : contacts, invitations reçues, personnes suggérées et pages suivies. */
@Injectable({ providedIn: 'root' })
export class NetworkService {
  private readonly notifs = inject(NotificationsService);
  private readonly remote = inject(RemoteService);

  // TODO : remplacer par l'API
  /** invitations reçues, contacts, suggestions et pages suivies : vides au départ, rattachés au compte */
  private readonly stored = loadJson<{ invitations?: Person[]; contacts?: Person[]; pages?: Page[] }>(KEY, {});
  readonly invitations = signal<Person[]>(this.stored.invitations ?? []);

  readonly contacts = signal<Person[]>(this.stored.contacts ?? []);

  /** personnes suggérées : les membres inscrits qui ne sont pas encore mes contacts (TODO : l'API les calcule) */
  readonly suggestions = computed<Person[]>(() => {
    const known = new Set([...this.contacts(), ...this.invitations()].map((p) => p.email));
    return this.remote.others().filter((u) => !known.has(u.email)).map(personOf);
  });
  /** demandes de connexion que j'ai envoyées, en attente de réponse (visibles dans « Mon réseau » · Invitations) */
  readonly sent = signal<Person[]>(this.readSent());

  readonly pages = signal<Page[]>(this.stored.pages ?? []);

  accept(id: number): void {
    const p = this.invitations().find((i) => i.id === id);
    if (!p) return;
    this.invitations.update((l) => l.filter((i) => i.id !== id));
    this.contacts.update((l) => [p, ...l]);
    this.sent.update((l) => l.filter((s) => (p.email ? s.email !== p.email : s.name !== p.name)));
    this.persist();
    this.saveSent();
    // l'auteur de l'invitation est prévenu : je deviens son contact
    this.remote.send(p.email, { type: 'accepted' });
  }
  ignore(id: number): void { this.invitations.update((l) => l.filter((i) => i.id !== id)); this.persist(); }
  removeContact(id: number): void { this.contacts.update((l) => l.filter((c) => c.id !== id)); this.persist(); }
  isRequested(name: string): boolean { return this.sent().some((p) => p.name === name); }

  /** « Se connecter » (profil d'un membre, suggestions, recherche) : une seule demande par personne */
  request(p: Omit<Person, 'id'>): void {
    if (this.isRequested(p.name) || this.contacts().some((c) => c.name === p.name)) return;
    // la personne la reçoit dans ses invitations (TODO : API)
    this.sent.update((l) => [{ ...p, id: Date.now() }, ...l]);
    this.saveSent();
    this.remote.send(p.email, { type: 'invite' });
    this.notifs.push({ icon: 'user-plus', cat: 'network', text: `Demande de connexion envoyée à ${p.name}`, link: '/reseau/invitations' });
  }

  cancelRequest(name: string): void {
    // TODO : annuler la demande côté API
    this.remote.send(this.sent().find((p) => p.name === name)?.email, { type: 'cancel' });
    this.sent.update((l) => l.filter((p) => p.name !== name));
    this.saveSent();
  }
  isFollowing(name: string): boolean { return this.pages().some((p) => p.name === name); }
  follow(p: Omit<Page, 'id'>): void {
    if (this.isFollowing(p.name)) return;
    this.pages.update((l) => [{ ...p, id: Date.now() }, ...l]);
    this.persist();
  }
  unfollowByName(name: string): void { this.pages.update((l) => l.filter((p) => p.name !== name)); this.persist(); }
  unfollow(id: number): void { this.pages.update((l) => l.filter((p) => p.id !== id)); this.persist(); }

  // ----- ce que les autres comptes m'envoient (appelé par SyncService) ; renvoie true si quelque chose a changé -----

  /** invitation reçue ; si je l'avais invité moi aussi, nous devenons contacts directement */
  receiveInvite(from: RemoteUser): boolean {
    if (this.contacts().some((c) => c.email === from.email) || this.invitations().some((i) => i.email === from.email)) return false;
    if (this.sent().some((s) => s.email === from.email)) return this.receiveAccepted(from);
    this.invitations.update((l) => [personOf(from), ...l]);
    this.persist();
    return true;
  }

  /** ma demande a été acceptée : la personne devient mon contact */
  receiveAccepted(from: RemoteUser): boolean {
    this.sent.update((l) => l.filter((s) => s.email !== from.email));
    this.saveSent();
    if (this.contacts().some((c) => c.email === from.email)) return false;
    this.invitations.update((l) => l.filter((i) => i.email !== from.email));
    this.contacts.update((l) => [personOf(from), ...l]);
    this.persist();
    return true;
  }

  /** la personne a retiré sa demande */
  receiveCancel(from: RemoteUser): void {
    if (!this.invitations().some((i) => i.email === from.email)) return;
    this.invitations.update((l) => l.filter((i) => i.email !== from.email));
    this.persist();
  }

  private persist(): void { saveJson(KEY, { invitations: this.invitations(), contacts: this.contacts(), pages: this.pages() }); }

  private readSent(): Person[] {
    try {
      const saved = JSON.parse(localStorage.getItem(userKey(KEY_SENT)) ?? 'null');
      if (Array.isArray(saved)) return saved as Person[];
    } catch { /* stockage indisponible ou illisible */ }
    return [];
  }

  private saveSent(): void {
    try { localStorage.setItem(userKey(KEY_SENT), JSON.stringify(this.sent())); } catch { /* stockage indisponible */ }
  }
}
