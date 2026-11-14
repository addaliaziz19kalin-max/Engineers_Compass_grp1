let email = '';

/** appelé par AuthService à chaque changement de session (Supabase) */
export function setCurrentEmail(value: string): void { email = value; }

/** e-mail du compte connecté (fourni par AuthService, d'après la session Supabase) ; vide s'il n'y a pas de session */
export function currentEmail(): string { return email; }

/**
 * Clé de stockage propre au compte connecté : chaque compte a ses publications, messages, réglages…
 * Un compte neuf part donc toujours vide, et deux comptes sur le même navigateur ne se mélangent pas.
 * TODO : disparaît avec l'API (les données seront rattachées au compte côté serveur).
 */
export function userKey(base: string): string {
  return `${base}:${currentEmail() || 'anonyme'}`;
}

/** vrai si la clé de stockage appartient à ce compte */
export function isUserKey(key: string, email: string): boolean {
  return !!email && key.startsWith('ec-') && key.endsWith(`:${email}`);
}

/** relit une valeur gardée pour CE compte ; `fallback` si rien n'est enregistré ou si la valeur est illisible */
export function loadJson<T>(base: string, fallback: T): T {
  try {
    const saved = JSON.parse(localStorage.getItem(userKey(base)) ?? 'null');
    if (saved !== null && typeof saved === typeof fallback && Array.isArray(saved) === Array.isArray(fallback)) return saved as T;
  } catch { /* stockage indisponible ou illisible */ }
  return fallback;
}

/** garde une valeur pour CE compte */
export function saveJson(base: string, value: unknown): void {
  try { localStorage.setItem(userKey(base), JSON.stringify(value)); } catch { /* stockage indisponible */ }
}
