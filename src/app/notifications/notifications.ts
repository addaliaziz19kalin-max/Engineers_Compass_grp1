import { Component, computed, inject, signal } from '@angular/core';
import { Icon } from '../shared/icon';
import { NotifCat, NotificationsService } from '../core/notifications.service';

type Filter = 'all' | 'unread' | NotifCat;

/** Page « Historique des notifications ». */
@Component({
  selector: 'app-notifications',
  imports: [Icon],
  templateUrl: './notifications.html',
  styleUrls: ['../account/account-shared.css', './notifications.css'],
})
export class Notifications {
  protected readonly store = inject(NotificationsService);
  protected readonly filter = signal<Filter>('all');

  protected readonly filters = computed<{ id: Filter; label: string }[]>(() => [
    { id: 'all', label: 'Toutes' },
    { id: 'unread', label: `Non lues (${this.store.unreadCount()})` },
    { id: 'message', label: 'Messages' },
    { id: 'challenge', label: 'Défis' },
    { id: 'network', label: 'Réseau' },
    { id: 'offer', label: 'Offres' },
    { id: 'verif', label: 'Vérification' },
  ]);

  private readonly shown = computed(() => {
    const f = this.filter();
    return this.store.items().filter((n) => (f === 'all' ? true : f === 'unread' ? n.unread : n.cat === f));
  });
  protected readonly today = computed(() => this.shown().filter((n) => n.group === 'today'));
  protected readonly earlier = computed(() => this.shown().filter((n) => n.group === 'earlier'));
}
