import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthShell } from '../auth/auth-shell';
import { AuthService } from '../core/auth.service';
import { MyPageService } from '../core/my-page.service';
import { ProfileService } from '../core/profile.service';
import { ProofCheckService } from '../core/proof-check.service';
import { SettingsService } from '../core/settings.service';
import { ROLE_LABEL } from '../core/user.service';
import { VerificationResultService } from '../core/verification-result.service';
import { Icon, IconName } from '../shared/icon';
import { RippleDirective } from '../shared/ripple.directive';

type Role = 'student' | 'engineer' | 'employer' | 'other';

@Component({
  selector: 'app-signup',
  imports: [RouterLink, RippleDirective, AuthShell, Icon],
  templateUrl: './signup.html',
  styleUrls: ['../auth/auth-shared.css', './signup.css'],
})
export class Signup {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly result = inject(VerificationResultService);
  private readonly mine = inject(MyPageService);
  private readonly proofCheck = inject(ProofCheckService);
  private readonly settings = inject(SettingsService);
  private readonly profile = inject(ProfileService);
  /** adresse e-mail saisie à l'étape 1 : elle devient celle du compte si la vérification est acceptée */
  private email = '';
  private password = '';
  /** prénom et nom saisis à l'étape 1 : ils deviennent le nom du profil */
  private fullName = '';

  protected readonly steps = [
    { n: 1, label: 'Compte' },
    { n: 2, label: 'Rôle et preuve' },
    { n: 3, label: 'Vérification' },
  ];

  protected readonly roles: { id: Role; label: string; hint: string; icon: IconName }[] = [
    { id: 'student', label: 'Étudiant', hint: 'En formation d’ingénieur', icon: 'graduation' },
    { id: 'engineer', label: 'Ingénieur', hint: 'Diplômé ou en poste', icon: 'cog' },
    { id: 'employer', label: 'Employeur', hint: 'Entreprise ou recruteur', icon: 'briefcase' },
    { id: 'other', label: 'Autre', hint: 'Un autre profil', icon: 'dots' },
  ];

  /** documents attendus selon le rôle choisi */
  private readonly proofs: Record<Role, { title: string; hint: string }> = {
    student: { title: 'Carte d’étudiant ou pièce d’identité', hint: 'Carte d’étudiant, certificat de scolarité ou carte d’identité (CIN).' },
    engineer: { title: 'Diplôme ou carte professionnelle', hint: 'Diplôme d’ingénieur, carte professionnelle ou contrat de travail.' },
    employer: { title: 'Justificatif d’entreprise', hint: 'Attestation de travail, registre de commerce ou carte professionnelle.' },
    other: { title: 'Pièce justificative', hint: 'Tout document officiel qui prouve votre identité et votre rôle.' },
  };

  protected readonly step = signal(1);
  protected readonly role = signal<Role>('student');
  protected readonly otherRole = signal('');
  protected readonly file = signal<File | null>(null);
  protected readonly dragging = signal(false);
  protected readonly showPassword = signal(false);
  protected readonly validated = signal(false);
  protected readonly error = signal('');
  protected readonly shake = signal(false);
  protected readonly loading = signal(false);

  protected readonly today = new Date().toISOString().slice(0, 10);
  protected readonly proof = computed(() => this.proofs[this.role()]);
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

  /** Étape 1 → 2 */
  protected next1(event: Event, form: HTMLFormElement, pw: string, pw2: string): void {
    event.preventDefault();
    this.validated.set(true);
    if (!form.checkValidity()) return this.fail('Veuillez remplir tous les champs requis.');
    if (pw.length < 6) return this.fail('Le mot de passe doit contenir au moins 6 caractères.');
    if (pw !== pw2) return this.fail('Les deux mots de passe ne sont pas identiques.');
    this.email = (form.elements.namedItem('em') as HTMLInputElement | null)?.value ?? '';
    const field = (id: string) => ((form.elements.namedItem(id) as HTMLInputElement | null)?.value ?? '').trim();
    this.fullName = `${field('fn')} ${field('ln')}`.trim();
    this.password = pw;
    this.go(2);
  }

  /** Étape 2 → 3 */
  protected next2(): void {
    if (this.role() === 'other' && !this.otherRole().trim()) return this.fail('Précisez votre rôle.');
    this.go(3);
  }

  /** Étape 3 → fin : le test du document est instantané, la page de résultat s'ouvre aussitôt */
  protected async finish(): Promise<void> {
    const file = this.file();
    if (!file) return this.fail('Ajoutez un document pour vérifier votre rôle.');
    this.loading.set(true);
    const ok = await this.proofCheck.check(this.role(), file);
    // TODO : envoyer le compte + le fichier à l'API (multipart)
    if (ok) {
      // nouveau compte : le rôle vérifié est enregistré avec le compte, aucune page d'un ancien compte n'est reprise
      const created = await this.auth.register(this.email, this.password, this.role(), this.fullName);
      if (!created) {
        this.loading.set(false);
        this.go(1);
        return this.fail('Un compte existe déjà avec cette adresse e-mail. Connectez-vous.');
      }
      this.mine.clear();
      this.settings.setEmail(this.email);
      // profil neuf : seulement le nom saisi et le rôle vérifié
      this.profile.init(this.fullName, this.role() === 'other' ? this.otherRole().trim() : ROLE_LABEL[this.role()]);
    }
    // inscription refusée : aucun compte, aucune session, aucun droit
    this.result.set({ from: 'signup', s: ok ? 'accepted' : 'refused' });
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
}
