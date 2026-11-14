import { Component, HostListener, computed, inject, input, signal } from '@angular/core';
import { MessagesService, ShareItem, ShareTarget } from '../core/messages.service';
import { PostsService } from '../core/posts.service';
import { ToastService } from '../core/toast.service';
import { Icon } from './icon';

/** menu ouvert (un seul à la fois dans la page) */
let openMenu: { close(): void } | null = null;

/**
 * Bouton « Partager » d'une publication ou d'un défi :
 *  - Partager maintenant (publications) : republie sur mon fil ;
 *  - Envoyer dans un message / dans un groupe : le message arrive vraiment dans la conversation (page Messages) ;
 *  - Copier le lien.
 */
@Component({
  selector: 'app-share-menu',
  imports: [Icon],
  templateUrl: './share-menu.html',
  styleUrl: './share-menu.css',
  // la page parente peut faire passer l'élément qui contient un menu ouvert au-dessus de ses voisins
  host: { '[class.open]': 'open()' },
})
export class ShareMenu {
  private readonly messages = inject(MessagesService);
  private readonly posts = inject(PostsService);
  private readonly toast = inject(ToastService);

  readonly item = input.required<ShareItem>();
  /** propose « Partager maintenant » (republier sur mon fil) */
  readonly repost = input(false);
  /** « act » : bouton avec texte dans la barre d'actions d'une publication ; « icon » : icône seule (défis) */
  readonly variant = input<'act' | 'icon'>('act');
  /** « end » : le menu s'aligne sur le bord droit du bouton */
  readonly align = input<'center' | 'end'>('center');

  protected readonly open = signal(false);
  protected readonly mode = signal<'menu' | 'send'>('menu');
  protected readonly sentTo = signal<string[]>([]);

  protected readonly groups = computed(() => this.messages.targets().filter((t) => t.group));
  protected readonly contacts = computed(() => this.messages.targets().filter((t) => !t.group));
  protected readonly sendLabel = computed(() => (this.item().kind === 'challenge' ? 'Envoyer dans un groupe' : 'Envoyer dans un message'));

  protected toggle(event: Event): void {
    event.stopPropagation();
    if (openMenu && openMenu !== this) openMenu.close();
    this.mode.set('menu');
    this.open.update((v) => !v);
    openMenu = this.open() ? this : null;
  }

  @HostListener('document:click')
  @HostListener('document:keydown.escape')
  close(): void {
    this.open.set(false);
    if (openMenu === this) openMenu = null;
  }

  /** republier sur mon fil (publications) */
  protected shareNow(): void {
    this.close();
    const it = this.item();
    // TODO : appeler l'API (repartager sur mon fil)
    this.posts.publish({ kind: 'shared', label: 'a partagé une publication', text: '', title: it.title, sub: 'Publication · Public', link: it.link, query: it.query });
    this.toast.show({ text: 'Publication partagée sur votre fil', link: '/profil', label: 'Voir' });
  }

  protected sendTo(t: ShareTarget): void {
    if (this.sentTo().includes(t.key)) return;
    const it = this.item();
    const id = this.messages.share(t, it.kind === 'challenge' ? 'Défi partagé' : 'Publication partagée', it);
    if (id === null) return;
    this.sentTo.update((l) => [...l, t.key]);
    this.toast.show({ text: `Envoyé à ${t.name}`, link: '/messages', query: { c: String(id) }, label: 'Voir' });
  }

  protected copyLink(): void {
    this.close();
    const it = this.item();
    const q = it.query ? `?${new URLSearchParams(it.query).toString()}` : '';
    try { void navigator.clipboard?.writeText(location.origin + it.link + q); } catch { /* presse-papiers indisponible */ }
    this.toast.show({ text: 'Lien copié' });
  }
}
