import { Injectable, computed, inject } from '@angular/core';
import { AuthService } from './auth.service';

export type UserRole = 'student' | 'engineer' | 'employer' | 'other';

/** nom du rôle (paramètres, vérification) */
export const ROLE_LABEL: Record<UserRole, string> = { student: 'Élève ingénieur', engineer: 'Ingénieur', employer: 'Employeur', other: 'Autre rôle' };
/** badge affiché sous le nom (menu du compte, fil, profil) : il suit le rôle vérifié du compte */
export const ROLE_BADGE: Record<UserRole, string> = { student: 'Étudiant vérifié', engineer: 'Ingénieur vérifié', employer: 'Employeur vérifié', other: 'Membre vérifié' };

/**
 * Rôle du compte connecté : il vient de la session (AuthService), choisi et vérifié à l'inscription.
 * Sans session, le rôle par défaut n'ouvre aucune option employeur.
 * TODO : à terme, le rôle vérifié vient de l'API. Les options réservées aux employeurs
 * (ex. « Créer une page entreprise ») s'affichent seulement si isEmployer() est vrai.
 */
@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly auth = inject(AuthService);

  readonly role = computed<UserRole>(() => this.auth.session()?.role ?? 'student');
  readonly isEmployer = computed(() => this.role() === 'employer');
  readonly roleLabel = computed(() => ROLE_LABEL[this.role()]);
  readonly badge = computed(() => ROLE_BADGE[this.role()]);
}
