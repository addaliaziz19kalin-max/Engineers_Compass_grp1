import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { OffersService } from '../core/offers.service';
import { slugify } from '../shared/slug';
import { RippleDirective } from '../shared/ripple.directive';

const FILTERS = ['Tous', 'PFE', 'Stage', 'Télétravail'] as const;
type Filter = (typeof FILTERS)[number];

interface Application { label: string; step: number }
const STEPS = ['Envoyée', 'Examen', 'Entretien', 'Décision'];

@Component({
  selector: 'app-offers',
  imports: [RippleDirective, RouterLink],
  templateUrl: './offers.html',
  styleUrls: ['../account/account-shared.css', './offers.css'],
})
export class Offers {
  protected readonly slug = slugify;
  protected readonly filters = FILTERS;
  protected readonly steps = STEPS;

  private readonly svc = inject(OffersService);
  private readonly router = inject(Router);
  protected readonly offers = this.svc.offers;

  protected readonly filter = signal<Filter>('Tous');
  protected readonly applied = this.svc.applied;

  protected readonly list = computed(() => {
    const f = this.filter();
    if (f === 'Tous') return this.offers;
    if (f === 'Télétravail') return this.offers.filter((o) => o.remote);
    return this.offers.filter((o) => o.kind === f);
  });

  /** mes candidatures : une par offre postulée (TODO : l'étape vient de l'API, « Envoyée » au départ) */
  protected readonly applications = computed<Application[]>(() =>
    this.applied().flatMap((id) => {
      const o = this.offers.find((x) => x.id === id);
      return o ? [{ label: `${o.kind} · ${o.company}`, step: 1 }] : [];
    }),
  );

  protected isApplied(id: string): boolean { return this.svc.isApplied(id); }
  protected apply(id: string): void { this.svc.apply(id); }
  protected open(id: string): void { void this.router.navigate(['/offres', id]); }
}
