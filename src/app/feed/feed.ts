import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FeedService, FeedPost } from '../core/feed.service';
import { ShareItem } from '../core/messages.service';
import { ProfileService } from '../core/profile.service';
import { MyPost, PostsService, ago } from '../core/posts.service';
import { MyPageService } from '../core/my-page.service';
import { UserService } from '../core/user.service';
import { AssistantService } from '../core/assistant.service';
import { slugify } from '../shared/slug';
import { Icon, IconName } from '../shared/icon';
import { PostActions } from '../shared/post-actions';

@Component({
  selector: 'app-feed',
  imports: [Icon, RouterLink, PostActions],
  templateUrl: './feed.html',
  styleUrls: ['../account/account-shared.css', './feed.css'],
})
export class Feed {
  protected readonly assistant = inject(AssistantService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly profile = inject(ProfileService);
  /** mes publications (publiques) : affichées en haut du fil */
  protected readonly posts = inject(PostsService);
  protected readonly ago = ago;
  /** publications des autres membres et des pages (données d'exemple) */
  protected readonly feed = inject(FeedService);
  protected readonly user = inject(UserService);
  protected readonly mine = inject(MyPageService);

  /** publication mise en avant (ouverte depuis une notification) */
  protected readonly focus = signal<string | null>(null);

  constructor() {
    // /fil?post=<id> : la publication concernée est affichée et mise en évidence
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((q) => {
      const id = q.get('post');
      if (!id) return;
      this.focus.set(id);
      setTimeout(() => document.getElementById(`feed-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 200);
    });
  }

  // ----- suivre un profil suggéré (un clic suit, le 2e clic ne suit plus) -----
  protected readonly followed = signal<string[]>([]);
  protected toggleFollow(name: string): void {
    this.followed.update((l) => (l.includes(name) ? l.filter((n) => n !== name) : [...l, name]));
  }

  /** de quoi enregistrer / partager une publication du fil */
  protected itemOf(p: FeedPost): ShareItem {
    const name = p.author.mine ? this.profile.info().name : p.author.name;
    return { id: p.id, kind: 'post', title: p.title, sub: name, link: '/fil', query: { post: p.id } };
  }

  /** … et l'une de MES publications (texte, partage, expérience, solution) */
  protected myItemOf(p: MyPost): ShareItem {
    const title = p.title ?? (p.text.length > 70 ? `${p.text.slice(0, 67)}…` : p.text);
    return { id: p.id, kind: 'post', title, sub: this.profile.info().name, link: '/fil', query: { post: p.id } };
  }

  /** ouvre la page « Créer une publication » */
  protected newPost(): void { void this.router.navigateByUrl('/publier'); }

  protected readonly menu: { icon: IconName; label: string; link?: string }[] = [
    { icon: 'user', label: 'Voir mon profil', link: '/profil' },
    { icon: 'target', label: 'Mes défis', link: '/defis' },
    { icon: 'users', label: 'Mon réseau', link: '/reseau' },
    { icon: 'bookmark', label: 'Enregistrés', link: '/enregistres' },
  ];
  protected readonly account: { icon: IconName; label: string; link?: string }[] = [
    { icon: 'chart', label: 'Tableau de bord d’activité', link: '/tableau-de-bord' },
  ];
  protected readonly slug = slugify;
  /** profils suggérés (vide tant que l'API ne les fournit pas) */
  protected readonly follow: { ini: string; name: string; role: string }[] = [];
}
