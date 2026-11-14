import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ChallengesService } from '../core/challenges.service';
import { NetworkService } from '../core/network.service';
import { OffersService } from '../core/offers.service';
import { PostsService, ago } from '../core/posts.service';
import { Icon, IconName } from '../shared/icon';

/** Page « Tableau de bord d'activité » : tout part à zéro, puis suit ce que fait le compte. */
@Component({
  selector: 'app-dashboard',
  imports: [Icon, RouterLink],
  templateUrl: './dashboard.html',
  styleUrls: ['../account/account-shared.css', './dashboard.css'],
})
export class Dashboard {
  private readonly net = inject(NetworkService);
  private readonly offers = inject(OffersService);
  private readonly challenges = inject(ChallengesService);
  private readonly posts = inject(PostsService);

  // TODO : les vues du profil, leur détail par jour et le score viennent de l'API ; à zéro pour un compte neuf
  protected readonly stats = computed<{ icon: IconName; value: string; label: string }[]>(() => [
    { icon: 'eye', value: '0', label: 'Vues du profil' },
    { icon: 'users', value: String(this.net.contacts().length), label: 'Contacts' },
    { icon: 'target', value: String(this.challenges.sent().length), label: 'Solutions proposées' },
    { icon: 'send', value: String(this.offers.applied().length), label: 'Candidatures' },
  ]);
  protected readonly views = [
    { day: 'Lun', v: 0 }, { day: 'Mar', v: 0 }, { day: 'Mer', v: 0 }, { day: 'Jeu', v: 0 },
    { day: 'Ven', v: 0 }, { day: 'Sam', v: 0 }, { day: 'Dim', v: 0 },
  ];
  protected readonly score = 0;
  protected readonly todo: { icon: IconName; title: string; sub: string; link: string }[] = [
    { icon: 'file', title: 'Ajouter un projet à votre profil', sub: 'Mettez votre travail en valeur', link: '/publier' },
  ];

  /** activité récente : mes publications (projets, solutions, partages…), les plus récentes d'abord */
  protected readonly recent = computed<{ icon: IconName; title: string; sub: string }[]>(() =>
    this.posts.items().slice(0, 5).map((p) => ({
      icon: 'check',
      title: p.title ?? (p.text.length > 60 ? `${p.text.slice(0, 57)}…` : p.text),
      sub: `${p.label} · ${ago(p.at)}`,
    })),
  );
}
