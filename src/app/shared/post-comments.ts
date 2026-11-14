import { Component, ElementRef, HostListener, effect, inject, input, signal, viewChild } from '@angular/core';
import { ProfileService } from '../core/profile.service';
import { ReactionsService } from '../core/reactions.service';
import { Icon } from './icon';
import { RippleDirective } from './ripple.directive';

/** Zone de commentaires d'une publication : liste + champ pour commenter. S'ouvre avec le bouton « Commenter ». */
@Component({
  selector: 'app-post-comments',
  imports: [Icon, RippleDirective],
  templateUrl: './post-comments.html',
  styleUrl: './post-comments.css',
})
export class PostComments {
  protected readonly rx = inject(ReactionsService);
  /** photo de profil : affichée à la place des initiales (écrire un commentaire + mes commentaires) */
  protected readonly profile = inject(ProfileService);

  /** identifiant de la publication */
  readonly postId = input.required<string>();
  /** nombre de commentaires d'exemple affichés au départ */
  readonly seed = input(0);

  protected readonly draft = signal('');
  private readonly box = viewChild<ElementRef<HTMLInputElement>>('box');

  constructor() {
    // à l'ouverture, le curseur est placé dans le champ
    effect(() => {
      if (this.rx.isOpen(this.postId())) setTimeout(() => this.box()?.nativeElement.focus(), 50);
    });
  }

  /** ouvre / ferme le menu « … » d'un de MES commentaires */
  protected toggleMenu(event: Event, commentId: number): void {
    event.stopPropagation();
    this.rx.toggleMenu(commentId);
  }

  /** clic en dehors ou Échap : ferme le menu */
  @HostListener('document:click')
  @HostListener('document:keydown.escape')
  protected closeMenu(): void { this.rx.closeMenu(); }

  protected send(): void {
    this.rx.add(this.postId(), this.draft());
    this.draft.set('');
  }
}
