import { Component, inject, input } from '@angular/core';
import { ShareItem } from '../core/messages.service';
import { ReactionsService, plural } from '../core/reactions.service';
import { SavedService } from '../core/saved.service';
import { ToastService } from '../core/toast.service';
import { Icon } from './icon';
import { PostComments } from './post-comments';
import { ShareMenu } from './share-menu';

/**
 * Compteurs + boutons « J’aime » / « Commenter » + commentaires d'une publication
 * (1er clic = j'aime, 2e clic = je retire). Avec `item`, la barre propose aussi
 * « Partager » et « Enregistrer » : le même comportement pour toutes les publications (fil, mon profil, pages).
 */
@Component({
  selector: 'app-post-actions',
  imports: [Icon, PostComments, ShareMenu],
  templateUrl: './post-actions.html',
  styleUrl: './post-actions.css',
  host: { '[class.feed]': "variant() === 'feed'" },
})
export class PostActions {
  protected readonly rx = inject(ReactionsService);
  protected readonly plural = plural;
  private readonly saved = inject(SavedService);
  private readonly toast = inject(ToastService);

  /** identifiant de la publication */
  readonly postId = input.required<string>();
  /** réactions déjà reçues au départ */
  readonly baseLikes = input(0);
  /** commentaires d'exemple affichés au départ */
  readonly seed = input(0);
  /** la publication elle-même : active « Partager » et « Enregistrer » */
  readonly item = input<ShareItem | null>(null);
  /** « feed » : présentation du fil (compteurs au-dessus d'un trait) ; « card » : pages entreprise */
  readonly variant = input<'card' | 'feed'>('card');

  protected isSaved(): boolean {
    const it = this.item();
    return !!it && this.saved.has(it.id);
  }

  protected toggleSave(): void {
    const it = this.item();
    if (!it) return;
    const now = this.saved.toggle({ id: it.id, kind: 'post', title: it.title, sub: it.sub ?? '', link: it.link, query: it.query });
    this.toast.show(now ? { text: 'Publication enregistrée', link: '/enregistres', label: 'Voir' } : { text: 'Retirée des enregistrés' });
  }
}
