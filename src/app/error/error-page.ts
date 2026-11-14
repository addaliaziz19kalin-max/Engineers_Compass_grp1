import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AssistantService } from '../core/assistant.service';
import { AuthShell } from '../auth/auth-shell';
import { Icon, IconName } from '../shared/icon';
import { RippleDirective } from '../shared/ripple.directive';

interface Action { label: string; icon?: IconName; run: 'home' | 'search' | 'back' | 'reload' | 'login' }
interface Info {
  icon: IconName;
  code: string;
  title: string;
  text: string;
  origin: 'client' | 'server';
  actions: Action[];
}

const HOME: Action = { label: 'Retour à l’accueil', icon: 'home', run: 'home' };

/** Informations affichées pour chaque type d'erreur (côté client ou côté serveur). */
const ERRORS: Record<string, Info> = {
  '404': { icon: 'compass', code: '404', origin: 'client', title: 'Vous avez perdu le cap', text: 'La page que vous cherchez n’existe pas ou a été déplacée. Revenez à l’accueil ou lancez une recherche.', actions: [HOME, { label: 'Rechercher', icon: 'search', run: 'search' }] },
  '400': { icon: 'alert', code: '400', origin: 'client', title: 'Requête invalide', text: 'Le lien ou les informations envoyées sont incorrects. Revenez en arrière et réessayez.', actions: [{ label: 'Retour', icon: 'chev-right', run: 'back' }, HOME] },
  '401': { icon: 'lock', code: '401', origin: 'client', title: 'Session expirée', text: 'Votre session a pris fin. Reconnectez-vous pour continuer.', actions: [{ label: 'Se connecter', icon: 'user', run: 'login' }, HOME] },
  '403': { icon: 'lock', code: '403', origin: 'client', title: 'Accès refusé', text: 'Vous n’avez pas l’autorisation d’ouvrir cette page. Vérifiez votre rôle ou connectez-vous avec un autre compte.', actions: [HOME, { label: 'Se connecter', icon: 'user', run: 'login' }] },
  '500': { icon: 'server', code: '500', origin: 'server', title: 'Un problème de notre côté', text: 'Le serveur a rencontré une erreur. Ce n’est pas votre faute : réessayez dans quelques instants.', actions: [{ label: 'Réessayer', icon: 'refresh', run: 'reload' }, HOME] },
  '502': { icon: 'server', code: '502', origin: 'server', title: 'Passerelle indisponible', text: 'Le serveur ne répond pas correctement pour le moment. Réessayez dans quelques instants.', actions: [{ label: 'Réessayer', icon: 'refresh', run: 'reload' }, HOME] },
  '503': { icon: 'server', code: '503', origin: 'server', title: 'Service temporairement indisponible', text: 'Maintenance en cours ou forte affluence. Réessayez dans quelques minutes.', actions: [{ label: 'Réessayer', icon: 'refresh', run: 'reload' }, HOME] },
  '504': { icon: 'clock', code: '504', origin: 'server', title: 'Le serveur met trop de temps', text: 'La réponse a pris trop de temps. Réessayez dans quelques instants.', actions: [{ label: 'Réessayer', icon: 'refresh', run: 'reload' }, HOME] },
  offline: { icon: 'wifi-off', code: 'Hors ligne', origin: 'client', title: 'Vous êtes hors connexion', text: 'Vérifiez votre connexion Internet puis réessayez. Vos brouillons restent sur cet appareil.', actions: [{ label: 'Réessayer', icon: 'refresh', run: 'reload' }, HOME] },
  client: { icon: 'alert', code: 'Oups', origin: 'client', title: 'Quelque chose s’est mal passé', text: 'Une erreur inattendue est survenue dans l’application. Rechargez la page ; si le problème continue, signalez-le à l’équipe.', actions: [{ label: 'Recharger la page', icon: 'refresh', run: 'reload' }, HOME] },
};

/** Page d'erreur : 404 et autres erreurs (côté client : 400/401/403/hors ligne/erreur d'application ; côté serveur : 500/502/503/504). */
@Component({
  selector: 'app-error-page',
  imports: [AuthShell, Icon, RippleDirective, RouterLink],
  templateUrl: './error-page.html',
  styleUrls: ['../account/account-shared.css', './error-page.css'],
})
export class ErrorPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly assistant = inject(AssistantService);

  /** code pris dans l'URL (/erreur/500) ou dans les données de la route (** → 404) */
  protected readonly info = computed<Info>(() => {
    const code = this.route.snapshot.paramMap.get('code') ?? (this.route.snapshot.data['code'] as string | undefined) ?? '404';
    return ERRORS[code] ?? ERRORS['client'];
  });

  protected run(a: Action): void {
    switch (a.run) {
      case 'home': void this.router.navigateByUrl('/fil'); break;
      case 'search': void this.router.navigateByUrl('/recherche'); break;
      case 'login': void this.router.navigateByUrl('/connexion'); break;
      case 'back': history.length > 1 ? history.back() : void this.router.navigateByUrl('/fil'); break;
      case 'reload': location.reload(); break;
    }
  }
}
