import { Component, ElementRef, effect, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AssistantService } from '../core/assistant.service';
import { Icon } from '../shared/icon';

interface Bubble { from: 'bot' | 'me'; text: string; link?: { label: string; href: string } }

/** Réponses rapides proposées au départ (et leur réponse du bot). */
const QUICK: Record<string, Bubble> = {
  'Conditions d’utilisation': { from: 'bot', text: 'Vous pouvez lire nos conditions d’utilisation ici :', link: { label: 'Conditions d’utilisation', href: '/conditions' } },
  'Confidentialité': { from: 'bot', text: 'Vos documents servent uniquement à vérifier votre rôle. Notre politique de confidentialité détaille l’usage de vos données :', link: { label: 'Politique de confidentialité', href: '/confidentialite' } },
  'Contacter l’équipe': { from: 'bot', text: 'Écrivez votre demande ci-dessous : elle sera transmise à l’équipe, qui vous répondra par e-mail.' },
  'Signaler un problème': { from: 'bot', text: 'Décrivez le problème (page concernée, ce que vous avez fait, message d’erreur) puis envoyez-le.' },
};

/** Assistant d'aide flottant, disponible sur toutes les pages (bouton en bas à droite). */
@Component({
  selector: 'app-assistant',
  imports: [Icon, RouterLink],
  templateUrl: './assistant.html',
  styleUrl: './assistant.css',
})
export class Assistant {
  protected readonly svc = inject(AssistantService);
  private readonly body = viewChild<ElementRef<HTMLElement>>('body');

  protected readonly quick = Object.keys(QUICK);
  protected readonly messages = signal<Bubble[]>([{ from: 'bot', text: 'Bonjour ! Comment puis-je t’aider ?' }]);
  protected readonly typing = signal(false);
  protected readonly draft = signal('');
  protected readonly seen = signal(false);

  constructor() {
    effect(() => {
      if (this.svc.isOpen()) this.seen.set(true);
    });
    // reste en bas de la conversation
    effect(() => {
      this.messages(); this.typing();
      setTimeout(() => {
        const el = this.body()?.nativeElement;
        if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      });
    });
  }

  protected ask(label: string): void {
    this.reply({ from: 'me', text: label }, QUICK[label]);
  }

  protected send(event: Event): void {
    event.preventDefault();
    const text = this.draft().trim();
    if (!text) return;
    this.draft.set('');
    // TODO : envoyer à l'équipe / à l'API du chatbot
    this.reply({ from: 'me', text }, { from: 'bot', text: 'Merci pour votre message. L’équipe d’Engineers Compass l’a bien reçu et reviendra vers vous.' });
  }

  private reply(mine: Bubble, answer: Bubble): void {
    this.messages.update((m) => [...m, mine]);
    this.typing.set(true);
    setTimeout(() => {
      this.typing.set(false);
      this.messages.update((m) => [...m, answer]);
    }, 750);
  }
}
