import { Location } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { ChallengesService } from '../core/challenges.service';
import { DirectoryService, RoleKind } from '../core/directory.service';
import { FeedService } from '../core/feed.service';
import { MessagesService } from '../core/messages.service';
import { NetworkService } from '../core/network.service';
import { OffersService } from '../core/offers.service';
import { PostsService, ago } from '../core/posts.service';
import { ProfileService } from '../core/profile.service';
import { ReactionsService, plural } from '../core/reactions.service';
import { Icon } from '../shared/icon';
import { slugify } from '../shared/slug';
import { RippleDirective } from '../shared/ripple.directive';

type Cat = 'person' | 'offer' | 'challenge' | 'page' | 'post';

/** critères de filtre : chacun lit un champ de Result.f ; chaque onglet n'affiche que les siens */
type FilterKey = 'role' | 'loc' | 'offerType' | 'mode' | 'domain' | 'sector' | 'author';

interface Result {
  /** clé unique (catégorie + identifiant réel) */
  key: string;
  cat: Cat;
  title: string;
  sub: string;
  /** texte parcouru par la recherche (en plus du titre et du sous-titre) */
  text: string;
  badge: string;
  action: string;
  link?: string;
  /** paramètres de l'adresse (ex. { post: 'post-1' } ouvre la publication dans le fil) */
  query?: Record<string, string>;
  /** personnes : score de confiance affiché à côté du nom */
  score?: number;
  /** personnes : de quoi envoyer une demande de connexion */
  who?: { initials: string; name: string; role: string; mutual: number; email?: string };
  /** valeurs servant aux filtres */
  f: Partial<Record<FilterKey, string>>;
}

/** relation avec une personne : détermine le bouton affiché */
type Relation = 'contact' | 'invited' | 'sent' | 'none';

const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const ROLE_NAME: Record<RoleKind, string> = { student: 'Élève ingénieur', engineer: 'Ingénieur', entrepreneur: 'Ingénieur entrepreneur', other: 'Autre' };
const ROLE_ORDER = Object.values(ROLE_NAME);

@Component({
  selector: 'app-search',
  imports: [RouterLink, RippleDirective, Icon],
  templateUrl: './search.html',
  styleUrls: ['../account/account-shared.css', './search.css'],
})
export class Search {
  protected readonly slug = slugify;
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly net = inject(NetworkService);
  private readonly dir = inject(DirectoryService);
  private readonly offersSvc = inject(OffersService);
  private readonly challengesSvc = inject(ChallengesService);
  private readonly feedSvc = inject(FeedService);
  private readonly posts = inject(PostsService);
  private readonly profile = inject(ProfileService);
  private readonly reactions = inject(ReactionsService);
  private readonly msgs = inject(MessagesService);

  /** vrai si l'on est arrivé ici depuis une autre page de l'application (sinon « retour » quitterait le site) */
  private readonly cameFromApp = !!this.router.currentNavigation()?.previousNavigation;

  protected readonly tabs: { id: Cat; label: string }[] = [
    { id: 'person', label: 'Personnes' },
    { id: 'offer', label: 'Offres' },
    { id: 'challenge', label: 'Défis' },
    { id: 'page', label: 'Pages' },
    { id: 'post', label: 'Publications' },
  ];

  /** filtres propres à chaque onglet : uniquement des critères qui existent vraiment pour ces résultats */
  private readonly groups: Record<Cat, { key: FilterKey; label: string }[]> = {
    person: [{ key: 'role', label: 'Rôle' }, { key: 'loc', label: 'Localisation' }],
    offer: [{ key: 'offerType', label: 'Type d’offre' }, { key: 'mode', label: 'Mode de travail' }, { key: 'loc', label: 'Ville' }],
    challenge: [{ key: 'domain', label: 'Domaine' }],
    page: [{ key: 'sector', label: 'Secteur' }, { key: 'loc', label: 'Localisation' }],
    post: [{ key: 'author', label: 'Publié par' }],
  };

  /**
   * Tout ce qui peut être trouvé, lu dans les mêmes services que le reste de l'application :
   * les liens ouvrent donc toujours la vraie page (profil, offre, défi, page, publication).
   * TODO : remplacer par l'appel API de recherche (filtres et pagination côté serveur).
   */
  private readonly all = computed<Result[]>(() => {
    const person = this.dir.members().map<Result>((m) => ({
      key: `person-${m.slug}`, cat: 'person', title: m.name, badge: m.initials, action: 'Se connecter', score: m.score,
      sub: m.headline.includes(m.place) ? m.headline : `${m.headline} · ${m.place}`,
      text: `${m.skills.join(' ')} ${m.about}`,
      who: { initials: m.initials, name: m.name, role: m.headline, mutual: m.mutual, email: m.email },
      f: { role: ROLE_NAME[m.roleKind], loc: m.place },
    }));

    const offer = this.offersSvc.offers.map<Result>((o) => ({
      key: `offer-${o.id}`, cat: 'offer', title: `${o.title} · ${o.kind}`, badge: 'O', action: 'Voir l’offre', link: `/offres/${o.id}`,
      sub: `${o.company} · ${o.place} · ${o.duration}`,
      text: `${o.headline} ${o.tags.join(' ')} ${o.description}`,
      // une offre en télétravail n'a pas de ville : elle n'apparaît pas quand on filtre sur une ville
      f: { offerType: o.kind, mode: o.mode, loc: o.mode === 'Télétravail' ? undefined : o.place },
    }));

    const challenge = this.challengesSvc.all().map<Result>((c) => ({
      key: `challenge-${c.id}`, cat: 'challenge', title: c.title, badge: 'D', action: 'Voir le défi', link: `/defis/${c.id}`,
      sub: `${c.domain} · ${c.author.name} · ${plural(this.challengesSvc.count(c), 'solution', 'solutions')}`,
      text: `${c.text} ${c.long} ${c.skills.join(' ')}`,
      f: { domain: c.domain },
    }));

    const page = this.dir.companies().map<Result>((c) => {
      const [sector, city] = c.line.split(' · ');
      return {
        key: `page-${c.slug}`, cat: 'page', title: c.name, badge: c.initials, action: 'Voir la page',
        sub: `${sector} · ${city} · ${plural(c.offers.length, 'offre', 'offres')}`,
        text: c.about,
        f: { sector, loc: city },
      };
    });

    const me = this.profile.info().name;
    const mine = this.posts.items().map<Result>((p) => ({
      key: `post-${p.id}`, cat: 'post', title: p.title ?? (p.text.slice(0, 70) || p.label), badge: 'P', action: 'Ouvrir', link: '/fil', query: { post: p.id },
      sub: `${me} · ${ago(p.at)}`, text: `${p.text} ${p.label}`, f: { author: 'Membre' },
    }));
    const others = this.feedSvc.posts.map<Result>((p) => ({
      key: `post-${p.id}`, cat: 'post', title: p.title, badge: 'P', action: 'Ouvrir', link: '/fil', query: { post: p.id },
      sub: `${p.author.mine ? me : p.author.name} · ${p.when} · ${plural(this.reactions.likes(p.id, p.baseLikes), 'réaction', 'réactions')}`,
      text: p.text,
      f: { author: p.author.link.startsWith('/page/') ? 'Page' : 'Membre' },
    }));

    return [...person, ...offer, ...challenge, ...page, ...mine, ...others];
  });

