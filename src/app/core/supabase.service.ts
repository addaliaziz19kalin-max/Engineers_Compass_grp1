import { Injectable } from '@angular/core';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

const REMEMBER_KEY = 'ec-remember';

/** « Rester connecté » : session gardée à long terme (localStorage) ou seulement jusqu'à la fermeture de l'onglet (sessionStorage) */
export function setRemember(remember: boolean): void {
  try { localStorage.setItem(REMEMBER_KEY, remember ? '1' : '0'); } catch { /* stockage indisponible */ }
}

const remembered = (): boolean => {
  try { return localStorage.getItem(REMEMBER_KEY) !== '0'; } catch { return true; }
};

/** stockage de la session Supabase qui respecte « Rester connecté » */
const sessionStorageAdapter = {
  getItem: (k: string) => { try { return (remembered() ? localStorage : sessionStorage).getItem(k) ?? localStorage.getItem(k) ?? sessionStorage.getItem(k); } catch { return null; } },
  setItem: (k: string, v: string) => { try { (remembered() ? localStorage : sessionStorage).setItem(k, v); } catch { /* stockage indisponible */ } },
  removeItem: (k: string) => { try { localStorage.removeItem(k); sessionStorage.removeItem(k); } catch { /* stockage indisponible */ } },
};

/** Client Supabase unique, injectable partout : `inject(SupabaseService).client` */
@Injectable({ providedIn: 'root' })
export class SupabaseService {
  readonly client: SupabaseClient = createClient(environment.supabaseUrl, environment.supabaseKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storage: sessionStorageAdapter },
  });

  /** faux tant que l'URL et la clé du fichier environment.ts n'ont pas été remplies */
  readonly configured = !environment.supabaseUrl.includes('VOTRE-PROJET') && !environment.supabaseKey.startsWith('VOTRE_');
}
