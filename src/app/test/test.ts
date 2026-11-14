import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NotificationsService } from '../core/notifications.service';
import { PASS_SCORE, PostsService } from '../core/posts.service';
import { buildQuiz, topicLabel } from '../core/test-bank';
import { VerificationResultService } from '../core/verification-result.service';
import { Icon } from '../shared/icon';
import { RippleDirective } from '../shared/ripple.directive';

/**
 * Test de connaissance, demandé uniquement quand on partage un projet ou un certificat.
 * Les questions portent sur le sujet choisi dans « Créer une publication » ; la publication n'est visible
 * (fil + profil) que si le score atteint PASS_SCORE.
 */
@Component({
  selector: 'app-test',
  imports: [Icon, RippleDirective, RouterLink],
  templateUrl: './test.html',
  styleUrls: ['../account/account-shared.css', './test.css'],
})
export class Test {
  private readonly router = inject(Router);
  private readonly posts = inject(PostsService);
  private readonly notifs = inject(NotificationsService);
  private readonly result = inject(VerificationResultService);

  private readonly staged = this.posts.staged();
  protected readonly type = this.staged?.type ?? 'Projet';
  protected readonly topic = topicLabel(this.staged?.topic ?? '');
  protected readonly questions = buildQuiz(this.staged?.topic ?? '');
  protected readonly pass = PASS_SCORE;

  protected readonly index = signal(0);
  protected readonly picked = signal<(number | null)[]>(this.questions.map(() => null));
  protected readonly current = computed(() => this.questions[this.index()]);
  protected readonly isLast = computed(() => this.index() === this.questions.length - 1);

  constructor() {
    // pas de publication en attente (page ouverte directement) : retour à la création
    if (!this.staged) void this.router.navigateByUrl('/publier', { replaceUrl: true });
  }

  protected choose(i: number): void {
    this.picked.update((p) => p.map((v, k) => (k === this.index() ? i : v)));
  }

  protected next(): void {
    if (this.picked()[this.index()] === null) return;
    if (!this.isLast()) { this.index.update((n) => n + 1); return; }
    const good = this.questions.filter((q, k) => this.picked()[k] === q.answer).length;
    const score = Math.round((good / this.questions.length) * 100);
    // score suffisant : la publication devient visible (fil + profil) et je reçois une notification ; sinon rien n'est publié
    const postId = this.posts.completeTest(score);
    if (postId) {
      this.notifs.push({
        icon: 'check', cat: 'verif',
        text: `Votre ${this.type.toLowerCase()} est publié · test réussi ${score} %`,
        link: '/fil', query: { post: postId },
      });
    }
    // le résultat est transmis en mémoire (pas par l'adresse) : il ne peut pas être écrit à la main
    this.result.set({ from: 'publish', s: postId ? 'accepted' : 'refused', score, type: this.type });
    void this.router.navigateByUrl('/verification');
  }

  protected back(): void { if (this.index() > 0) this.index.update((n) => n - 1); }
}
