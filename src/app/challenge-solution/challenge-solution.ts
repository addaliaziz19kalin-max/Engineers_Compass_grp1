import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { ChallengesService } from '../core/challenges.service';
import { ProfileService } from '../core/profile.service';
import { PostsService } from '../core/posts.service';
import { Icon } from '../shared/icon';
import { RippleDirective } from '../shared/ripple.directive';

interface Picked { file: File; path: string }

/** Taille maximale du dossier de la solution. */
const MAX_TOTAL = 50 * 1024 * 1024;
/** Comme sur GitHub, on n'importe pas le dépôt Git ni les dépendances. */
const IGNORED = /(^|\/)(\.git|node_modules)\//;

/** « Proposer une solution » : texte de la solution + import du dossier du projet, puis « Publier ». */
@Component({
  selector: 'app-challenge-solution',
  imports: [Icon, RippleDirective, RouterLink],
  templateUrl: './challenge-solution.html',
  styleUrls: ['../account/account-shared.css', './challenge-solution.css'],
})
export class ChallengeSolution {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly svc = inject(ChallengesService);
  protected readonly profile = inject(ProfileService);
  private readonly posts = inject(PostsService);

  protected readonly id = toSignal(this.route.paramMap.pipe(map((p) => Number(p.get('id')))), { requireSync: true });
  protected readonly challenge = computed(() => this.svc.find(this.id()));

  protected readonly text = signal('');
  protected readonly files = signal<Picked[]>([]);
  protected readonly skipped = signal(0);
  protected readonly error = signal('');
  protected readonly sent = signal(false);

  protected readonly totalSize = computed(() => this.files().reduce((n, f) => n + f.file.size, 0));
  protected readonly tips = [
    'Expliquez votre démarche et vos choix techniques',
    'Importez tout le dossier du projet avec un README',
    'Ajoutez des mesures, captures ou résultats de test',
  ];

  constructor() {
    // défi inconnu : retour à la liste ; déjà résolu : retour à sa description
    if (!this.svc.find(this.id())) void this.router.navigateByUrl('/defis');
    else if (this.svc.find(this.id())?.mine || this.svc.isProposed(this.id())) void this.router.navigate(['/defis', this.id()]);
  }

  /** fichiers ou dossier choisis (un dossier garde son arborescence, comme sur GitHub) */
  protected onPick(event: Event): void {
    const input = event.target as HTMLInputElement;
    const picked = Array.from(input.files ?? []);
    input.value = '';
    const known = new Set(this.files().map((f) => f.path));
    const added: Picked[] = [];
    let skipped = 0;
    for (const file of picked) {
      const path = file.webkitRelativePath || file.name;
      if (IGNORED.test(path)) { skipped++; continue; }
      if (!known.has(path)) { known.add(path); added.push({ file, path }); }
    }
    const next = [...this.files(), ...added];
    if (next.reduce((n, f) => n + f.file.size, 0) > MAX_TOTAL) {
      this.error.set('Le dossier dépasse 50 Mo. Retirez les fichiers volumineux (données, vidéos, binaires).');
      return;
    }
    this.error.set('');
    this.skipped.set(skipped);
    this.files.set(next);
  }

  protected remove(path: string): void { this.files.update((l) => l.filter((f) => f.path !== path)); }
  protected clear(): void { this.files.set([]); this.skipped.set(0); }

  protected size(n: number): string {
    return n < 1024 ? `${n} o` : n < 1024 * 1024 ? `${(n / 1024).toFixed(1).replace('.', ',')} Ko` : `${(n / 1024 / 1024).toFixed(1).replace('.', ',')} Mo`;
  }

  protected publish(): void {
    if (!this.text().trim()) { this.error.set('Décrivez votre solution avant de publier.'); return; }
    this.error.set('');
    this.svc.propose(this.id(), this.text(), this.files().map((f) => ({ path: f.path, size: f.file.size })), this.profile.info().name);
    // la solution est publique : elle apparaît dans le fil, sur mon profil et sous le défi
    const c = this.challenge()!;
    this.posts.publish({ kind: 'solution', label: 'a proposé une solution', text: this.text().trim(), title: c.title, sub: `Défi · ${c.domain}`, link: `/defis/${c.id}` });
    this.sent.set(true);
    setTimeout(() => void this.router.navigateByUrl('/defis'), 1400);
  }
}
