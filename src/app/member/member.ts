import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { DirectoryService } from '../core/directory.service';
import { MessagesService } from '../core/messages.service';
import { NetworkService } from '../core/network.service';
import { Icon } from '../shared/icon';
import { RippleDirective } from '../shared/ripple.directive';
import { slugify } from '../shared/slug';

/** Profil d'un autre membre (ouvert en cliquant sur une personne). */
@Component({
  selector: 'app-member',
  imports: [Icon, RippleDirective],
  templateUrl: './member.html',
  styleUrls: ['../account/account-shared.css', './member.css'],
})
export class MemberPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dir = inject(DirectoryService);
  private readonly net = inject(NetworkService);
  private readonly msgs = inject(MessagesService);

  private readonly slug = toSignal(this.route.paramMap.pipe(map((p) => p.get('slug'))), { requireSync: true });
  protected readonly m = computed(() => this.dir.member(this.slug()));
  /** demande de connexion envoyée : l'état vient du réseau (visible aussi dans Mon réseau et les notifications) */
  protected readonly requested = computed(() => { const p = this.m(); return !!p && this.net.isRequested(p.name); });

  constructor() {
    // membre inconnu : page 404
    if (!this.dir.member(this.slug())) void this.router.navigate(['/erreur', '404'], { skipLocationChange: true });
  }

  protected readonly isContact = computed(() => this.net.contacts().some((c) => slugify(c.name) === this.slug()));
  protected readonly invitation = computed(() => this.net.invitations().find((i) => slugify(i.name) === this.slug()));

  protected connect(): void {
    const p = this.m();
    if (p) this.net.request({ initials: p.initials, name: p.name, role: p.headline, mutual: p.mutual, email: p.email });
  }
  protected accept(): void { const i = this.invitation(); if (i) this.net.accept(i.id); }
  /** ouvre la discussion existante avec ce membre, sinon la messagerie */
  protected message(): void {
    const name = this.m()?.name;
    const c = this.msgs.conversations().find((x) => !x.group && x.name === name);
    void this.router.navigate(['/messages'], { queryParams: c ? { c: c.id } : {} });
  }
}
