import { Injectable, inject, signal } from '@angular/core';
import type { MyPost } from './posts.service';
import { ProfileService } from './profile.service';
import { currentEmail } from './storage';
import { ROLE_LABEL, UserService } from './user.service';
import { RemoteEventBody, RemotePost, RemoteUser, addPost, deliver, readPosts, readUsers, takeMailbox } from './remote-store';

/**
 * Passerelle vers les autres comptes : envoyer une invitation / un message, publier pour mes contacts,
 * lister les membres inscrits. Aujourd'hui elle lit et écrit dans le stockage partagé du navigateur (remote-store.ts) ;
 * avec Supabase, seules ces méthodes changent : les écrans et les autres services restent identiques.
 */
@Injectable({ providedIn: 'root' })
export class RemoteService {
  private readonly profile = inject(ProfileService);
  private readonly user = inject(UserService);

  /** membres inscrits (moi compris : voir `others`) */
  readonly users = signal<RemoteUser[]>(readUsers());
  /** publications de tous les membres (le fil ne garde que celles de mes contacts) */
  readonly posts = signal<RemotePost[]>(readPosts());

  /** moi, tel que les autres me voient ; null sans session ou sans nom */
  me(): RemoteUser | null {
    const email = currentEmail();
    const name = this.profile.info().name;
    if (!email || !name) return null;
    return { email, name, initials: this.profile.initials(), role: this.profile.info().role || ROLE_LABEL[this.user.role()] };
  }

  /** les autres membres (sans moi) */
  others(): RemoteUser[] {
    const me = currentEmail();
    return this.users().filter((u) => u.email !== me);
  }

  /** relit l'annuaire et les publications communes */
  refresh(): void {
    this.users.set(readUsers());
    this.posts.set(readPosts());
  }

  /** TODO : API — envoie un événement à UN membre (il le reçoit dans sa propre session) */
  send(to: string | undefined, body: RemoteEventBody): void {
    const me = this.me();
    if (!me || !to || to === me.email) return;
    deliver(to, { ...body, from: me, at: Date.now() });
  }

  /** TODO : API — publie pour mes contacts */
  publish(post: MyPost): void {
    const me = this.me();
    if (!me) return;
    this.posts.set(addPost({ ...post, author: me }));
  }

  /** événements reçus depuis la dernière fois */
  take(): ReturnType<typeof takeMailbox> {
    const email = currentEmail();
    return email ? takeMailbox(email) : [];
  }
}
