import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Icon, IconName } from '../shared/icon';
import { RippleDirective } from '../shared/ripple.directive';

/** Page « Signaler un problème ». */
@Component({
  selector: 'app-report',
  imports: [Icon, RippleDirective],
  templateUrl: './report.html',
  styleUrls: ['../account/account-shared.css', './report.css'],
})
export class Report {
  private readonly router = inject(Router);

  protected readonly types: { id: string; label: string; icon: IconName }[] = [
    { id: 'bug', label: 'Bug technique', icon: 'alert' },
    { id: 'content', label: 'Contenu ou profil suspect', icon: 'flag' },
    { id: 'security', label: 'Sécurité', icon: 'lock' },
    { id: 'other', label: 'Autre', icon: 'help' },
  ];
  protected readonly places = ['Page Offres', 'Fil d’actualité', 'Défis', 'Profil', 'Messages', 'Recherche', 'Autre'];

  protected readonly type = signal('bug');
  protected readonly place = signal('Page Offres');
  protected readonly description = signal('');
  protected readonly file = signal<File | null>(null);
  protected readonly error = signal('');
  protected readonly sent = signal(false);

  protected pick(input: HTMLInputElement): void {
    const f = input.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1_048_576) { this.error.set('Image trop lourde (10 Mo maximum).'); return; }
    this.error.set('');
    this.file.set(f);
  }

  protected send(): void {
    if (this.description().trim().length < 10) { this.error.set('Décrivez le problème en quelques mots (10 caractères minimum).'); return; }
    this.error.set('');
    // TODO : envoyer le signalement (type, lieu, description, capture) à l'API
    this.sent.set(true);
    setTimeout(() => void this.router.navigateByUrl('/fil'), 1800);
  }

  protected cancel(): void { void this.router.navigateByUrl('/fil'); }
}
