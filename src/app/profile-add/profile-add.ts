import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { EntryKind, ProfileService } from '../core/profile.service';
import { PostsService } from '../core/posts.service';
import { Icon, IconName } from '../shared/icon';
import { RippleDirective } from '../shared/ripple.directive';

interface Field { key: string; label: string; icon: IconName; placeholder: string; half?: boolean; required?: boolean }

const FORMS: Record<EntryKind, { label: string; fields: Field[]; area: string; proof: string }> = {
  experience: {
    label: 'Expérience',
    fields: [
      { key: 'title', label: 'Poste', icon: 'briefcase', placeholder: 'Stagiaire ingénieur IA', required: true },
      { key: 'org', label: 'Entreprise', icon: 'file', placeholder: 'Huawei Technologies Tunis', half: true, required: true },
      { key: 'place', label: 'Lieu', icon: 'pin', placeholder: 'Tunis', half: true },
      { key: 'start', label: 'Début', icon: 'calendar', placeholder: '07 / 2026', half: true },
      { key: 'end', label: 'Fin', icon: 'calendar', placeholder: 'En cours', half: true },
    ],
    area: 'Missions et réalisations…',
    proof: 'Attestation, contrat ou lien de vérification',
  },
  formation: {
    label: 'Formation',
    fields: [
      { key: 'title', label: 'Diplôme', icon: 'graduation', placeholder: 'Cycle ingénieur · Télécoms', required: true },
      { key: 'org', label: 'Établissement', icon: 'file', placeholder: 'Sup’Com', half: true, required: true },
      { key: 'place', label: 'Lieu', icon: 'pin', placeholder: 'Tunis', half: true },
      { key: 'start', label: 'Début', icon: 'calendar', placeholder: '09 / 2023', half: true },
      { key: 'end', label: 'Fin', icon: 'calendar', placeholder: 'En cours', half: true },
    ],
    area: 'Spécialité, projets marquants…',
    proof: 'Certificat de scolarité ou relevé de notes',
  },
  certificat: {
    label: 'Certificat',
    fields: [
      { key: 'title', label: 'Intitulé', icon: 'award', placeholder: 'Certification Cisco CCNA', required: true },
      { key: 'org', label: 'Organisme', icon: 'file', placeholder: 'Cisco', half: true, required: true },
      { key: 'start', label: 'Date d’obtention', icon: 'calendar', placeholder: '03 / 2026', half: true },
    ],
    area: 'Compétences validées…',
    proof: 'Copie du certificat ou lien de vérification',
  },
};

/** Page « Ajouter à mon profil » : expérience, formation ou certificat. */
@Component({
  selector: 'app-profile-add',
  imports: [Icon, RippleDirective],
  templateUrl: './profile-add.html',
  styleUrls: ['../account/account-shared.css', './profile-add.css'],
})
export class ProfileAdd {
  private readonly router = inject(Router);
  private readonly profile = inject(ProfileService);
  private readonly posts = inject(PostsService);

  protected readonly kinds = (Object.keys(FORMS) as EntryKind[]).map((id) => ({ id, label: FORMS[id].label }));
  protected readonly kind = signal<EntryKind>('experience');
  protected readonly form = computed(() => FORMS[this.kind()]);

  private readonly values = signal<Record<string, string>>({});
  protected readonly description = signal('');
  protected readonly proof = signal<File | null>(null);
  protected readonly error = signal('');
  protected readonly done = signal(false);

  protected value(key: string): string { return this.values()[`${this.kind()}.${key}`] ?? ''; }
  protected set(key: string, v: string): void { this.values.update((m) => ({ ...m, [`${this.kind()}.${key}`]: v })); }

  protected pick(input: HTMLInputElement): void {
    const f = input.files?.[0];
    if (f) this.proof.set(f);
  }

  protected submit(): void {
    const missing = this.form().fields.find((f) => f.required && !this.value(f.key).trim());
    if (missing) { this.error.set(`Renseignez le champ « ${missing.label} ».`); return; }
    this.error.set('');

    const v = (k: string) => this.value(k).trim();
    const period = [v('start'), v('end')].filter(Boolean).join(' – ');
    const sub = [v('org'), period, v('place')].filter(Boolean).join(' · ') + (this.proof() ? ' · vérification en cours' : '');
    // TODO : envoyer l'entrée (et la preuve) à l'API
    this.profile.add({
      kind: this.kind(),
      title: this.kind() === 'experience' && v('org') ? `${v('title')} · ${v('org')}` : v('title'),
      sub: sub || 'Ajouté à l’instant',
    });
    // l'élément ajouté est aussi partagé : il apparaît dans le fil et sur le profil (public)
    this.posts.publish({
      kind: 'experience',
      label: `a ajouté ${this.kind() === 'experience' ? 'une expérience' : this.kind() === 'formation' ? 'une formation' : 'un certificat'}`,
      text: this.description().trim(),
      title: this.kind() === 'experience' && v('org') ? `${v('title')} · ${v('org')}` : v('title'),
      sub: sub || undefined,
      link: '/profil',
    });
    this.done.set(true);
    setTimeout(() => void this.router.navigateByUrl('/profil'), 900);
  }

  protected cancel(): void { void this.router.navigateByUrl('/profil'); }
}
