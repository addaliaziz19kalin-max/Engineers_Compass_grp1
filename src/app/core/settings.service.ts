import { purgeRemote } from './remote-store';
import { currentEmail, isUserKey, userKey } from './storage';
import { Injectable, signal } from '@angular/core';

export interface DeviceSession { id: string; device: string; place: string; last: string }
type Value = string | boolean;

interface Stored { values?: Record<string, Value>; email?: string; sessions?: DeviceSession[]; pwdAt?: number | null }

const KEY = 'ec-settings';


/**
 * Réglages du compte : confidentialité, notifications, langue, sécurité, e-mail, appareils connectés.
 * Ils sont gardés sur cet appareil ; chaque méthode porte le TODO de son appel API.
 */
@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly stored = this.read();

  /** valeurs enregistrées (par identifiant de ligne) ; absent = valeur par défaut de la page */
  readonly values = signal<Record<string, Value>>(this.stored.values ?? {});
  /** adresse e-mail du compte (celle de l'inscription ou de la connexion) */
  readonly email = signal(this.stored.email ?? currentEmail());
  /** autres appareils connectés (la session actuelle n'en fait pas partie) */
  readonly sessions = signal<DeviceSession[]>(this.stored.sessions ?? []);
  /** date du dernier changement de mot de passe (null : jamais depuis l'inscription) */
  readonly pwdAt = signal<number | null>(this.stored.pwdAt ?? null);

  /** enregistre les réglages modifiés dans la page */
  save(edits: Record<string, Value>): void {
    // TODO : envoyer les réglages à l'API
    this.values.update((v) => ({ ...v, ...edits }));
    this.persist();
  }

  setEmail(email: string): void {
    // TODO : l'API envoie un lien de confirmation à la nouvelle adresse
    this.email.set(email.trim());
    this.persist();
  }

  /** mot de passe changé (la vérification de l'ancien mot de passe se fera côté API) */
  markPasswordChanged(): void {
    // TODO : envoyer l'ancien et le nouveau mot de passe à l'API
    this.pwdAt.set(Date.now());
    this.persist();
  }

  revokeSession(id: string): void {
    // TODO : révoquer la session côté API
    this.sessions.update((l) => l.filter((s) => s.id !== id));
    this.persist();
  }

  revokeOthers(): void {
    // TODO : révoquer toutes les autres sessions côté API
    this.sessions.set([]);
    this.persist();
  }

  /** toutes les données de ce compte gardées sur l'appareil, au format JSON (« Télécharger mes données ») */
  exportJson(email: string, account: Record<string, unknown>): string {
    const data: Record<string, unknown> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !isUserKey(k, email)) continue;
      const raw = localStorage.getItem(k);
      try { data[k.slice(0, -(email.length + 1))] = JSON.parse(raw ?? 'null'); } catch { data[k] = raw; }
    }
    return JSON.stringify({ exportedAt: new Date().toISOString(), account, data }, null, 2);
  }

  /** suppression du compte : on efface tout ce que l'application garde pour CE compte (les autres comptes et le thème restent) */
  eraseAll(email: string): void {
    // TODO : supprimer le compte et ses données côté API
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && isUserKey(k, email)) keys.push(k); }
      keys.forEach((k) => localStorage.removeItem(k));
      purgeRemote(email); // ses publications disparaissent aussi du fil de ses contacts
    } catch { /* stockage indisponible */ }
  }

  private persist(): void {
    const s: Stored = { values: this.values(), email: this.email(), sessions: this.sessions(), pwdAt: this.pwdAt() };
    try { localStorage.setItem(userKey(KEY), JSON.stringify(s)); } catch { /* stockage indisponible */ }
  }

  private read(): Stored {
    try {
      const saved = JSON.parse(localStorage.getItem(userKey(KEY)) ?? 'null');
      if (saved && typeof saved === 'object') return saved as Stored;
    } catch { /* stockage indisponible ou illisible */ }
    return {};
  }
}
