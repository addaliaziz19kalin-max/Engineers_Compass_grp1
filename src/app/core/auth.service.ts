import { Injectable, computed, inject, signal } from '@angular/core';
import type { Session as SupabaseSession } from '@supabase/supabase-js';
import { setCurrentEmail } from './storage';
import { SupabaseService, setRemember } from './supabase.service';
import type { UserRole } from './user.service';

/** Session ouverte : identifiant, e-mail et rôle du compte (le rôle vient du serveur, voir `loadRole`). */
export interface Session { id: string; email: string; role: UserRole }

const ROLES: UserRole[] = ['student', 'engineer', 'employer', 'other'];
const asRole = (v: unknown): UserRole => (ROLES.includes(v as UserRole) ? (v as UserRole) : 'student');

/**
 * Connexion et session du compte, avec Supabase Auth.
 *  - inscription : `signUp` ; le nom et le rôle passent dans `options.data` (un déclencheur de la base crée le profil) ;
 *  - connexion : `signInWithPassword` ; « Rester connecté » choisit où la session est gardée ;
 *  - le rôle affiché est relu dans la table `profiles` (vérifié côté serveur), sinon dans les données d'inscription.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supa = inject(SupabaseService);
  private readonly sb = this.supa.client;

  readonly session = signal<Session | null>(null);
  readonly isLoggedIn = computed(() => this.session() !== null);

  /** lancé au démarrage de l'application (voir app.config.ts) : relit la session puis suit ses changements */
  async init(): Promise<void> {
    if (!this.supa.configured) { console.warn('Supabase : renseignez supabaseUrl et supabaseKey dans src/environments/environment.ts'); return; }
    const { data } = await this.sb.auth.getSession();
    await this.apply(data.session);
    // pas d'appel Supabase « attendu » dans ce rappel (risque de blocage) : on repasse par setTimeout
    this.sb.auth.onAuthStateChange((_event, s) => setTimeout(() => void this.apply(s), 0));
  }

  /** conservé pour les écrans existants : Supabase ne révèle pas si un e-mail existe (on laisse `register` / `login` répondre) */
  exists(_email: string): boolean { return false; }

  /** crée le compte et ouvre la session ; false si l'e-mail est déjà utilisé */
  async register(email: string, password: string, role: UserRole, name = ''): Promise<boolean> {
    const { data, error } = await this.sb.auth.signUp({
      email: this.norm(email), password, options: { data: { name: name.trim(), role } },
    });
    if (error) {
      if (/already|registered|exists/i.test(error.message)) return false;
      throw error;
    }
    // e-mail déjà inscrit : Supabase renvoie un utilisateur sans identité
    if (data.user && (data.user.identities?.length ?? 1) === 0) return false;
    if (data.session) await this.apply(data.session);
    return true;
  }

  /** ouvre la session si l'e-mail et le mot de passe correspondent à un compte */
  async login(email: string, password: string, remember: boolean): Promise<boolean> {
    setRemember(remember);
    const { data, error } = await this.sb.auth.signInWithPassword({ email: this.norm(email), password });
    if (error || !data.session) return false;
    await this.apply(data.session);
    return true;
  }

  /** ferme la session : plus aucune page du compte ne s'ouvre */
  async logout(): Promise<void> {
    this.session.set(null);
    setCurrentEmail('');
    try { await this.sb.auth.signOut(); } catch { /* hors ligne : la session locale est quand même effacée */ }
  }

  /**
   * supprime le compte connecté. Nécessite une fonction SQL `delete_my_account()` (security definer) côté Supabase :
   * le navigateur n'a pas le droit de supprimer un utilisateur Auth.
   */
  async deleteAccount(): Promise<void> {
    try { await this.sb.rpc('delete_my_account'); } catch { /* fonction absente : la session est seulement fermée */ }
    try {
      const me = this.session()?.email;
      const list = JSON.parse(localStorage.getItem('ec-accounts') ?? '[]') as { email: string }[];
      localStorage.setItem('ec-accounts', JSON.stringify(list.filter((a) => a.email !== me)));
    } catch { /* stockage indisponible */ }
    await this.logout();
  }

  /** nouvelle adresse e-mail du compte connecté (Supabase envoie un lien de confirmation) ; false si refusée ou déjà utilisée */
  async changeEmail(email: string): Promise<boolean> {
    const { error } = await this.sb.auth.updateUser({ email: this.norm(email) });
    return !error;
  }

  /** change le mot de passe du compte connecté ; false si l'ancien est faux */
  async changePassword(current: string, next: string): Promise<boolean> {
    const s = this.session();
    if (!s) return false;
    const check = await this.sb.auth.signInWithPassword({ email: s.email, password: current });
    if (check.error) return false;
    const { error } = await this.sb.auth.updateUser({ password: next });
    return !error;
  }

  // ----- session -----

  private async apply(s: SupabaseSession | null): Promise<void> {
    if (!s?.user?.email) { this.session.set(null); setCurrentEmail(''); return; }
    const email = s.user.email.toLowerCase();
    const role = asRole(s.user.user_metadata?.['role']);
    setCurrentEmail(email);
    this.session.set({ id: s.user.id, email, role });
    this.listInDirectory(email, role);
    // le rôle fait foi côté serveur : on le relit dans `profiles`
    const verified = await this.loadRole(s.user.id);
    if (verified && verified !== role) this.session.set({ id: s.user.id, email, role: verified });
  }

  private async loadRole(id: string): Promise<UserRole | null> {
    try {
      const { data } = await this.sb.from('profiles').select('role').eq('id', id).maybeSingle();
      return data?.role ? asRole(data.role) : null;
    } catch { return null; }
  }

  /**
   * Pont temporaire : l'annuaire simulé (remote-store.ts) lit encore la liste locale `ec-accounts`.
   * Tant que réseau, messages et fil n'utilisent pas Supabase, le compte connecté y est inscrit pour être visible des autres comptes
   * du même navigateur. Disparaît avec remote-store.ts (étape 10).
   */
  private listInDirectory(email: string, role: UserRole): void {
    try {
      const list = (JSON.parse(localStorage.getItem('ec-accounts') ?? '[]') as { email: string; role: string }[]).filter((a) => a.email !== email);
      localStorage.setItem('ec-accounts', JSON.stringify([...list, { email, role }]));
    } catch { /* stockage indisponible */ }
  }

  private norm(email: string): string { return email.trim().toLowerCase(); }
}
