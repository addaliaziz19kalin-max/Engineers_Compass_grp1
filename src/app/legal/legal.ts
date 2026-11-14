import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { Icon } from '../shared/icon';

interface Section { title: string; text: string; list?: string[]; text2?: string }
interface Doc { title: string; updated: string; sections: Section[] }

const DOCS: Record<string, Doc> = {
  conditions: {
    title: 'Conditions d’utilisation',
    updated: '1er novembre 2026',
    sections: [
      { title: 'Objet', text: 'Engineers Compass est un réseau professionnel gratuit et open source destiné aux élèves ingénieurs, aux ingénieurs et aux ingénieurs entrepreneurs. Les présentes conditions encadrent l’utilisation de la plateforme.' },
      { title: 'Compte et vérification', text: 'Chaque membre dispose d’un rôle justifié par une preuve. Les informations fournies doivent être exactes.', list: ['Étudiant : carte d’étudiant en cours de validité', 'Professionnel : diplôme ou contrat de travail', 'Un seul compte par personne'] },
      { title: 'Publications et compétences', text: 'Les projets et certificats partagés font l’objet d’un test de vérification par IA. Une moyenne minimale de 90 % est requise pour publier.' },
      { title: 'Pages et avertissements', text: 'Une page non vérifiée dans le délai imparti reçoit un avertissement. Après trois avertissements, la page est bloquée puis supprimée définitivement.' },
      { title: 'Contenus interdits', text: 'Sont interdits le spam, les faux profils, les offres fictives et tout contenu illégal ou trompeur.' },
      { title: 'Responsabilité', text: 'Engineers Compass met tout en œuvre pour assurer un service fiable, sans garantir une disponibilité continue. Chaque membre reste responsable des contenus qu’il publie.' },
      { title: 'Contact', text: 'Pour toute question sur ces conditions, utilisez la page Contact ou le chatbot d’assistance.' },
    ],
  },
  confidentialite: {
    title: 'Politique de confidentialité',
    updated: '1er novembre 2026',
    sections: [
      { title: 'Données collectées', text: 'Nous collectons uniquement les données nécessaires au fonctionnement de la plateforme.', list: ['Informations de compte : nom, e-mail, pays, langue', 'Preuves de rôle : carte d’étudiant, diplôme ou contrat', 'Contenus publiés : projets, certificats, publications'] },
      { title: 'Utilisation des données', text: 'Vos données servent à vérifier votre rôle, sécuriser la communauté et personnaliser les recommandations d’offres et de défis.' },
      { title: 'Sécurité des documents sensibles', text: 'Les preuves de rôle sont stockées de façon sécurisée et ne sont jamais visibles par les autres membres.' },
      { title: 'Vos droits', text: 'Vous pouvez accéder à vos données, les corriger, les exporter ou demander la suppression de votre compte depuis les paramètres de confidentialité.' },
      { title: 'Conservation', text: 'Vos données sont conservées tant que votre compte est actif, puis supprimées selon les délais légaux.' },
      { title: 'Cookies', text: 'Nous utilisons uniquement des cookies nécessaires au fonctionnement du site, comme la session et le choix du thème.' },
      { title: 'Contact', text: 'Pour exercer vos droits ou poser une question, utilisez la page Contact.' },
    ],
  },
};

/** Pages légales : Conditions d'utilisation et Politique de confidentialité (sommaire + sections). */
@Component({
  selector: 'app-legal',
  imports: [Icon],
  templateUrl: './legal.html',
  styleUrls: ['../account/account-shared.css', './legal.css'],
})
export class Legal {
  private readonly route = inject(ActivatedRoute);

  protected readonly doc = toSignal(this.route.data.pipe(map((d) => DOCS[d['doc'] as string] ?? DOCS['conditions'])), { requireSync: true });
  protected readonly active = signal(0);
  protected readonly ids = computed(() => this.doc().sections.map((_, i) => `s${i + 1}`));

  protected go(i: number): void {
    this.active.set(i);
    document.getElementById(this.ids()[i])?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /** met en évidence la section visible dans le sommaire */
  @HostListener('window:scroll')
  protected onScroll(): void {
    let current = 0;
    this.ids().forEach((id, i) => {
      const el = document.getElementById(id);
      if (el && el.getBoundingClientRect().top <= 140) current = i;
    });
    this.active.set(current);
  }
}
