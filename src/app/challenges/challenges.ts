import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Challenge, ChallengesService } from '../core/challenges.service';
import { ago } from '../core/posts.service';
import { Icon } from '../shared/icon';
import { ShareMenu } from '../shared/share-menu';
import { RippleDirective } from '../shared/ripple.directive';

const DOMAINS = ['Tous', 'Énergie', 'Télécoms', 'Santé'] as const;
type Filter = (typeof DOMAINS)[number];

@Component({
  selector: 'app-challenges',
  imports: [Icon, RippleDirective, RouterLink, ShareMenu],
  templateUrl: './challenges.html',
  styleUrls: ['../account/account-shared.css', './challenges.css'],
})
export class Challenges {
  protected readonly svc = inject(ChallengesService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly domains = DOMAINS;
  protected readonly ago = ago;

  protected readonly items = this.svc.all;

  protected readonly filter = signal<Filter>('Tous');
  protected readonly selectedId = signal(1);
  /** solution mise en avant (ouverte depuis la notification « a résolu votre défi ») */
  protected readonly focusId = signal<number | null>(null);

  protected readonly list = computed(() =>
    this.filter() === 'Tous' ? this.items() : this.items().filter((c) => c.domain === this.filter()),
  );
  protected readonly selected = computed(() => this.items().find((c) => c.id === this.selectedId()) ?? this.items()[0]);

  constructor() {
    // /defis?solution=<id> : on affiche le défi concerné et sa solution reçue
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((q) => {
      const sol = this.svc.findReceived(Number(q.get('solution')) || null);
      if (!sol) return;
      this.filter.set('Tous');
      this.selectedId.set(sol.challengeId);
      this.focusId.set(sol.id);
      setTimeout(() => document.getElementById(`sol-${sol.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150);
    });
  }

  protected setFilter(d: Filter): void {
    this.filter.set(d);
    const first = this.list()[0];
    if (first && !this.list().some((c) => c.id === this.selectedId())) this.selectedId.set(first.id);
  }

  /** « Entreprise · Entreprise A », « Membre · Amine Mansour » ou « Votre défi » */
  protected by(c: Challenge): string {
    return c.mine ? 'Votre défi' : `${c.author.kind === 'company' ? 'Entreprise' : 'Membre'} · ${c.author.name}`;
  }

  /** a déjà proposé une solution à ce défi */
  protected isProposed(id: number): boolean {
    return this.svc.isProposed(id);
  }

  /** nombre de solutions proposées à ce défi */
  protected count(c: Challenge): number { return this.svc.count(c); }
  /** solutions reçues sur l'un de mes défis */
  protected received(id: number) { return this.svc.receivedOf(id); }

  /** « Proposer une solution » : ouvre la page où l'on écrit la solution et importe son dossier */
  protected propose(id: number): void {
    if (this.isProposed(id)) return;
    void this.router.navigate(['/defis', id, 'solution']);
  }

  /** « Voir le projet » : ouvre la description du projet et les documents d'aide */
  protected view(id: number): void {
    void this.router.navigate(['/defis', id]);
  }
}
