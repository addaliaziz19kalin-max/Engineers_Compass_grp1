import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from './core/auth.service';
import { ProfileService } from './core/profile.service';
import { PostsService, PASS_SCORE } from './core/posts.service';
import { ReactionsService } from './core/reactions.service';
import { FeedService } from './core/feed.service';
import { MessagesService } from './core/messages.service';
import { NotificationsService } from './core/notifications.service';
import { NetworkService } from './core/network.service';
import { DirectoryService } from './core/directory.service';
import { OffersService } from './core/offers.service';
import { ChallengesService } from './core/challenges.service';
import { MyPageService } from './core/my-page.service';
import { SavedService } from './core/saved.service';
import { SettingsService } from './core/settings.service';
import { SyncService } from './core/sync.service';
import { SupabaseService } from './core/supabase.service';
import { setCurrentEmail } from './core/storage';
import { FakeSupabaseService } from './testing/fake-supabase';

/** « recharger la page » : tous les services sont recréés et relisent le stockage du compte connecté */
function reload() {
  TestBed.resetTestingModule();
  // faux Supabase (en mémoire) : la session qu'il garde est relue, comme au rechargement d'une vraie page
  const fake = new FakeSupabaseService();
  TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: SupabaseService, useValue: fake }] });
  const auth = TestBed.inject(AuthService);
  const saved = fake.savedSession();
  setCurrentEmail(saved?.email ?? '');
  auth.session.set(saved);
  return {
    auth, profile: TestBed.inject(ProfileService), posts: TestBed.inject(PostsService),
    rx: TestBed.inject(ReactionsService), feed: TestBed.inject(FeedService), msgs: TestBed.inject(MessagesService),
    notifs: TestBed.inject(NotificationsService), net: TestBed.inject(NetworkService), dir: TestBed.inject(DirectoryService),
    offers: TestBed.inject(OffersService), ch: TestBed.inject(ChallengesService), page: TestBed.inject(MyPageService),
    saved: TestBed.inject(SavedService), settings: TestBed.inject(SettingsService), sync: TestBed.inject(SyncService),
  };
}

/** change de compte sur le même navigateur : fermer la session, se connecter, « recharger la page » */
async function switchTo(current: ReturnType<typeof reload>, email: string) {
  current.auth.logout();
  expect(await reload().auth.login(email, 'Motdepasse1', true)).toBe(true);
  const s = reload();
  s.sync.pull(); // ce que fait AccountLayout au chargement du compte
  return s;
}

async function signup(email: string, role: 'student' | 'employer', name: string) {
  let s = reload();
  expect(await s.auth.register(email, 'Motdepasse1', role)).toBe(true);
  s.profile.init(name, role);
  return reload(); // comme après l'inscription : rechargement complet
}

