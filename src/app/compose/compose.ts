import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ProfileService } from '../core/profile.service';
import { PASS_SCORE, PostsService } from '../core/posts.service';
import { ToastService } from '../core/toast.service';
import { TOPICS } from '../core/test-bank';
import { Icon } from '../shared/icon';
import { RippleDirective } from '../shared/ripple.directive';

/** Page « Créer une publication » (ouverte depuis le fil : Partager un projet, Photo, Vidéo, Certificat). */
@Component({
  selector: 'app-compose',
  imports: [Icon, RippleDirective],
  templateUrl: './compose.html',
  styleUrls: ['../account/account-shared.css', './compose.css'],
})
export class Compose {
  private readonly router = inject(Router);
  protected readonly profile = inject(ProfileService);
  private readonly posts = inject(PostsService);
  private readonly toast = inject(ToastService);

  /**
   * Le texte, le type et le sujet sont retrouvés si l'on revient du test ou du résultat de la vérification
   * (« Modifier ma publication »). Sinon, la page rouvre le brouillon enregistré avec « Enregistrer le brouillon »,
   * ou un formulaire vide s'il n'y en a pas : une publication en attente du test est abandonnée.
   */
  private readonly staged = this.fromTest() ? this.posts.staged() : (this.abandonStaged() ?? this.posts.draft());
  protected readonly text = signal(this.staged?.text ?? '');
  protected readonly types = ['Projet', 'Certificat', 'Article', 'Question'];
  protected readonly type = signal(this.staged?.type ?? 'Projet');
  protected readonly topics = TOPICS;
  protected readonly topic = signal(this.staged?.topic ?? TOPICS[0].id);
  protected readonly sent = signal(false);

  /** le test de connaissance n'est demandé que pour un projet ou un certificat */
  protected readonly needsTest = computed(() => this.type() === 'Projet' || this.type() === 'Certificat');
  protected readonly error = signal('');

  protected readonly checks = computed(() => [
    { icon: 'check' as const, title: 'Contenu conforme', sub: 'Aucun spam ni contenu interdit détecté', warn: false },
    this.needsTest()
      ? { icon: 'clock' as const, title: 'Test de connaissance requis', sub: `Score minimum : ${PASS_SCORE} % pour publier`, warn: true }
      : { icon: 'check' as const, title: 'Aucun test requis', sub: 'Réservé aux projets et certificats', warn: false },
  ]);
  protected readonly tips = [
    'Décrivez votre rôle dans le projet',
    'Choisissez le sujet : le test portera dessus',
    'Mentionnez les technologies utilisées',
  ];

  protected launch(): void {
    if (!this.text().trim()) { this.error.set('Écrivez quelque chose avant de publier.'); return; }
    this.error.set('');
    if (this.needsTest()) {
      // projet / certificat : test de connaissance sur le sujet ; le texte est publié seulement si le score est suffisant
      this.posts.stage({ type: this.type(), topic: this.topic(), text: this.text().trim() });
      void this.router.navigateByUrl('/test');
      return;
    }
    // article / question : publication directe, sans test
    this.posts.discard();
    this.posts.clearDraft();
    // TODO : envoyer la publication à l'API
    this.posts.publish({ kind: 'post', label: this.type() === 'Question' ? 'a posé une question' : 'a publié un article', text: this.text().trim() });
    this.sent.set(true);
    setTimeout(() => void this.router.navigateByUrl('/fil'), 1400);
  }
  /** vrai si la page précédente est le test de connaissance ou son résultat */
  private fromTest(): boolean {
    const from = this.router.currentNavigation()?.previousNavigation?.finalUrl?.toString() ?? '';
    return from.startsWith('/test') || from.startsWith('/verification');
  }
  private abandonStaged(): null {
    this.posts.discard();
    return null;
  }

  /** garde le texte, le type et le sujet sur cet appareil, puis retourne au fil ; « Créer une publication » les rouvre */
  protected draft(): void {
    if (!this.text().trim()) { this.error.set('Écrivez quelque chose avant d’enregistrer un brouillon.'); return; }
    this.error.set('');
    this.posts.saveDraft({ type: this.type(), topic: this.topic(), text: this.text().trim() });
    this.toast.show({ text: 'Brouillon enregistré', link: '/publier', label: 'Reprendre' });
    void this.router.navigateByUrl('/fil');
  }
}
