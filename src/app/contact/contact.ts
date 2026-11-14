import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AssistantService } from '../core/assistant.service';
import { Icon } from '../shared/icon';
import { RippleDirective } from '../shared/ripple.directive';

/** Page « Contactez-nous ». */
@Component({
  selector: 'app-contact',
  imports: [Icon, RippleDirective, RouterLink],
  templateUrl: './contact.html',
  styleUrls: ['../account/account-shared.css', './contact.css'],
})
export class Contact {
  protected readonly assistant = inject(AssistantService);

  protected readonly subjects = ['Problème de vérification', 'Question sur mon compte', 'Offres et candidatures', 'Page entreprise', 'Suggestion', 'Autre'];
  protected readonly infos = [
    { icon: 'mail' as const, title: 'E-mail', text: 'contact@engineers-compass.tn' },
    { icon: 'pin' as const, title: 'Adresse', text: 'SUP’COM, Cité Technologique, Ariana' },
    { icon: 'clock' as const, title: 'Disponibilité', text: 'Lun – Ven · 9 h – 17 h' },
  ];
  protected readonly faq = ['Comment fonctionne la vérification ?', 'Pourquoi mon test est-il refusé ?', 'Comment signaler une page ?'];

  protected readonly name = signal('');
  protected readonly email = signal('');
  protected readonly subject = signal('Problème de vérification');
  protected readonly message = signal('');
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
    if (!this.name().trim()) return this.fail('Indiquez votre nom.');
    if (!/^\S+@\S+\.\S+$/.test(this.email().trim())) return this.fail('Indiquez une adresse e-mail valide.');
    if (this.message().trim().length < 10) return this.fail('Décrivez votre demande en quelques mots (10 caractères minimum).');
    this.error.set('');
    // TODO : envoyer le message (nom, e-mail, sujet, message, capture) à l'API
    this.sent.set(true);
  }

  protected reset(): void {
    this.sent.set(false);
    this.message.set('');
    this.file.set(null);
  }

  private fail(msg: string): void { this.error.set(msg); }
}
