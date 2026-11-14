import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MyPageService, PageData, SECTORS, SIZES, initialsOf } from '../core/my-page.service';
import { ProofCheckService } from '../core/proof-check.service';
import { VerificationResultService } from '../core/verification-result.service';
import { Icon } from '../shared/icon';
import { RippleDirective } from '../shared/ripple.directive';

/**
 * Page « Créer une page » (réservée aux employeurs), en 2 étapes comme sur Facebook :
 *  1. informations de la page (avec aperçu en direct)
 *  2. vérification de l'entreprise : le justificatif passe le même test que celui de l'inscription
 */
@Component({
  selector: 'app-create-page',
  imports: [Icon, RippleDirective],
  templateUrl: './create-page.html',
  styleUrls: ['../account/account-shared.css', '../account/page-form.css', './create-page.css'],
})
export class CreatePage {
  private readonly router = inject(Router);
  private readonly mine = inject(MyPageService);
  private readonly proofCheck = inject(ProofCheckService);
  private readonly result = inject(VerificationResultService);

  protected readonly sectors = SECTORS;
  protected readonly sizes = SIZES;

  protected readonly step = signal(1);
  protected readonly name = signal('');
  protected readonly sector = signal<string>(SECTORS[0]);
  protected readonly city = signal('');
  protected readonly size = signal<string>(SIZES[2]);
  protected readonly about = signal('');

  protected readonly file = signal<File | null>(null);
  protected readonly dragging = signal(false);
  protected readonly error = signal('');
  protected readonly shake = signal(false);
  protected readonly loading = signal(false);

  constructor() {
    // réservé aux employeurs (employerGuard sur la route), une seule page par compte
    if (this.mine.page()) void this.router.navigateByUrl('/ma-page', { replaceUrl: true });
  }

  /** aperçu en direct */
  protected readonly initials = computed(() => (this.name().trim() ? initialsOf(this.name().trim()) : ''));
  protected readonly line = computed(() =>
    [this.sector(), this.city().trim(), `${this.size()} employés`].filter(Boolean).join(' · '),
  );
  protected readonly fileSize = computed(() => {
    const f = this.file();
    if (!f) return '';
    return f.size > 1_048_576 ? `${(f.size / 1_048_576).toFixed(1)} Mo` : `${Math.max(1, Math.round(f.size / 1024))} Ko`;
  });

  private fail(message: string): void {
    this.error.set(message);
    this.shake.set(false);
    requestAnimationFrame(() => this.shake.set(true));
  }

  private data(): PageData {
    return { name: this.name().trim(), sector: this.sector(), city: this.city().trim(), size: this.size(), about: this.about().trim() };
  }

  /** Étape 1 → 2 */
  protected next(): void {
    if (!this.name().trim()) return this.fail('Donnez un nom à votre page.');
    this.go(2);
  }

  /** Étape 2 → fin : le test du document est instantané, la page de résultat s'ouvre aussitôt */
  protected async verifyAndCreate(): Promise<void> {
    const file = this.file();
    if (!file) return this.fail('Ajoutez un document pour vérifier votre entreprise.');
    this.loading.set(true);
    const ok = await this.proofCheck.check('employer', file);
    this.loading.set(false);
    if (!ok) return this.fail('Le document ne correspond pas à un justificatif d’entreprise. Essayez un autre document ou vérifiez plus tard.');
    // TODO : envoyer la page + le justificatif à l'API (multipart)
    this.mine.create(this.data(), true);
    this.result.set({ from: 'page', s: 'accepted' });
    void this.router.navigateByUrl('/verification');
  }

  /** la page est créée « en attente de vérification » : 14 jours pour envoyer les documents */
  protected createLater(): void {
    // TODO : envoyer la page à l'API
    this.mine.create(this.data(), false);
    this.result.set({ from: 'page', s: 'pending' });
    void this.router.navigateByUrl('/verification');
  }

  protected go(n: number): void {
    this.error.set('');
    this.step.set(n);
  }

  protected pick(input: HTMLInputElement | null, dropped?: FileList | null): void {
    const f = (dropped ?? input?.files)?.[0];
    if (!f) return;
    if (f.size > 10 * 1_048_576) return this.fail('Fichier trop lourd (10 Mo maximum).');
    this.error.set('');
    this.file.set(f);
  }

  protected drop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    this.pick(null, event.dataTransfer?.files);
  }

  protected cancel(): void { void this.router.navigateByUrl('/fil'); }
}
