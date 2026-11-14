import { Component, DestroyRef, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AssistantService } from '../core/assistant.service';
import { ROLE_LABEL, UserService } from '../core/user.service';
import { VerificationResultService } from '../core/verification-result.service';
import { Icon, IconName } from '../shared/icon';
import { RippleDirective } from '../shared/ripple.directive';

interface View {
  icon: IconName;
  title: string;
  pill: string;
  text: string;
  primary: { label: string; link: string };
  secondary: { label: string; link: string };
}

/**
 * Résultat de la vérification, dans les deux cas :
 *  - inscription  : preuve de rôle (acceptée / refusée / en attente)
 *  - publication  : test de connaissance d'un projet ou d'un certificat (réussi / refusé)
 *  - page         : vérification du justificatif d'entreprise lors de la création d'une page
 */
@Component({
  selector: 'app-verification',
  imports: [Icon, RippleDirective, RouterLink],
  templateUrl: './verification.html',
  styleUrls: ['../account/account-shared.css', './verification.css'],
})
export class Verification {
  private readonly result = inject(VerificationResultService);
  private readonly router = inject(Router);
  private readonly user = inject(UserService);
  private readonly assistant = inject(AssistantService);

  /** résultat transmis en mémoire par la page qui vient de faire la vérification (jamais par l'adresse) */
  private readonly params = computed(() => {
    const r = this.result.current();
    return { s: r?.s ?? 'pending', from: r?.from ?? 'signup', score: r?.score ?? 0, type: r?.type ?? 'Projet' };
  });

  constructor() {
    // pas d'assistant d'aide sur cette page
    this.assistant.hidden.set(true);
    const destroyRef = inject(DestroyRef);
    destroyRef.onDestroy(() => this.assistant.hidden.set(false));

    // aucun résultat (adresse ouverte à la main, page rechargée) : rien à afficher, retour au fil
    if (!this.result.current()) {
      void this.router.navigateByUrl('/fil', { replaceUrl: true });
      return;
    }
    // le résultat n'est affiché qu'une fois : revenir en arrière ne le rouvre pas
    destroyRef.onDestroy(() => this.result.clear());

    // inscription : accepté → on ouvre l'accueil du compte ; refusé → retour à la page d'accueil du site
    const { from, s } = this.params();
    if (from === 'signup' && s !== 'pending') {
      const timer = setTimeout(() => void this.router.navigateByUrl(s === 'accepted' ? '/fil' : '/'), s === 'accepted' ? 1800 : 3000);
      destroyRef.onDestroy(() => clearTimeout(timer));
    }
    // résultat de création de page : réservé aux employeurs
    if (from === 'page' && !this.user.isEmployer()) void this.router.navigateByUrl('/fil', { replaceUrl: true });
    // création de page vérifiée : on ouvre la page de l'entreprise
    if (from === 'page' && s === 'accepted') {
      const timer = setTimeout(() => void this.router.navigateByUrl('/ma-page'), 1800);
      destroyRef.onDestroy(() => clearTimeout(timer));
    }
  }

  protected readonly state = computed(() => this.params().s);
  protected readonly origin = computed(() => this.params().from);

  protected readonly view = computed<View>(() => {
    const { s, from, score, type } = this.params();
    const role = ROLE_LABEL[this.user.role()];

    if (from === 'publish') {
      const what = type.toLowerCase();
      if (s === 'accepted') return {
        icon: 'check', title: 'Test réussi', pill: `Score : ${score} %`,
        text: `Bravo ! Votre ${what} est validé et sera visible sur votre profil et dans le fil.`,
        primary: { label: 'Accéder à mon fil', link: '/fil' }, secondary: { label: 'Voir mon profil', link: '/profil' },
      };
      return {
        icon: 'x', title: 'Test non validé', pill: `Score : ${score} % · minimum 90 %`,
        text: `Votre ${what} n’est pas publié. Relisez votre contenu puis repassez le test quand vous le souhaitez.`,
        primary: { label: 'Repasser le test', link: '/test' }, secondary: { label: 'Modifier ma publication', link: '/publier' },
      };
    }

    if (from === 'page') {
      if (s === 'accepted') return {
        icon: 'check', title: 'Page créée avec succès', pill: 'Page vérifiée',
        text: 'Votre justificatif a été validé. Votre page est vérifiée : ouverture de votre page…',
        primary: { label: '', link: '' }, secondary: { label: '', link: '' },
      };
      if (s === 'refused') return {
        icon: 'x', title: 'Vérification refusée', pill: 'Document non reconnu',
        text: 'Le document envoyé ne correspond pas à un justificatif d’entreprise. Votre page n’a pas été créée.',
        primary: { label: 'Réessayer', link: '/creer-page' }, secondary: { label: 'Retour à l’accueil', link: '/fil' },
      };
      return {
        icon: 'clock', title: 'Page créée', pill: 'Vérification en attente · 14 jours',
        text: 'Envoyez vos documents officiels depuis votre page dans les 14 jours pour la faire vérifier.',
        primary: { label: 'Ouvrir ma page', link: '/ma-page' }, secondary: { label: 'Retour à l’accueil', link: '/fil' },
      };
    }

    // inscription : le test est instantané, aucune action à proposer (redirection automatique)
    if (s === 'accepted') return {
      icon: 'check', title: 'Compte créé avec succès', pill: `Rôle : ${role}`,
      text: 'Votre document a été validé. Votre profil affiche le badge vérifié : ouverture de votre accueil…',
      primary: { label: '', link: '' }, secondary: { label: '', link: '' },
    };
    if (s === 'refused') return {
      icon: 'x', title: 'Vérification refusée', pill: 'Document non reconnu',
      text: 'Le document envoyé ne correspond pas au rôle choisi. Retour à la page d’accueil…',
      primary: { label: '', link: '' }, secondary: { label: '', link: '' },
    };
    return {
      icon: 'clock', title: 'Vérification en attente', pill: 'Délai estimé : 24 à 48 h',
      text: 'Notre équipe examine votre preuve. Vous serez notifié dès que la décision sera prise.',
      primary: { label: 'Retour à l’accueil', link: '/fil' }, secondary: { label: '', link: '' },
    };
  });

}
