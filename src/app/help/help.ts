import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon, IconName } from '../shared/icon';
import { RippleDirective } from '../shared/ripple.directive';

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Page « Centre d'aide ». */
@Component({
  selector: 'app-help',
  imports: [Icon, RippleDirective, RouterLink],
  templateUrl: './help.html',
  styleUrls: ['../account/account-shared.css', './help.css'],
})
export class Help {

  protected readonly cats: { icon: IconName; title: string; sub: string }[] = [
    { icon: 'user', title: 'Compte et profil', sub: 'Créer un compte, modifier son profil' },
    { icon: 'shield', title: 'Vérification', sub: 'Preuves de rôle, tests de compétence' },
    { icon: 'briefcase', title: 'Offres et candidatures', sub: 'Postuler, suivre ses candidatures' },
    { icon: 'target', title: 'Défis', sub: 'Publier un défi, proposer une solution' },
    { icon: 'file', title: 'Pages entreprise', sub: 'Créer et faire vérifier une page' },
    { icon: 'lock', title: 'Confidentialité', sub: 'Données, sécurité, paramètres' },
  ];

  // TODO : remplacer par le contenu réel du centre d'aide
  protected readonly faq = [
    { q: 'Pourquoi mon test de vérification est-il refusé ?', a: 'Le score minimum est de 90 %. Vous pouvez repasser le test après avoir relu les ressources du défi concerné.' },
    { q: 'Combien de temps dure la vérification de mon rôle ?', a: 'En général moins de 48 h ouvrées. Vous êtes notifié dès que l’équipe a examiné votre document.' },
    { q: 'Comment fonctionnent les avertissements de page ?', a: 'Après un signalement confirmé, la page reçoit un avertissement. Au bout de plusieurs avertissements, elle peut être suspendue.' },
    { q: 'Comment supprimer mon compte ?', a: 'Rendez-vous dans Paramètres du compte › Confidentialité et sécurité, puis choisissez « Supprimer mon compte ».' },
  ];

  protected readonly query = signal('');
  protected readonly open = signal<number | null>(null);

  protected readonly shownCats = computed(() => this.filter(this.cats, (c) => `${c.title} ${c.sub}`));
  protected readonly shownFaq = computed(() => this.filter(this.faq, (f) => `${f.q} ${f.a}`));

  private filter<T>(list: T[], text: (x: T) => string): T[] {
    const words = norm(this.query()).split(/\s+/).filter(Boolean);
    return list.filter((x) => words.every((w) => norm(text(x)).includes(w)));
  }

  protected toggle(i: number): void { this.open.update((o) => (o === i ? null : i)); }
}
