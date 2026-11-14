import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { MAX_WARNINGS, MyPageService, PostKind, SECTORS, SIZES } from '../core/my-page.service';
import { ProofCheckService } from '../core/proof-check.service';
import { Icon, IconName } from '../shared/icon';
import { PostActions } from '../shared/post-actions';
import { RippleDirective } from '../shared/ripple.directive';

type View = 'home' | 'about' | 'offers' | 'challenges' | 'posts' | 'applicants' | 'dashboard' | 'solutions' | 'edit' | 'verify';

/**
 * Page entreprise vue par son administrateur (employeur) : /ma-page.
 * Les outils (candidatures, tableau de bord, solutions, modification, vérification) n'existent
 * que ici : la page publique (/page/:slug, composant Company) ne les affiche jamais aux visiteurs.
 */
@Component({
  selector: 'app-my-page',
  imports: [Icon, RippleDirective, PostActions],
  templateUrl: './my-page.html',
  styleUrls: ['../account/account-shared.css', '../account/page-form.css', './my-page.css'],
})
export class MyPageAdmin {
  private readonly router = inject(Router);
  private readonly proofCheck = inject(ProofCheckService);
  protected readonly mine = inject(MyPageService);

  protected readonly maxWarnings = MAX_WARNINGS;
  protected readonly sectors = SECTORS;
  protected readonly sizes = SIZES;

  protected readonly view = signal<View>('home');
  protected readonly flash = signal('');
  private flashTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    // réservé à l'employeur (employerGuard sur la route) ; sans page, on l'envoie la créer
    if (!this.mine.page()) void this.router.navigateByUrl('/creer-page', { replaceUrl: true });
  }

  protected readonly line = computed(() => {
    const p = this.mine.page();
    return p ? [p.sector, p.city].filter(Boolean).join(' · ') : '';
  });

  protected readonly tabs = computed<{ id: View; label: string }[]>(() => [
    { id: 'home', label: 'Accueil' },
    { id: 'about', label: 'À propos' },
    { id: 'offers', label: `Offres (${this.mine.offers().length})` },
    { id: 'challenges', label: `Défis (${this.mine.challenges().length})` },
    { id: 'posts', label: 'Publications' },
  ]);

  /** outils visibles uniquement par l'administrateur */
  protected readonly tools = computed<{ id: View; icon: IconName; label: string; sub: string }[]>(() => {
    const a = this.mine.applicants().length;
    const s = this.mine.solutions().length;
    return [
      { id: 'applicants', icon: 'send', label: 'Candidatures', sub: `${a} candidature${a > 1 ? 's' : ''} · ${this.mine.offers().length} offre(s)` },
      { id: 'dashboard', icon: 'chart', label: 'Tableau de bord', sub: 'Activité de la page' },
      { id: 'solutions', icon: 'award', label: 'Solutions aux défis', sub: `${s} solution${s > 1 ? 's' : ''} · ${this.mine.challenges().length} défi(s)` },
      { id: 'edit', icon: 'edit', label: 'Modifier la page', sub: 'Nom, secteur, présentation' },
    ];
  });

  protected readonly stats = computed<{ icon: IconName; value: number; label: string }[]>(() => [
    { icon: 'briefcase', value: this.mine.offers().length, label: 'Offres publiées' },
    { icon: 'target', value: this.mine.challenges().length, label: 'Défis publiés' },
    { icon: 'send', value: this.mine.applicants().length, label: 'Candidatures reçues' },
    { icon: 'award', value: this.mine.solutions().length, label: 'Solutions reçues' },
  ]);

  protected show(v: View): void {
    this.error.set('');
    if (v === 'edit') this.prefill();
    if (v === 'verify') this.file.set(null);
    this.view.set(v);
  }

  protected kindLabel(k: PostKind): string { return k === 'offer' ? 'Offre' : k === 'challenge' ? 'Défi' : 'Publication'; }

  private notify(text: string): void {
    this.flash.set(text);
    clearTimeout(this.flashTimer);
    this.flashTimer = setTimeout(() => this.flash.set(''), 3500);
  }

  // ----- publier au nom de la page -----
  protected readonly mode = signal<PostKind>('post');
  protected readonly title = signal('');
  protected readonly text = signal('');
  protected readonly photo = signal('');
  protected readonly composeError = signal('');
  protected readonly box = viewChild<ElementRef<HTMLInputElement>>('box');

  /** ouvre la zone de publication (publication simple, offre ou défi) */
  protected startMode(m: PostKind): void {
    this.mode.set(this.mode() === m && m !== 'post' ? 'post' : m);
    this.composeError.set('');
    this.view.set('home');
    setTimeout(() => this.box()?.nativeElement.focus(), 50);
  }

  protected pickPhoto(input: HTMLInputElement): void {
    const f = input.files?.[0];
    if (f) this.photo.set(f.name);
  }

  protected publish(): void {
    const mode = this.mode();
    const title = this.title().trim();
    const text = this.text().trim();
    if (mode !== 'post' && !title) { this.composeError.set(mode === 'offer' ? 'Donnez un titre à l’offre.' : 'Donnez un titre au défi.'); return; }
    if (!text) { this.composeError.set(mode === 'post' ? 'Écrivez quelque chose avant de publier.' : 'Ajoutez une description.'); return; }
    this.mine.publish(mode, title, text, this.photo() || undefined);
    this.title.set('');
    this.text.set('');
    this.photo.set('');
    this.mode.set('post');
    this.composeError.set('');
    this.notify(mode === 'offer' ? 'Offre publiée' : mode === 'challenge' ? 'Défi publié' : 'Publication ajoutée');
  }

  // ----- modifier la page -----
  protected readonly name = signal('');
  protected readonly sector = signal('');
  protected readonly city = signal('');
  protected readonly size = signal('');
  protected readonly about = signal('');

  private prefill(): void {
    const p = this.mine.page();
    if (!p) return;
    this.name.set(p.name);
    this.sector.set(p.sector);
    this.city.set(p.city);
    this.size.set(p.size);
    this.about.set(p.about);
  }

  protected saveEdit(): void {
    if (!this.name().trim()) { this.fail('Donnez un nom à votre page.'); return; }
    // TODO : envoyer les modifications à l'API
    this.mine.update({ name: this.name().trim(), sector: this.sector(), city: this.city().trim(), size: this.size(), about: this.about().trim() });
    this.error.set('');
    this.view.set('home');
    this.notify('Page mise à jour');
  }

  // ----- vérification : même test du justificatif que l'inscription -----
  protected readonly file = signal<File | null>(null);
  protected readonly dragging = signal(false);
  protected readonly error = signal('');
  protected readonly shake = signal(false);
  protected readonly loading = signal(false);
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

  protected async verifyNow(): Promise<void> {
    const file = this.file();
    if (!file) return this.fail('Ajoutez un document pour vérifier votre entreprise.');
    this.loading.set(true);
    const ok = await this.proofCheck.check('employer', file);
    this.loading.set(false);
    if (!ok) return this.fail('Le document ne correspond pas à un justificatif d’entreprise. Essayez un autre document.');
    // TODO : envoyer le justificatif à l'API
    this.mine.verify();
    this.error.set('');
    this.view.set('home');
    this.notify('Page vérifiée');
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
}
