import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { DirectoryService } from '../core/directory.service';
import { ShareItem } from '../core/messages.service';
import { NetworkService } from '../core/network.service';
import { Icon } from '../shared/icon';
import { PostActions } from '../shared/post-actions';
import { RippleDirective } from '../shared/ripple.directive';

type Tab = 'home' | 'about' | 'offers' | 'challenges' | 'posts';

/** Page entreprise vue par un visiteur (ouverte en cliquant sur une page). */
@Component({
  selector: 'app-company',
  imports: [Icon, RippleDirective, RouterLink, PostActions],
  templateUrl: './company.html',
  styleUrls: ['../account/account-shared.css', './company.css'],
})
export class Company {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dir = inject(DirectoryService);
  protected readonly net = inject(NetworkService);

  private readonly slug = toSignal(this.route.paramMap.pipe(map((p) => p.get('slug'))), { requireSync: true });
  protected readonly c = computed(() => this.dir.company(this.slug()));
  protected readonly tab = signal<Tab>('home');

  /** de quoi enregistrer / partager une publication de la page (même comportement que dans le fil) */
  protected postItem(name: string, slug: string, text: string, i: number): ShareItem {
    return { id: `company-${slug}-${i}`, kind: 'post', title: text.length > 70 ? `${text.slice(0, 67)}…` : text, sub: name, link: `/page/${slug}` };
  }

  constructor() {
    // page inconnue : 404
    if (!this.dir.company(this.slug())) void this.router.navigate(['/erreur', '404'], { skipLocationChange: true });
  }

  protected readonly tabs = computed<{ id: Tab; label: string }[]>(() => {
    const c = this.c();
    return [
      { id: 'home', label: 'Accueil' },
      { id: 'about', label: 'À propos' },
      { id: 'offers', label: `Offres (${c?.offers.length ?? 0})` },
      { id: 'challenges', label: `Défis (${c?.challenges ?? 0})` },
      { id: 'posts', label: 'Publications' },
    ];
  });

  protected following(): boolean { return this.net.isFollowing(this.c()!.name); }
  protected toggleFollow(): void {
    const c = this.c()!;
    if (this.following()) this.net.unfollowByName(c.name);
    else this.net.follow({ initials: c.initials, name: c.name, sector: c.line.split(' · ').slice(0, 2).join(' · '), followers: `${c.followers} abonnés` });
  }
}
