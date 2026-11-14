import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { ChallengesService } from '../core/challenges.service';
import { ProfileService } from '../core/profile.service';
import { ago } from '../core/posts.service';
import { ShareItem } from '../core/messages.service';
import { Icon } from '../shared/icon';
import { ShareMenu } from '../shared/share-menu';
import { RippleDirective } from '../shared/ripple.directive';

/** « Voir le projet » : description du défi et documents d'aide à la résolution (ouvert depuis la page Défis). */
@Component({
  selector: 'app-challenge-detail',
  imports: [Icon, RippleDirective, RouterLink, ShareMenu],
  templateUrl: './challenge-detail.html',
  styleUrls: ['../account/account-shared.css', './challenge-detail.css'],
})
export class ChallengeDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly svc = inject(ChallengesService);
  protected readonly profile = inject(ProfileService);
  protected readonly ago = ago;

  private readonly id = toSignal(this.route.paramMap.pipe(map((p) => Number(p.get('id')))), { requireSync: true });
  protected readonly challenge = computed(() => this.svc.find(this.id()));

  constructor() {
    // défi inconnu : retour à la liste
    if (!this.svc.find(this.id())) void this.router.navigateByUrl('/defis');
  }

  /** envoyer ce défi dans un groupe ou à un contact */
  protected shareItem(): ShareItem | null { const c = this.challenge(); return c ? this.svc.shareItem(c) : null; }
  protected mine() { return this.svc.mineOf(this.id()); }
  /** solutions que les autres membres ont envoyées à ce défi (quand il est de moi) */
  protected received() { return this.svc.receivedOf(this.id()); }
  protected count(): number { const c = this.challenge(); return c ? this.svc.count(c) : 0; }
  protected proposed(): boolean { return this.svc.isProposed(this.id()); }
  protected propose(): void {
    if (this.proposed()) return;
    void this.router.navigate(['/defis', this.id(), 'solution']);
  }
}
