import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { ago } from '../core/posts.service';
import { ProfileService } from '../core/profile.service';
import { SettingsService } from '../core/settings.service';
import { ThemeService } from '../core/theme.service';
import { UserService } from '../core/user.service';
import { Icon, IconName } from '../shared/icon';
import { RippleDirective } from '../shared/ripple.directive';

type Row =
  | { id: string; type: 'select'; title: string; sub: string; options: string[]; value: string }
  | { id: string; type: 'toggle'; title: string; sub: string; value: boolean }
  | { id: string; type: 'badge'; title: string; sub: string; text: string }
  | { id: string; type: 'button'; title: string; sub: string; label: string; danger?: boolean };

interface Group { title: string; rows: Row[] }
interface Section { id: string; label: string; icon: IconName; title: string; sub: string; groups: Group[] }

/** Paramètres du compte : Compte, Confidentialité, Notifications, Langue et thème, Sécurité, Assistance. */
@Component({
  selector: 'app-settings',
  imports: [Icon, RippleDirective, RouterLink],
  templateUrl: './settings.html',
  styleUrls: ['../account/account-shared.css', './settings.css'],
})
export class Settings {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly theme = inject(ThemeService);
  private readonly settings = inject(SettingsService);
  private readonly profile = inject(ProfileService);
  private readonly user = inject(UserService);
  private readonly auth = inject(AuthService);

  /** lignes qui ouvrent un petit formulaire sous elles (e-mail, mot de passe, suppression) */
  protected readonly open = signal<string | null>(null);
  protected readonly formError = signal('');

