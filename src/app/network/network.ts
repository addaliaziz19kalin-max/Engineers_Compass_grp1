import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { NetworkService } from '../core/network.service';
import { Icon, IconName } from '../shared/icon';
import { slugify } from '../shared/slug';
import { RippleDirective } from '../shared/ripple.directive';

type Section = 'overview' | 'contacts' | 'invitations' | 'pages';

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** « Mon réseau » : aperçu, contacts (comme les amis Facebook), invitations reçues, pages suivies. */
@Component({
  selector: 'app-network',
  imports: [Icon, RippleDirective, RouterLink],
  templateUrl: './network.html',
  styleUrls: ['../account/account-shared.css', './network.css'],
})
export class Network {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly net = inject(NetworkService);

  protected readonly section = toSignal(
    this.route.paramMap.pipe(map((p): Section => {
      const s = p.get('section');
      return s === 'contacts' || s === 'invitations' || s === 'pages' ? s : 'overview';
    })),
    { requireSync: true },
  );

  protected readonly menu = computed<{ id: Section; link: string; label: string; icon: IconName; count: number }[]>(() => [
    { id: 'contacts', link: '/reseau/contacts', label: 'Contacts', icon: 'users', count: this.net.contacts().length },
    { id: 'invitations', link: '/reseau/invitations', label: 'Invitations', icon: 'user-plus', count: this.net.invitations().length + this.net.sent().length },
    { id: 'pages', link: '/reseau/pages', label: 'Pages suivies', icon: 'file', count: this.net.pages().length },
  ]);

  // aperçu
  protected readonly showAllSuggestions = signal(false);
  protected readonly suggestions = computed(() => (this.showAllSuggestions() ? this.net.suggestions() : this.net.suggestions().slice(0, 4)));

  // contacts : recherche
  protected readonly query = signal('');
  protected readonly filteredContacts = computed(() => {
    const words = norm(this.query()).split(/\s+/).filter(Boolean);
    return this.net.contacts().filter((c) => words.every((w) => norm(`${c.name} ${c.role}`).includes(w)));
  });

  protected readonly slug = slugify;

  protected message(): void { void this.router.navigateByUrl('/messages'); }
  protected isRequested(name: string): boolean { return this.net.isRequested(name); }
}
