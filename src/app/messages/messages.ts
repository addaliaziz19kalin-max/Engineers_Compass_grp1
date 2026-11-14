import { Component, computed, effect, ElementRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Conversation, MessagesService } from '../core/messages.service';
import { NetworkService, Person } from '../core/network.service';
import { Icon } from '../shared/icon';
import { RippleDirective } from '../shared/ripple.directive';

type Tab = 'contacts' | 'groups' | 'spam';

/** « Sarra Ben Ali » → « sarra ben ali » (recherche sans accents ni majuscules) */
const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

@Component({
  selector: 'app-messages',
  imports: [Icon, RippleDirective, RouterLink],
  templateUrl: './messages.html',
  styleUrls: ['../account/account-shared.css', './messages.css'],
})
export class Messages {
  protected readonly svc = inject(MessagesService);
  private readonly net = inject(NetworkService);
  private readonly thread = viewChild<ElementRef<HTMLElement>>('thread');

  protected readonly tab = signal<Tab>('contacts');
  protected readonly selectedId = signal(0);
  protected readonly draft = signal('');

  protected readonly list = computed(() =>
    this.svc.conversations().filter((c) => this.tabOf(c) === this.tab()),
  );
  protected readonly selected = computed(
    () => this.svc.conversations().find((c) => c.id === this.selectedId()) ?? this.list()[0] ?? this.svc.conversations()[0],
  );
  protected readonly spamCount = computed(() => this.svc.conversations().filter((c) => c.spam).length);

  // ----- bouton « Nouveau » : écrire à une personne (contact ou non) -----
  protected readonly composing = signal(false);
  protected readonly query = signal('');
  protected readonly recipient = signal<Person | null>(null);
  protected readonly newText = signal('');

  /** personnes du réseau : contacts d'abord, puis invitations et suggestions (pas encore des contacts) */
  private readonly people = computed(() => {
    const seen = new Set<string>();
    return [...this.net.contacts(), ...this.net.invitations(), ...this.net.suggestions()].filter((p) => !seen.has(p.name) && !!seen.add(p.name));
  });
  protected readonly results = computed(() => {
    const q = norm(this.query().trim());
    const all = this.people();
    return (q ? all.filter((p) => norm(`${p.name} ${p.role}`).includes(q)) : all).slice(0, 8);
  });

  constructor() {
    // ?c=ID (depuis le panneau Messenger de la barre du haut)
    inject(ActivatedRoute).queryParamMap.pipe(takeUntilDestroyed()).subscribe((p) => {
      const id = Number(p.get('c'));
      const c = this.svc.conversations().find((x) => x.id === id);
      if (c) {
        this.tab.set(this.tabOf(c));
        this.select(c.id);
      }
    });

    // descend en bas du fil à chaque nouveau message / changement de conversation
    effect(() => {
      this.selected()?.messages.length;
      setTimeout(() => {
        const el = this.thread()?.nativeElement;
        if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      });
    });
  }

  private tabOf(c: Conversation): Tab {
    return c.spam ? 'spam' : c.group ? 'groups' : 'contacts';
  }

  protected setTab(t: Tab): void {
    this.tab.set(t);
    this.composing.set(false);
    const first = this.list()[0];
    if (first) this.select(first.id);
  }

  protected select(id: number): void {
    this.composing.set(false);
    this.selectedId.set(id);
    this.svc.markRead(id);
  }

  protected send(event: Event): void {
    event.preventDefault();
    this.svc.send(this.selected().id, this.draft());
    this.draft.set('');
  }

  // ----- nouveau message -----
  protected isContact(name: string): boolean {
    return this.net.contacts().some((c) => c.name === name);
  }

  protected openNew(): void {
    this.query.set('');
    this.recipient.set(null);
    this.newText.set('');
    this.composing.set(true);
  }

  protected closeNew(): void { this.composing.set(false); }
  protected pick(p: Person): void { this.recipient.set(p); }
  protected clearRecipient(): void { this.recipient.set(null); }

  /** envoie le message : dans « Contacts » si la personne est un contact, sinon dans « Spam » */
  protected sendNew(event: Event): void {
    event.preventDefault();
    const to = this.recipient();
    if (!to) return;
    const id = this.svc.start(to, this.newText(), this.isContact(to.name));
    if (id === null) return;
    const c = this.svc.conversations().find((x) => x.id === id);
    if (c) this.tab.set(this.tabOf(c));
    this.select(id);
  }
}