  // TODO : charger / enregistrer ces valeurs via l'API (voir SettingsService)
  /** les informations du compte (nom, e-mail, rôle, appareils) viennent des vrais services, pas de textes fixes */
  protected readonly sections = computed<Section[]>(() => [
    { id: 'compte', label: 'Compte', icon: 'user', title: 'Paramètres · compte', sub: 'Vos informations personnelles.', groups: [
      { title: 'Informations', rows: [
        { id: 'name', type: 'button', title: 'Nom et prénom', sub: this.profile.info().name, label: 'Modifier' },
        { id: 'email', type: 'button', title: 'Adresse e-mail', sub: this.settings.email() || 'Non renseignée', label: 'Modifier' },
        { id: 'role', type: 'badge', title: 'Rôle vérifié', sub: this.user.roleLabel(), text: 'Vérifié' },
      ] },
    ] },
    { id: 'confidentialite', label: 'Confidentialité', icon: 'lock', title: 'Paramètres · confidentialité', sub: 'Contrôlez qui voit vos informations et comment elles sont utilisées.', groups: [
      { title: 'Profil et contacts', rows: [
        { id: 'vis', type: 'select', title: 'Visibilité du profil', sub: 'Qui peut voir votre profil complet', options: ['Tous les membres', 'Mes contacts', 'Moi uniquement'], value: 'Tous les membres' },
        { id: 'msg', type: 'select', title: 'Qui peut m’envoyer un message', sub: 'Contacts, membres vérifiés ou personne', options: ['Tous les membres', 'Membres vérifiés', 'Mes contacts', 'Personne'], value: 'Mes contacts' },
        { id: 'contacts', type: 'select', title: 'Qui peut voir mes contacts', sub: 'Liste de votre réseau', options: ['Tous les membres', 'Mes contacts', 'Moi uniquement'], value: 'Moi uniquement' },
        { id: 'score', type: 'toggle', title: 'Score de confiance visible', sub: 'Afficher le score sur votre profil', value: true },
      ] },
      { title: 'Données et vérification', rows: [
        { id: 'proj', type: 'toggle', title: 'Projets et certificats validés', sub: 'Visibles sur votre profil public', value: true },
        { id: 'proofs', type: 'badge', title: 'Preuves de rôle (carte, diplôme, contrat)', sub: 'Jamais visibles par les autres membres, stockées de façon sécurisée', text: 'Privé' },
        { id: 'ia', type: 'toggle', title: 'Apparaître dans les recommandations IA', sub: 'Suggestions de contacts, offres et défis', value: true },
      ] },
      { title: 'Mes données', rows: [
        { id: 'export', type: 'button', title: 'Télécharger mes données', sub: 'Export de votre profil et de vos publications', label: 'Demander' },
        { id: 'delete', type: 'button', title: 'Supprimer mon compte', sub: 'Action définitive', label: 'Supprimer', danger: true },
      ] },
    ] },
    { id: 'notifications', label: 'Notifications', icon: 'bell', title: 'Paramètres · notifications', sub: 'Choisissez ce pour quoi vous êtes prévenu.', groups: [
      { title: 'Dans l’application', rows: [
        { id: 'n-ch', type: 'toggle', title: 'Défis et solutions', sub: 'Nouveaux défis, réponses à vos solutions', value: true },
        { id: 'n-of', type: 'toggle', title: 'Offres et candidatures', sub: 'Entretiens, changements de statut', value: true },
        { id: 'n-ve', type: 'toggle', title: 'Vérification', sub: 'Résultat de vos preuves et tests', value: true },
        { id: 'n-ne', type: 'toggle', title: 'Réseau', sub: 'Invitations et nouveaux contacts', value: true },
      ] },
      { title: 'Par e-mail', rows: [
        { id: 'n-mail', type: 'select', title: 'Résumé par e-mail', sub: 'Un récapitulatif de votre activité', options: ['Chaque jour', 'Chaque semaine', 'Jamais'], value: 'Chaque semaine' },
      ] },
    ] },
    { id: 'langue', label: 'Langue et thème', icon: 'globe', title: 'Paramètres · langue et thème', sub: 'Personnalisez l’affichage.', groups: [
      { title: 'Affichage', rows: [
        { id: 'lang', type: 'select', title: 'Langue', sub: 'Langue de l’interface', options: ['Français', 'English', 'العربية'], value: 'Français' },
        { id: 'dark', type: 'toggle', title: 'Mode sombre', sub: 'Appliqué immédiatement', value: false },
      ] },
    ] },
    { id: 'securite', label: 'Sécurité', icon: 'shield', title: 'Paramètres · sécurité', sub: 'Protégez l’accès à votre compte.', groups: [
      { title: 'Connexion', rows: [
        { id: 'pwd', type: 'button', title: 'Mot de passe', sub: this.passwordSub(), label: 'Changer' },
        { id: '2fa', type: 'toggle', title: 'Vérification en deux étapes', sub: 'Un code supplémentaire à chaque connexion', value: false },
        { id: 'alert', type: 'toggle', title: 'Alertes de connexion', sub: 'Être prévenu d’une connexion depuis un nouvel appareil', value: true },
      ] },
      { title: 'Appareils', rows: this.deviceRows() },
    ] },
    { id: 'assistance', label: 'Assistance', icon: 'help', title: 'Paramètres · assistance', sub: 'Besoin d’un coup de main ?', groups: [
      { title: 'Aide', rows: [
        { id: 'a-help', type: 'button', title: 'Centre d’aide', sub: 'Guides et questions fréquentes', label: 'Ouvrir' },
        { id: 'a-rep', type: 'button', title: 'Signaler un problème', sub: 'Bug, contenu suspect, sécurité', label: 'Signaler' },
      ] },
    ] },
  ]);

  protected readonly id = toSignal(this.route.paramMap.pipe(map((p) => p.get('section') ?? 'confidentialite')), { requireSync: true });
  protected readonly section = computed(() => this.sections().find((s) => s.id === this.id()) ?? this.sections()[1]);

  /** valeurs modifiées dans la page (par id de ligne), pas encore enregistrées */
  private readonly edits = signal<Record<string, string | boolean>>({});
  protected readonly saved = signal(false);
  protected readonly note = signal('');

  /** appareils connectés : la session actuelle puis les autres (chacun peut être déconnecté) */
  private deviceRows(): Row[] {
    const others = this.settings.sessions();
    const rows: Row[] = [
      { id: 'sess', type: 'button', title: 'Session actuelle', sub: 'Ce navigateur', label: 'Se déconnecter' },
      ...others.map<Row>((d) => ({ id: `sess:${d.id}`, type: 'button', title: d.device, sub: `${d.place} · ${d.last}`, label: 'Déconnecter' })),
    ];
    rows.push(others.length > 1
      ? { id: 'sess-all', type: 'button', title: 'Tous les autres appareils', sub: `${others.length} sessions actives`, label: 'Tout déconnecter', danger: true }
      : { id: 'sess-none', type: 'badge', title: 'Autres appareils', sub: others.length ? '1 autre session active' : 'Aucune autre session active', text: others.length ? 'À surveiller' : 'Sécurisé' });
    return rows;
  }