  protected readonly q = toSignal(this.route.queryParamMap.pipe(map((p) => (p.get('q') ?? '').trim())), { initialValue: '' });
  protected readonly chosen = signal<Cat | null>(null);

  /** valeurs cochées, par onglet et par critère (« person:role ») ; aucune = pas de filtre */
  protected readonly selected = signal<Record<string, string[]>>({});
  private readonly id = (cat: Cat, key: FilterKey) => `${cat}:${key}`;

  /** résultats de la recherche + filtres de leur onglet */
  private readonly matched = computed(() => {
    const words = norm(this.q()).split(/\s+/).filter(Boolean);
    const sel = this.selected();
    return this.all().filter((r) => {
      if (!words.every((w) => norm(`${r.title} ${r.sub} ${r.text}`).includes(w))) return false;
      return this.groups[r.cat].every((g) => {
        const chosen = sel[this.id(r.cat, g.key)] ?? [];
        return !chosen.length || chosen.includes(r.f[g.key] ?? '');
      });
    });
  });

  protected readonly total = computed(() => this.matched().length);
  protected readonly counts = computed(() => {
    const m = this.matched();
    return Object.fromEntries(this.tabs.map((t) => [t.id, m.filter((r) => r.cat === t.id).length])) as Record<Cat, number>;
  });
  /** onglet affiché : celui choisi, sinon le premier qui contient des résultats */
  protected readonly cat = computed<Cat>(() => this.chosen() ?? this.tabs.find((t) => this.counts()[t.id] > 0)?.id ?? 'person');
  protected readonly results = computed(() => this.matched().filter((r) => r.cat === this.cat()));

  /** filtres de l'onglet ouvert ; les valeurs proposées sont celles qui existent dans les données */
  protected readonly filters = computed(() => {
    const cat = this.cat();
    const items = this.all().filter((r) => r.cat === cat);
    return this.groups[cat]
      .map((g) => {
        const values = [...new Set(items.map((r) => r.f[g.key]).filter((v): v is string => !!v))];
        if (g.key === 'role') values.sort((a, b) => ROLE_ORDER.indexOf(a) - ROLE_ORDER.indexOf(b));
        return { ...g, id: this.id(cat, g.key), options: values };
      })
      // un critère à une seule valeur ne filtre rien : on ne l'affiche pas
      .filter((g) => g.options.length > 1);
  });
  protected readonly hasFilters = computed(() => this.filters().some((g) => (this.selected()[g.id] ?? []).length > 0));

  protected isOn(id: string, value: string): boolean { return (this.selected()[id] ?? []).includes(value); }
  protected toggle(id: string, value: string): void {
    this.selected.update((s) => {
      const list = s[id] ?? [];
      return { ...s, [id]: list.includes(value) ? list.filter((x) => x !== value) : [...list, value] };
    });
  }
  protected clearFilters(): void {
    this.selected.update((s) => {
      const next = { ...s };
      for (const g of this.filters()) delete next[g.id];
      return next;
    });
  }

  /** retour à la page d'où l'on vient ; si la recherche a été ouverte directement, retour au fil */
  protected back(): void {
    if (this.cameFromApp) this.location.back();
    else void this.router.navigateByUrl('/fil');
  }

  // ----- personnes : le bouton dépend de la relation (contact, invitation reçue, demande envoyée) -----
  protected relation(r: Result): Relation {
    const name = r.title;
    if (this.net.contacts().some((c) => c.name === name)) return 'contact';
    if (this.net.invitations().some((i) => i.name === name)) return 'invited';
    if (this.net.isRequested(name)) return 'sent';
    return 'none';
  }

  protected connect(r: Result): void { if (r.who) this.net.request(r.who); }

  protected accept(r: Result): void {
    const inv = this.net.invitations().find((i) => i.name === r.title);
    if (inv) this.net.accept(inv.id);
  }

  /** ouvre la discussion existante avec ce contact, sinon la messagerie */
  protected message(r: Result): void {
    const c = this.msgs.conversations().find((x) => !x.group && x.name === r.title);
    void this.router.navigate(['/messages'], { queryParams: c ? { c: c.id } : {} });
  }
}
