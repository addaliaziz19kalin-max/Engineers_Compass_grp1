import { Injectable, inject } from '@angular/core';
import { slugify } from '../shared/slug';
import { NetworkService } from './network.service';
import { ago } from './posts.service';
import { RemotePost } from './remote-store';
import { RemoteService } from './remote.service';

export interface FeedPost {
  id: string;
  author: { name: string; initials: string; role: string; link: string; mine?: boolean };
  when: string;
  /** titre court : sert à enregistrer la publication, la repartager ou l'envoyer dans un message */
  title: string;
  text: string;
  /** pastille sur l'image d'un projet validé */
  chip?: string;
  /** élément mis en avant sous le texte (défi, offre…) */
  ref?: { title: string; sub: string; link: string };
  /** réactions déjà reçues au départ */
  baseLikes: number;
  /** commentaires d'exemple affichés au départ */
  seed: number;
}

/** publication d'un membre → carte du fil */
function toFeed(p: RemotePost): FeedPost {
  const short = p.text.length > 70 ? `${p.text.slice(0, 67)}…` : p.text;
  return {
    id: `rp:${p.author.email}:${p.id}`,
    author: { name: p.author.name, initials: p.author.initials, role: p.author.role, link: `/membre/${slugify(p.author.name)}` },
    when: ago(p.at),
    title: p.title ?? (short || p.label),
    text: p.text || p.label,
    ref: p.title ? { title: p.title, sub: p.sub ?? '', link: p.link ?? '/fil' } : undefined,
    baseLikes: 0,
    seed: 0,
  };
}

/**
 * Publications de mes contacts (comme les amis sur Facebook), affichées sous les miennes dans le fil.
 * Un compte sans contact a un fil vide : le contenu vient uniquement de ce que publient les membres.
 * Chacune a ses propres « J'aime », commentaires, partage et enregistrement.
 * TODO : remplacer par l'API (fil personnalisé, pagination).
 */
@Injectable({ providedIn: 'root' })
export class FeedService {
  private readonly remote = inject(RemoteService);
  private readonly net = inject(NetworkService);

  /** lit des signaux : le fil se met à jour tout seul (nouvelle publication, nouveau contact) */
  get posts(): FeedPost[] {
    const friends = new Set(this.net.contacts().map((c) => c.email).filter((e): e is string => !!e));
    return this.remote.posts().filter((p) => friends.has(p.author.email)).map(toFeed);
  }
}
