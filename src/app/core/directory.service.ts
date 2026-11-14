import { Injectable, inject } from '@angular/core';
import { slugify } from '../shared/slug';
import { NetworkService } from './network.service';
import { OffersService, Offer } from './offers.service';

export type RoleKind = 'student' | 'engineer' | 'entrepreneur' | 'other';

export interface Member {
  slug: string;
  /** compte du membre (pour lui envoyer une invitation ou un message) */
  email?: string;
  /** élève ingénieur, ingénieur, ingénieur entrepreneur ou autre (enseignant…) */
  roleKind: RoleKind;
  initials: string;
  name: string;
  headline: string;
  badge: string;
  place: string;
  mutual: number;
  about: string;
  score: number;
  skills: string[];
  projects: { title: string; tech: string; score: number }[];
  solutions: number;
}

export interface CompanyPage {
  slug: string;
  name: string;
  initials: string;
  line: string;
  verified: string;
  followers: string;
  about: string;
  challenges: number;
  posts: { when: string; text: string }[];
  offers: Offer[];
}


/** pages entreprise connues (vide tant que l'API ne les fournit pas : elles viennent des pages créées par les employeurs) */
const COMPANIES: Record<string, { line: string; verified: string; followers: string; about: string; challenges: number }> = {};

const CITIES = ['Tunis', 'Sfax', 'Sousse', 'Ariana', 'Monastir', 'Bizerte', 'Nabeul'];
/** ville citée dans le titre (« … · Sfax »), vide si aucune */
const cityOf = (text: string) => CITIES.find((c) => text.includes(c)) ?? '';

/** Annuaire des membres et des pages entreprise (TODO : remplacer par l'API). */
@Injectable({ providedIn: 'root' })
export class DirectoryService {
  private readonly net = inject(NetworkService);
  private readonly offersSvc = inject(OffersService);

  member(slug: string | null): Member | null {
    if (!slug) return null;
    const all = [...this.net.invitations(), ...this.net.contacts(), ...this.net.suggestions()];
    const p = all.find((x) => slugify(x.name) === slug);
    if (!p) return null;

    const lower = p.role.toLowerCase();
    const student = /élève|etudiant|étudiant/.test(lower);
    const roleKind: RoleKind = student ? 'student' : /entrepreneur/.test(lower) ? 'entrepreneur' : /enseignant|^dr\./.test(lower) ? 'other' : 'engineer';
    // TODO : l'API fournit la présentation, le score, les compétences, les projets validés et les solutions du membre ;
    // un membre sans activité reste à zéro (rien n'est inventé)
    return {
      slug, email: p.email, roleKind, initials: p.initials, name: p.name,
      headline: p.role,
      badge: student ? 'Étudiant vérifié' : /entrepreneur/.test(lower) ? 'Entrepreneur vérifié' : 'Ingénieur vérifié',
      place: cityOf(p.role), mutual: p.mutual,
      about: '', score: 0, skills: [], projects: [], solutions: 0,
    };
  }

  /** tous les membres connus (contacts, invitations, suggestions…), sans doublon : la recherche s'appuie dessus */
  members(): Member[] {
    const seen = new Set<string>();
    const names = [...this.net.invitations(), ...this.net.contacts(), ...this.net.suggestions()].map((p) => p.name);
    return names.flatMap((n) => {
      const slug = slugify(n);
      if (seen.has(slug)) return [];
      seen.add(slug);
      const m = this.member(slug);
      return m ? [m] : [];
    });
  }

  /** toutes les pages entreprise et écoles */
  companies(): CompanyPage[] {
    return Object.keys(COMPANIES).flatMap((n) => { const c = this.company(slugify(n)); return c ? [c] : []; });
  }

  company(slug: string | null): CompanyPage | null {
    const name = Object.keys(COMPANIES).find((n) => slugify(n) === slug);
    if (!name) return null;
    const c = COMPANIES[name];
    return {
      slug: slug!, name, initials: initialsOf(name), line: c.line, verified: c.verified, followers: c.followers, about: c.about, challenges: c.challenges,
      offers: this.offersSvc.offers.filter((o) => o.company === name),
      posts: [],
    };
  }
}

function initialsOf(name: string): string {
  const w = name.replace(/[.’']/g, ' ').split(/\s+/).filter(Boolean);
  return (w.length > 1 ? w[0][0] + w[w.length - 1][0] : w[0].slice(0, 2)).toUpperCase();
}