describe('parcours d’un compte neuf', () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });

  it('connexion : erreur si le compte n’existe pas ou si le mot de passe est faux', async () => {
    const s = reload();
    expect(s.auth.exists('inconnu@ec.tn')).toBe(false);
    expect(await s.auth.login('inconnu@ec.tn', 'x', true)).toBe(false);
    await s.auth.register('Ali@ec.tn', 'Motdepasse1', 'student');
    s.auth.logout();
    expect(s.auth.isLoggedIn()).toBe(false);
    expect(await s.auth.register('ali@ec.tn', 'autre', 'student')).toBe(false); // e-mail déjà pris
    expect(await s.auth.login('ali@ec.tn', 'mauvais', true)).toBe(false);
    expect(await s.auth.login(' ALI@ec.tn ', 'Motdepasse1', true)).toBe(true);
  });

  it('un compte neuf est vraiment vide, avec le nom saisi à l’inscription', async () => {
    const s = await signup('neuf@ec.tn', 'student', 'Amine Trabelsi');
    expect(s.profile.info().name).toBe('Amine Trabelsi');
    expect(s.profile.initials()).toBe('AT');
    expect(s.profile.entries()).toEqual([]);
    expect(s.posts.items()).toEqual([]);
    expect(s.feed.posts).toEqual([]);
    expect(s.msgs.conversations()).toEqual([]);
    expect(s.msgs.targets()).toEqual([]);
    expect(s.notifs.items()).toEqual([]);
    expect(s.notifs.unreadCount()).toBe(0);
    expect(s.net.contacts()).toEqual([]);
    expect(s.net.invitations()).toEqual([]);
    expect(s.net.suggestions()).toEqual([]);
    expect(s.net.sent()).toEqual([]);
    expect(s.net.pages()).toEqual([]);
    expect(s.dir.members()).toEqual([]);
    expect(s.dir.companies()).toEqual([]);
    expect(s.offers.offers).toEqual([]);
    expect(s.offers.applied()).toEqual([]);
    expect(s.ch.all()).toEqual([]);
    expect(s.ch.sent()).toEqual([]);
    expect(s.page.page()).toBeNull();
    expect(s.saved.items()).toEqual([]);
    expect(s.settings.sessions()).toEqual([]);
    expect(s.settings.email()).toBe('neuf@ec.tn');
  });

  it('publier, aimer, commenter : tout fonctionne et reste après rechargement', async () => {
    let s = await signup('pub@ec.tn', 'student', 'Sana Gharbi');
    const id = s.posts.publish({ kind: 'post', label: 'a publié un article', text: 'Mon premier article' });
    expect(s.posts.items()).toHaveLength(1);

    s.rx.toggleLike(id);
    expect(s.rx.isLiked(id)).toBe(true);
    expect(s.rx.likes(id, 0)).toBe(1); // départ à zéro : seulement mon « J’aime »
    s.rx.add(id, 'Bravo');
    expect(s.rx.count(id)).toBe(1);
    expect(s.rx.comments(id)[0]).toMatchObject({ name: 'Sana Gharbi', text: 'Bravo', mine: true });

    s = reload();
    expect(s.posts.items()[0].text).toBe('Mon premier article');
    expect(s.rx.isLiked(id)).toBe(true);
    expect(s.rx.count(id)).toBe(1);
    s.rx.toggleLike(id);
    expect(s.rx.likes(id, 0)).toBe(0);
    s.rx.remove(id, s.rx.comments(id)[0].id);
    expect(s.rx.count(id)).toBe(0);
  });

  it('projet / certificat : publié seulement avec le score minimum', async () => {
    const s = await signup('test@ec.tn', 'student', 'Rim Jlassi');
    s.posts.stage({ type: 'Projet', topic: 'iot', text: 'Station météo LoRa' });
    expect(s.posts.completeTest(PASS_SCORE - 1)).toBeNull();
    expect(s.posts.items()).toHaveLength(0);
    expect(s.posts.staged()).not.toBeNull(); // reste en attente pour un nouvel essai
    expect(s.posts.completeTest(PASS_SCORE)).not.toBeNull();
    expect(s.posts.items()).toHaveLength(1);
    expect(s.posts.staged()).toBeNull();
  });

  it('brouillon : enregistré, retrouvé, supprimé', async () => {
    let s = await signup('brouillon@ec.tn', 'student', 'Hela Mrad');
    s.posts.saveDraft({ type: 'Projet', topic: 'web', text: 'à finir' });
    s = reload();
    expect(s.posts.draft()?.text).toBe('à finir');
    s.posts.clearDraft();
    s = reload();
    expect(s.posts.draft()).toBeNull();
  });

  it('réseau, messages, partage et notifications', async () => {
    let s = await signup('social@ec.tn', 'student', 'Yassine Bouaziz');

    // demande de connexion à un collègue (profil / recherche) → notification, une seule demande
    const colleague = { initials: 'LM', name: 'Lina Maalej', role: 'Élève ingénieur · Sfax', mutual: 0 };
    s.net.request(colleague);
    s.net.request(colleague);
    expect(s.net.sent()).toHaveLength(1);
    expect(s.net.isRequested('Lina Maalej')).toBe(true);
    expect(s.notifs.items()).toHaveLength(1);
    expect(s.notifs.unreadCount()).toBe(1);

    // message à quelqu'un qui n'est pas dans mes contacts → indésirables (Spam) chez lui
    const spamId = s.msgs.start({ initials: 'LM', name: 'Lina Maalej', role: 'Élève' }, 'Salut Lina', false)!;
    expect(s.msgs.conversations().find((c) => c.id === spamId)?.spam).toBe(true);
    expect(s.msgs.inbox()).toHaveLength(0);
    expect(s.msgs.start({ initials: 'LM', name: 'Lina Maalej', role: 'Élève' }, '', false)).toBeNull(); // message vide ignoré

    // un collègue accepte : il devient contact (invitation reçue → acceptée)
    const invitation = { id: 7, initials: 'KB', name: 'Karim Ben Salah', role: 'Ingénieur · Tunis', mutual: 2 };
    s.net.invitations.set([invitation]);
    s.net.accept(7);
    expect(s.net.contacts().map((c) => c.name)).toEqual(['Karim Ben Salah']);
    expect(s.net.invitations()).toEqual([]);

    // il apparaît dans les destinataires de partage ; le partage crée la conversation (normale, pas spam)
    const target = s.msgs.targets().find((t) => t.name === 'Karim Ben Salah')!;
    expect(target).toBeTruthy();
    const myPost = s.posts.publish({ kind: 'post', label: 'a publié un article', text: 'À lire' });
    const convId = s.msgs.share(target, 'Regarde ça', { title: 'À lire', sub: 'Yassine Bouaziz', link: '/fil', query: { post: myPost } })!;
    const conv = s.msgs.conversations().find((c) => c.id === convId)!;
    expect(conv.spam).toBeFalsy();
    expect(conv.messages[0].share?.query).toEqual({ post: myPost });
    expect(s.msgs.inbox().map((c) => c.id)).toContain(convId);

    // nouveau message dans la même conversation : elle remonte en tête
    s.msgs.send(convId, 'Tu as vu ?');
    expect(s.msgs.conversations()[0].id).toBe(convId);
    expect(s.msgs.conversations()[0].messages).toHaveLength(2);
    expect(s.msgs.preview(s.msgs.conversations()[0])).toBe('Vous : Tu as vu ?');

    // rechargement : tout est retrouvé
    s = reload();
    expect(s.msgs.conversations()).toHaveLength(2);
    expect(s.net.contacts()).toHaveLength(1);
    expect(s.net.sent()).toHaveLength(1);
    expect(s.notifs.items()).toHaveLength(1);
    expect(s.dir.member('karim-ben-salah')?.name).toBe('Karim Ben Salah');
    expect(s.dir.member('karim-ben-salah')?.score).toBe(0); // rien d'inventé
    expect(s.dir.member('inconnu')).toBeNull();
  });

  it('postuler à une offre et enregistrer : gardés après rechargement', async () => {
    let s = await signup('offre@ec.tn', 'student', 'Maya Hamdi');
    // une offre publiée par une entreprise (vient de l'API plus tard)
    s.offers.offers.push({ id: 'pfe-iot', title: 'PFE IoT', headline: 'PFE IoT', kind: 'PFE', company: 'Acme', duration: '6 mois', place: 'Sfax', mode: 'Présentiel', posted: 'à l’instant', candidates: 0, deadline: '', tags: [], description: '', requirements: [] });
    s.offers.apply('pfe-iot');
    s.offers.apply('pfe-iot');
    expect(s.offers.applied()).toEqual(['pfe-iot']);
    expect(s.saved.toggle({ id: 'post-1', kind: 'post', title: 'Titre', sub: 'Sous-titre', link: '/fil' })).toBe(true);

    s = reload();
    expect(s.offers.applied()).toEqual(['pfe-iot']);
    expect(s.saved.items()).toHaveLength(1);
    expect(s.saved.toggle({ id: 'post-1', kind: 'post', title: 'Titre', sub: 'Sous-titre', link: '/fil' })).toBe(false);
    expect(s.saved.items()).toEqual([]);
  });

  it('défis : proposer une solution prévient l’auteur et je suis prévenu', async () => {
    const s = await signup('defi@ec.tn', 'student', 'Omar Kaabi');
    (s.ch as unknown as { base: unknown[] }).base.push({
      id: 1, domain: 'Télécoms', title: 'Réseau maillé', text: 't', long: 'l', details: ['d'], goals: [], skills: [], progress: 0, solutions: 0,
      resources: [], author: { kind: 'company', name: 'Acme', link: '/page/acme' },
    });
    expect(s.ch.all()).toHaveLength(1);
    s.ch.propose(1, 'Ma solution', [], 'Omar Kaabi');
    s.ch.propose(1, 'Doublon', [], 'Omar Kaabi'); // une seule solution par défi
    expect(s.ch.sent()).toHaveLength(1);
    expect(s.ch.count(s.ch.find(1)!)).toBe(1);
    expect(s.notifs.outbox().map((n) => n.to)).toEqual(['Acme']);
    expect(s.notifs.items()).toHaveLength(1);
  });

  it('employeur : page, publication, offre et défi (le défi apparaît dans Défis)', async () => {
    let s = await signup('rh@ec.tn', 'employer', 'Nadia Chaabane');
    s.page.create({ name: 'Acme Telecom', sector: 'Télécommunications', city: 'Sfax', size: '10-50', about: 'À propos' }, false);
    expect(s.page.page()?.slug).toBe('acme-telecom');
    s.page.publish('post', '', 'Bienvenue');
    s.page.publish('offer', 'Stage IA', 'Description');
    s.page.publish('challenge', 'Défi capteurs', 'Concevoir un capteur');
    expect(s.page.publications()).toHaveLength(1);
    expect(s.page.offers()).toHaveLength(1);
    expect(s.page.challenges()).toHaveLength(1);
    expect(s.ch.all()[0]).toMatchObject({ title: 'Défi capteurs', mine: true, domain: 'Télécoms' });

    s = reload();
    expect(s.page.page()?.name).toBe('Acme Telecom');
    expect(s.ch.all()).toHaveLength(1);
    // auteur de son propre défi : pas de notification en proposant
    s.ch.propose(s.ch.all()[0].id, 'x', [], 'Nadia Chaabane');
    expect(s.notifs.outbox()).toEqual([]);
  });

  it('un étudiant ne peut pas créer de page entreprise', async () => {
    const s = await signup('etu@ec.tn', 'student', 'Ines Zouari');
    s.page.create({ name: 'Fausse page', sector: 'Autre', city: 'Tunis', size: '1-10', about: '' }, false);
    expect(s.page.page()).toBeNull();
  });

  it('deux comptes sur le même navigateur ne se mélangent pas', async () => {
    let s = await signup('un@ec.tn', 'student', 'Premier Compte');
    s.posts.publish({ kind: 'post', label: 'a publié un article', text: 'Privé au compte 1' });
    s.net.request({ initials: 'AB', name: 'Ab Cd', role: 'Élève', mutual: 0 });
    s.auth.logout();

    s = await signup('deux@ec.tn', 'student', 'Second Compte');
    expect(s.profile.info().name).toBe('Second Compte');
    expect(s.posts.items()).toEqual([]);
    expect(s.net.sent()).toEqual([]);
    expect(s.notifs.items()).toEqual([]);
    s.auth.logout();

    expect(await reload().auth.login('un@ec.tn', 'Motdepasse1', true)).toBe(true);
    s = reload();
    expect(s.profile.info().name).toBe('Premier Compte');
    expect(s.posts.items()).toHaveLength(1);
    expect(s.net.sent()).toHaveLength(1);
  });

  it('supprimer le compte efface aussi candidatures et enregistrés', async () => {
    const s = await signup('suppr@ec.tn', 'student', 'Zied Ayari');
    s.offers.apply('x');
    s.saved.toggle({ id: 'a', kind: 'post', title: 't', sub: 's', link: '/fil' });
    s.settings.eraseAll('suppr@ec.tn');
    const left = Object.keys(localStorage).filter((k) => k.endsWith(':suppr@ec.tn'));
    expect(left).toEqual([]);
  });
});

