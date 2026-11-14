import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { OffersService } from '../core/offers.service';
import { SavedService } from '../core/saved.service';
import { Icon } from '../shared/icon';
import { slugify } from '../shared/slug';
import { RippleDirective } from '../shared/ripple.directive';

/** Détail d'une offre (ouvert en cliquant sur une offre de la liste). */
@Component({
  selector: 'app-offer-detail',
  imports: [Icon, RippleDirective, RouterLink],
  templateUrl: './offer-detail.html',
  styleUrls: ['../account/account-shared.css', './offer-detail.css'],
})
export class OfferDetail {
  protected readonly slug = slugify;
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly svc = inject(OffersService);
  private readonly savedSvc = inject(SavedService);

  private readonly id = toSignal(this.route.paramMap.pipe(map((p) => p.get('id'))), { requireSync: true });
  protected readonly offer = computed(() => this.svc.find(this.id()));
  protected readonly similar = computed(() => this.svc.offers.filter((o) => o.id !== this.id()).slice(0, 3));

  constructor() {
    // offre inconnue : retour à la liste
    if (!this.svc.find(this.id())) void this.router.navigateByUrl('/offres');
  }

  protected applied(): boolean { return this.svc.isApplied(this.offer()!.id); }
  protected apply(): void { this.svc.apply(this.offer()!.id); }

  private savedId(): string { return `offer-${this.offer()!.id}`; }
  protected isSaved(): boolean { return this.savedSvc.has(this.savedId()); }
  protected toggleSave(): void {
    const o = this.offer()!;
    this.savedSvc.toggle({ id: this.savedId(), kind: 'offer', title: o.headline, sub: `${o.company} · ${o.place}`, link: `/offres/${o.id}` });
  }
}
