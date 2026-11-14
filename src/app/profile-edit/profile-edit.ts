import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { EntryKind, ProfileEntry, ProfileService } from '../core/profile.service';
import { Icon, IconName } from '../shared/icon';
import { RippleDirective } from '../shared/ripple.directive';

const KINDS: Record<EntryKind, { label: string; icon: IconName }> = {
  experience: { label: 'Expérience', icon: 'briefcase' },
  formation: { label: 'Formation', icon: 'graduation' },
  certificat: { label: 'Certificat', icon: 'award' },
};

/**
 * Page « Modifier le profil » : nom, titre, présentation et liste des expériences, formations et certificats.
 * On y arrive uniquement depuis MON profil (/profil) ; la page d'un autre membre (/membre/:slug) n'a aucun bouton de modification.
 */
@Component({
  selector: 'app-profile-edit',
  imports: [Icon, RippleDirective],
  templateUrl: './profile-edit.html',
  styleUrls: ['../account/account-shared.css', './profile-edit.css'],
})
export class ProfileEdit {
  private readonly router = inject(Router);
  private readonly profile = inject(ProfileService);

  protected readonly name = signal(this.profile.info().name);
  protected readonly role = signal(this.profile.info().role);
  protected readonly about = signal(this.profile.info().about);
  /** copie de travail : rien n'est enregistré avant « Enregistrer » */
  protected readonly entries = signal<ProfileEntry[]>(this.profile.entries().map((e) => ({ ...e })));
  protected readonly error = signal('');
  protected readonly done = signal(false);

  protected kind(k: EntryKind) { return KINDS[k]; }

  protected setEntry(id: number, key: 'title' | 'sub', value: string): void {
    this.entries.update((l) => l.map((e) => (e.id === id ? { ...e, [key]: value } : e)));
  }

  protected remove(id: number): void { this.entries.update((l) => l.filter((e) => e.id !== id)); }

  protected save(): void {
    if (!this.name().trim()) { this.error.set('Renseignez votre nom.'); return; }
    if (this.entries().some((e) => !e.title.trim())) { this.error.set('Chaque élément doit avoir un titre (ou supprimez-le).'); return; }
    this.error.set('');
    this.profile.update(
      { name: this.name().trim(), role: this.role().trim(), about: this.about().trim() },
      this.entries().map((e) => ({ ...e, title: e.title.trim(), sub: e.sub.trim() })),
    );
    this.done.set(true);
    setTimeout(() => void this.router.navigateByUrl('/profil'), 900);
  }

  protected cancel(): void { void this.router.navigateByUrl('/profil'); }
}