describe('deux comptes qui se parlent (A et B)', () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });

  it('invitation → acceptation → messages → publication partagée visible dans le fil', async () => {
    // A et B créent leur compte
    let a = await signup('a@ec.tn', 'student', 'Ali Ben Amor');
    a.auth.logout();
    let b = await signup('b@ec.tn', 'student', 'Bilel Chaabane');

    // B ne voit personne dans son fil ni dans ses contacts ; A est seulement une suggestion
    expect(b.net.contacts()).toEqual([]);
    expect(b.feed.posts).toEqual([]);
    expect(b.net.suggestions().map((p) => p.name)).toEqual(['Ali Ben Amor']);

    // A trouve B (suggestions / recherche) et lui envoie une invitation
    a = await switchTo(b, 'a@ec.tn');
    const bilel = a.dir.members().find((m) => m.name === 'Bilel Chaabane')!;
    expect(bilel.email).toBe('b@ec.tn');
    a.net.request({ initials: bilel.initials, name: bilel.name, role: bilel.headline, mutual: 0, email: bilel.email });
    expect(a.net.sent()).toHaveLength(1);

    // B reçoit l'invitation + une notification, puis accepte
    b = await switchTo(a, 'b@ec.tn');
    expect(b.net.invitations().map((i) => i.name)).toEqual(['Ali Ben Amor']);
    expect(b.notifs.items().map((n) => n.text)).toEqual(['Ali Ben Amor vous a envoyé une invitation']);
    expect(b.notifs.unreadCount()).toBe(1);
    b.net.accept(b.net.invitations()[0].id);
    expect(b.net.contacts().map((c) => c.name)).toEqual(['Ali Ben Amor']);
    expect(b.net.invitations()).toEqual([]);

    // A est prévenu : B est maintenant son contact (la demande en attente disparaît)
    a = await switchTo(b, 'a@ec.tn');
    expect(a.net.contacts().map((c) => c.name)).toEqual(['Bilel Chaabane']);
    expect(a.net.sent()).toEqual([]);
    expect(a.notifs.items().some((n) => n.text === 'Bilel Chaabane a accepté votre invitation')).toBe(true);

    // A écrit à B
    expect(a.msgs.start(a.net.contacts()[0], 'Salut Bilel', true)).not.toBeNull();

    // B reçoit le message (non lu, dans sa boîte normale) + notification, puis répond
    b = await switchTo(a, 'b@ec.tn');
    const conv = b.msgs.inbox()[0];
    expect(conv).toMatchObject({ name: 'Ali Ben Amor', unread: 1, spam: false });
    expect(conv.messages).toMatchObject([{ from: 'them', text: 'Salut Bilel' }]);
    expect(b.msgs.unreadTotal()).toBe(1);
    expect(b.notifs.items()[0]).toMatchObject({ text: 'Nouveau message de Ali Ben Amor', cat: 'message', unread: true });
    b.msgs.markRead(conv.id);
    b.msgs.send(conv.id, 'Salut Ali');

    // B publie / partage : A le verra dans son accueil
    b.posts.publish({ kind: 'shared', label: 'a partagé une publication', text: 'Super projet', title: 'Station LoRa', sub: 'Publication · Public', link: '/fil' });

    // A reçoit la réponse + notification, et voit la publication de B dans son fil
    a = await switchTo(b, 'a@ec.tn');
    expect(a.msgs.inbox()[0].messages.map((m) => m.text)).toEqual(['Salut Bilel', 'Salut Ali']);
    expect(a.msgs.unreadTotal()).toBe(1);
    expect(a.notifs.items()[0].text).toBe('Nouveau message de Bilel Chaabane');
    expect(a.feed.posts).toHaveLength(1);
    expect(a.feed.posts[0]).toMatchObject({ text: 'Super projet', title: 'Station LoRa', author: { name: 'Bilel Chaabane' } });

    // rechargement : tout est retrouvé, et rien n'est rejoué (les événements ne sont lus qu'une fois)
    a = reload(); a.sync.pull();
    expect(a.notifs.items().filter((n) => n.cat === 'message')).toHaveLength(1);
    expect(a.feed.posts).toHaveLength(1);
  });

  it('un membre qui n’est pas mon contact ne voit pas mes publications ; son message va en Spam', async () => {
    let a = await signup('a@ec.tn', 'student', 'Ali Ben Amor');
    a.posts.publish({ kind: 'post', label: 'a publié un article', text: 'Privé au réseau' });
    a.auth.logout();
    const c = await signup('c@ec.tn', 'student', 'Chedi Dridi');
    expect(c.feed.posts).toEqual([]); // pas contact de A

    const person = c.net.suggestions().find((p) => p.name === 'Ali Ben Amor')!;
    c.msgs.start(person, 'Bonjour', false);
    a = await switchTo(c, 'a@ec.tn');
    expect(a.msgs.inbox()).toHaveLength(0);
    expect(a.msgs.conversations()[0]).toMatchObject({ name: 'Chedi Dridi', spam: true, unread: 1 });
  });

  it('annuler une invitation la retire chez le destinataire', async () => {
    let a = await signup('a@ec.tn', 'student', 'Ali Ben Amor');
    a.auth.logout();
    let b = await signup('b@ec.tn', 'student', 'Bilel Chaabane');
    a = await switchTo(b, 'a@ec.tn');
    a.net.request(a.net.suggestions()[0]);
    a.net.cancelRequest('Bilel Chaabane');
    b = await switchTo(a, 'b@ec.tn');
    expect(b.net.invitations()).toEqual([]);
  });
});
