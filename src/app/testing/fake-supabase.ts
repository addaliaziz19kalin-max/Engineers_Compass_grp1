import type { UserRole } from '../core/user.service';

const ACCOUNTS = 'fake-sb-accounts';
const SESSION = 'fake-sb-session';

interface FakeAccount { id: string; email: string; password: string; role: UserRole; name: string }
export interface FakeSession { id: string; email: string; role: UserRole }

const read = <T>(key: string, fallback: T): T => {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback; } catch { return fallback; }
};

/**
 * Faux Supabase pour les tests : les comptes vivent en mémoire du navigateur de test (localStorage),
 * ce qui permet de « recharger la page » sans serveur ni connexion Internet.
 */
export class FakeSupabaseService {
  readonly configured = true;

  readonly client = {
    auth: {
      getSession: async () => ({ data: { session: this.toSupabase(this.savedSession()) }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
      signUp: async (p: { email: string; password: string; options?: { data?: { name?: string; role?: UserRole } } }) => {
        const email = p.email.trim().toLowerCase();
        if (this.accounts().some((a) => a.email === email)) return { data: { user: null, session: null }, error: { message: 'User already registered' } };
        const account: FakeAccount = { id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, email, password: p.password, role: p.options?.data?.role ?? 'student', name: p.options?.data?.name ?? '' };
        localStorage.setItem(ACCOUNTS, JSON.stringify([...this.accounts(), account]));
        const session = this.open(account);
        return { data: { user: session.user, session }, error: null };
      },
      signInWithPassword: async (p: { email: string; password: string }) => {
        const email = p.email.trim().toLowerCase();
        const account = this.accounts().find((a) => a.email === email && a.password === p.password);
        if (!account) return { data: { user: null, session: null }, error: { message: 'Invalid login credentials' } };
        return { data: { user: this.toSupabase(account)?.user, session: this.open(account) }, error: null };
      },
      signOut: async () => { localStorage.removeItem(SESSION); return { error: null }; },
      updateUser: async (attrs: { email?: string; password?: string }) => {
        const me = this.savedSession();
        if (!me) return { data: null, error: { message: 'not authenticated' } };
        localStorage.setItem(ACCOUNTS, JSON.stringify(this.accounts().map((a) => (a.id === me.id ? { ...a, ...(attrs.email ? { email: attrs.email } : {}), ...(attrs.password ? { password: attrs.password } : {}) } : a))));
        return { data: null, error: null };
      },
    },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }),
    rpc: async () => ({ error: null }),
  };

  /** session gardée par le faux serveur (relue au « rechargement de la page ») */
  savedSession(): FakeSession | null { return read<FakeSession | null>(SESSION, null); }

  private accounts(): FakeAccount[] { return read<FakeAccount[]>(ACCOUNTS, []); }

  private open(a: FakeAccount) {
    localStorage.setItem(SESSION, JSON.stringify({ id: a.id, email: a.email, role: a.role } satisfies FakeSession));
    return this.toSupabase(a)!;
  }

  private toSupabase(a: FakeSession | FakeAccount | null) {
    return a ? { user: { id: a.id, email: a.email, user_metadata: { role: a.role } } } : null;
  }
}
