import type { MsgShare } from './messages.service';
import type { MyPost } from './posts.service';

/**
 * « Serveur » simulé : tout ce qui doit être VU PAR UN AUTRE COMPTE passe ici (même navigateur pour l'instant).
 *  - publications : une liste commune (comme une table `posts`) ;
 *  - boîte aux lettres : les événements destinés à un compte (invitation, acceptation, message), lus une seule fois ;
 *  - annuaire : les comptes inscrits (comme une table `profiles`).
 * TODO : remplacer ce fichier par Supabase (tables `posts`, `connections`, `messages`, `profiles` + Realtime).
 * Rien d'autre dans l'application ne lit ces clés : seuls RemoteService et SyncService s'en servent.
 */

/** personne telle que les autres la voient */
export interface RemoteUser { email: string; name: string; initials: string; role: string }

export type RemoteEventBody =
  | { type: 'invite' }
  | { type: 'accepted' }
  | { type: 'cancel' }
  | { type: 'message'; text: string; share?: MsgShare };
export type RemoteEvent = RemoteEventBody & { from: RemoteUser; at: number };

/** publication publique, avec son auteur */
export type RemotePost = MyPost & { author: RemoteUser };

const POSTS_KEY = 'ec-remote-posts';
const MAX_POSTS = 500;
/** la clé finit par « :e-mail » : elle est donc effacée avec le compte (voir SettingsService.eraseAll) */
const mailboxKey = (email: string) => `ec-remote-boite:${email}`;

function readJson<T>(key: string, fallback: T): T {
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? 'null');
    if (saved !== null && Array.isArray(saved) === Array.isArray(fallback)) return saved as T;
  } catch { /* stockage indisponible ou illisible */ }
  return fallback;
}

function writeJson(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* stockage indisponible */ }
}

const initialsOf = (name: string) => {
  const w = name.replace(/[.’']/g, ' ').split(/\s+/).filter(Boolean);
  return (w.length > 1 ? w[0][0] + w[w.length - 1][0] : (w[0] ?? '').slice(0, 2)).toUpperCase();
};

const ROLE_FALLBACK: Record<string, string> = { student: 'Élève ingénieur', engineer: 'Ingénieur', employer: 'Employeur', other: 'Autre rôle' };

function readProfile(email: string): { info?: { name?: string; role?: string } } {
  try { return JSON.parse(localStorage.getItem(`ec-profile:${email}`) ?? '{}') ?? {}; } catch { return {}; }
}

/** tous les comptes inscrits qui ont un nom (le profil de chacun est lu dans SON espace de stockage) */
export function readUsers(): RemoteUser[] {
  const accounts = readJson<{ email: string; role: string }[]>('ec-accounts', []);
  return accounts.flatMap((a) => {
    const profile = readProfile(a.email);
    const name = profile.info?.name?.trim();
    if (!name) return [];
    return [{ email: a.email, name, initials: initialsOf(name), role: profile.info?.role || ROLE_FALLBACK[a.role] || 'Membre' }];
  });
}

export function readPosts(): RemotePost[] { return readJson<RemotePost[]>(POSTS_KEY, []); }

export function addPost(post: RemotePost): RemotePost[] {
  const next = [post, ...readPosts().filter((p) => !(p.id === post.id && p.author.email === post.author.email))].slice(0, MAX_POSTS);
  writeJson(POSTS_KEY, next);
  return next;
}

/** dépose un événement dans la boîte du destinataire */
export function deliver(to: string, event: RemoteEvent): void {
  writeJson(mailboxKey(to), [...readJson<RemoteEvent[]>(mailboxKey(to), []), event]);
}

/** lit les événements de ce compte puis vide sa boîte : chaque événement n'est traité qu'une fois */
export function takeMailbox(email: string): RemoteEvent[] {
  const events = readJson<RemoteEvent[]>(mailboxKey(email), []);
  if (events.length) { try { localStorage.removeItem(mailboxKey(email)); } catch { /* stockage indisponible */ } }
  return events;
}

/** suppression d'un compte : ses publications disparaissent de la liste commune (sa boîte est effacée avec ses autres clés) */
export function purgeRemote(email: string): void {
  writeJson(POSTS_KEY, readPosts().filter((p) => p.author.email !== email));
}