  private passwordSub(): string {
    const at = this.settings.pwdAt();
    return at ? `Modifié ${ago(at)}` : 'Défini à l’inscription';
  }

  protected val(r: Row): string | boolean {
    if (r.id === 'dark') return this.theme.isDark();
    const edited = this.edits()[r.id];
    if (edited !== undefined) return edited;
    const stored = this.settings.values()[r.id];
    if (stored !== undefined) return stored;
    return 'value' in r ? r.value : '';
  }
  protected str(r: Row): string { return String(this.val(r)); }

  protected setValue(id: string, v: string | boolean): void {
    if (id === 'dark') { this.theme.toggle(); return; }
    this.edits.update((e) => ({ ...e, [id]: v }));
    this.saved.set(false);
  }

  protected save(): void {
    this.settings.save(this.edits());
    this.edits.set({});
    this.saved.set(true);
    setTimeout(() => this.saved.set(false), 2500);
  }
  protected cancel(): void { this.edits.set({}); this.saved.set(false); this.closeEditor(); }

  protected press(r: Row): void {
    if (r.id.startsWith('sess:')) {
      this.settings.revokeSession(r.id.slice(5));
      this.say('Appareil déconnecté.');
      return;
    }
    switch (r.id) {
      case 'name': void this.router.navigateByUrl('/profil/modifier'); return;
      case 'email': case 'pwd': case 'delete': this.toggleEditor(r.id); return;
      case 'export': this.exportData(); return;
      case 'sess': void this.auth.logout().then(() => window.location.replace('/')); return;
      case 'sess-all': this.settings.revokeOthers(); this.say('Tous les autres appareils sont déconnectés.'); return;
      case 'a-help': void this.router.navigateByUrl('/aide'); return;
      case 'a-rep': void this.router.navigateByUrl('/signaler'); return;
    }
  }

  // ----- petits formulaires sous la ligne : e-mail, mot de passe, suppression du compte -----
  protected toggleEditor(id: string): void {
    this.formError.set('');
    this.open.update((o) => (o === id ? null : id));
  }
  protected closeEditor(): void { this.open.set(null); this.formError.set(''); }

  protected async submitEditor(id: string, form: HTMLFormElement): Promise<void> {
    const f = new FormData(form);
    const get = (k: string) => String(f.get(k) ?? '');

    if (id === 'email') {
      const email = get('email').trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return this.fail('Saisissez une adresse e-mail valide.');
      if (!(await this.auth.changeEmail(email))) return this.fail('Cette adresse e-mail est déjà utilisée par un autre compte.');
      this.settings.setEmail(email);
      this.closeEditor();
      this.say('Adresse e-mail mise à jour.');
      return;
    }

    if (id === 'pwd') {
      const [current, next, again] = [get('current'), get('next'), get('again')];
      if (!current) return this.fail('Saisissez votre mot de passe actuel.');
      if (next.length < 6) return this.fail('Le nouveau mot de passe doit contenir au moins 6 caractères.');
      if (next === current) return this.fail('Le nouveau mot de passe doit être différent de l’ancien.');
      if (next !== again) return this.fail('Les deux mots de passe ne sont pas identiques.');
      // TODO : l'API vérifie l'ancien mot de passe
      if (!(await this.auth.changePassword(current, next))) return this.fail('Le mot de passe actuel est incorrect.');
      this.settings.markPasswordChanged();
      this.closeEditor();
      this.say('Mot de passe modifié.');
      return;
    }

    if (id === 'delete') {
      if (get('confirm').trim().toUpperCase() !== 'SUPPRIMER') return this.fail('Tapez SUPPRIMER pour confirmer.');
      this.settings.eraseAll(this.auth.session()?.email ?? '');
      await this.auth.deleteAccount();
      // rechargement complet : plus aucune donnée du compte ne reste en mémoire
      window.location.assign('/');
    }
  }

  /** « Télécharger mes données » : fichier JSON du profil et de l'activité gardés sur cet appareil */
  private exportData(): void {
    const json = this.settings.exportJson(this.auth.session()?.email ?? '', { name: this.profile.info().name, email: this.settings.email(), role: this.user.roleLabel() });
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'engineers-compass-mes-donnees.json';
    a.click();
    URL.revokeObjectURL(url);
    this.say('Vos données ont été téléchargées.');
  }

  private fail(message: string): void { this.formError.set(message); }

  private say(text: string): void {
    this.note.set(text);
    setTimeout(() => this.note.set(''), 3000);
  }
}
