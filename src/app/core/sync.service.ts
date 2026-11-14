import { DestroyRef, Injectable, inject } from '@angular/core';
import { MessagesService } from './messages.service';
import { NetworkService } from './network.service';
import { NotificationsService } from './notifications.service';
import { RemoteEvent } from './remote-store';
import { RemoteService } from './remote.service';
import { currentEmail } from './storage';

/**
 * Reçoit ce que les autres comptes m'ont envoyé et le range dans les services habituels :
 *   invitation  → « Invitations reçues » + notification
 *   acceptation → je deviens contact + notification
 *   message     → conversation (non lu) + notification ; un contact → Messages, un inconnu → Spam
 * Lancé au chargement du compte (AccountLayout), puis à chaque changement du stockage partagé (autre onglet).
 * TODO : avec Supabase, `pull()` devient l'abonnement Realtime ; le reste ne change pas.
 */
@Injectable({ providedIn: 'root' })
export class SyncService {
  private readonly remote = inject(RemoteService);
  private readonly net = inject(NetworkService);
  private readonly msgs = inject(MessagesService);
  private readonly notifs = inject(NotificationsService);
  private readonly destroyRef = inject(DestroyRef);
  private started = false;

  /** idempotent : démarre l'écoute une seule fois */
  start(): void {
    if (this.started) return;
    this.started = true;
    const onStorage = (e: StorageEvent) => {
      const k = e.key ?? '';
      if (k.startsWith('ec-remote') || k === 'ec-accounts' || k.startsWith('ec-profile:')) this.pull();
    };
    const onVisible = () => { if (document.visibilityState === 'visible') this.pull(); };
    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', onVisible);
    this.destroyRef.onDestroy(() => {
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onVisible);
    });
    this.pull();
  }

  /** relit l'annuaire, les publications communes et ma boîte aux lettres */
  pull(): void {
    if (!currentEmail()) return;
    this.remote.refresh();
    for (const event of this.remote.take()) this.apply(event);
  }

  private apply(e: RemoteEvent): void {
    const name = e.from.name;
    switch (e.type) {
      case 'invite':
        if (this.net.receiveInvite(e.from)) {
          this.notifs.push({ icon: 'user-plus', cat: 'network', text: `${name} vous a envoyé une invitation`, link: '/reseau/invitations' });
        }
        break;
      case 'accepted':
        if (this.net.receiveAccepted(e.from)) {
          this.notifs.push({ icon: 'check', cat: 'network', text: `${name} a accepté votre invitation`, link: '/reseau/contacts' });
        }
        break;
      case 'cancel':
        this.net.receiveCancel(e.from);
        break;
      case 'message': {
        const id = this.msgs.receive(e.from, e.text, e.share);
        this.notifs.push({ icon: 'message', cat: 'message', text: `Nouveau message de ${name}`, link: '/messages', query: { c: String(id) } });
        break;
      }
    }
  }
}
