import { Component, ElementRef, HostListener, WritableSignal, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { AssistantService } from '../core/assistant.service';
import { AuthService } from '../core/auth.service';
import { NetworkService } from '../core/network.service';
import { Notif, NotificationsService } from '../core/notifications.service';
import { MessagesService } from '../core/messages.service';
import { MyPageService } from '../core/my-page.service';
import { ProfileService } from '../core/profile.service';
import { SyncService } from '../core/sync.service';
import { UserService } from '../core/user.service';
import { ThemeService } from '../core/theme.service';
import { ToastService } from '../core/toast.service';
import { SiteFooter } from '../shared/site-footer';
import { Icon, IconName } from '../shared/icon';


/**
 * Cadre commun des pages du compte (fil, défis, offres, recherche).
 * La barre du haut reste affichée ; seule la page dans <router-outlet> change.
 */
@Component({
  selector: 'app-account-layout',
  imports: [RouterLink, RouterOutlet, Icon, SiteFooter],
  templateUrl: './account-layout.html',
  styleUrl: './account-layout.css',
})
export class AccountLayout {
  private readonly router = inject(Router);
  protected readonly messages = inject(MessagesService);
  protected readonly theme = inject(ThemeService);
  /** message en bas de l'écran (« Publication enregistrée », « Envoyé à… ») */
  protected readonly toast = inject(ToastService);
  protected readonly assistant = inject(AssistantService);
  protected readonly user = inject(UserService);
  private readonly auth = inject(AuthService);
  protected readonly profile = inject(ProfileService);
  /** page entreprise de l'employeur : son icône n'apparaît que dans SA barre du haut */
  protected readonly mine = inject(MyPageService);

  protected readonly url = toSignal(
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd), map(() => this.router.url)),
    { initialValue: this.router.url },
  );

  /** texte de la barre de recherche (synchronisé avec ?q= de la page « recherche ») */
  protected readonly q = signal(new URLSearchParams(this.router.url.split('?')[1] ?? '').get('q') ?? '');

  protected readonly nav: { icon: IconName; label: string; link: string; match: string[] }[] = [
    { icon: 'home', label: 'Accueil', link: '/fil', match: ['/fil', '/recherche'] },
    { icon: 'target', label: 'Défis', link: '/defis', match: ['/defis'] },
    { icon: 'briefcase', label: 'Offres', link: '/offres', match: ['/offres'] },
  ];

  protected readonly notifOpen = signal(false);
  protected readonly msgOpen = signal(false);
  protected readonly meOpen = signal(false);

  protected readonly network = inject(NetworkService);
  protected readonly year = new Date().getFullYear();
  protected readonly msgFilter = signal<'all' | 'unread'>('all');
  protected readonly notifFilter = signal<'all' | 'unread'>('all');

  protected readonly notifs = inject(NotificationsService);
  protected readonly today = computed(() => this.notifs.items().filter((n) => n.group === 'today' && (this.notifFilter() === 'all' || n.unread)));
  protected readonly earlier = computed(() => this.notifs.items().filter((n) => n.group === 'earlier' && (this.notifFilter() === 'all' || n.unread)));

  /** zone qui défile (la fenêtre, elle, ne défile plus) */
  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');
  private lastPath = this.router.url.split(/[?#]/)[0];

  constructor() {
    // reçoit ce que les autres comptes m'ont envoyé (invitations, messages) et reste à l'écoute
    inject(SyncService).start();
    // quand on quitte la recherche, on vide la barre
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(() => {
        const [path, query] = this.router.url.split('?');
        // nouvelle page : on repart en haut (seulement si l'adresse change, pas pour un simple ?q= ou ?post=)
        const page = path.split('#')[0];
        if (page !== this.lastPath) {
          this.lastPath = page;
          this.scroller()?.nativeElement.scrollTo({ top: 0, behavior: 'instant' });
        }
        this.q.set(path === '/recherche' ? (new URLSearchParams(query ?? '').get('q') ?? '') : '');
      });
  }

  /** clic sur une notification du panneau : lue, panneau fermé, puis la page liée s'ouvre */
  protected openNotif(n: Notif): void {
    this.notifOpen.set(false);
    this.notifs.open(n);
  }

  protected get unreadCount(): number { return this.notifs.unreadCount(); }

  protected isActive(match: string[]): boolean {
    const path = this.url().split('?')[0];
    return match.some((m) => path === m || path.startsWith(m + '/'));
  }

  protected openSearch(): void {
    if (this.url().split('?')[0] !== '/recherche') {
      void this.router.navigate(['/recherche'], { queryParams: { q: this.q() || null } });
    }
  }

  protected onSearch(value: string): void {
    this.q.set(value);
    void this.router.navigate(['/recherche'], { queryParams: { q: value.trim() || null }, replaceUrl: true });
  }

  protected closeSearch(input: HTMLInputElement): void {
    input.blur();
    this.q.set('');
    void this.router.navigateByUrl('/fil');
  }

  protected toggleNotif(event: Event): void { this.toggle(event, this.notifOpen); }
  protected toggleMsg(event: Event): void { this.toggle(event, this.msgOpen); }
  protected toggleMe(event: Event): void { this.toggle(event, this.meOpen); }

  /** ouvre / ferme un panneau en fermant les autres */
  private toggle(event: Event, target: WritableSignal<boolean>): void {
    event.stopPropagation();
    const next = !target();
    this.closeNotif();
    target.set(next);
  }

  /** invitations de connexion en attente (badge de l'icône « Mon réseau ») */
  protected get pendingCount(): number { return this.network.invitations().length; }

  protected logout(): void {
    this.meOpen.set(false);
    // la session est fermée : les pages du compte ne s'ouvrent plus (retour arrière compris)
    void this.auth.logout().then(() => {
      // rechargement complet : plus aucune donnée du compte ne reste en mémoire
      window.location.replace('/');
    });
  }

  /** ouvre une conversation dans la page /messages */
  protected openConversation(id: number): void {
    this.msgOpen.set(false);
    void this.router.navigate(['/messages'], { queryParams: { c: id } });
  }

  /** clic en dehors ou Échap : ferme le panneau de notifications */
  @HostListener('document:click')
  @HostListener('document:keydown.escape')
  protected closeNotif(): void {
    this.notifOpen.set(false);
    this.msgOpen.set(false);
    this.meOpen.set(false);
  }
}
