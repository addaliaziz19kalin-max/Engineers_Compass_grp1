import { Routes } from '@angular/router';
import { AccountLayout } from './account/account-layout';
import { Network } from './network/network';
import { Company } from './company/company';
import { CreatePage } from './create-page/create-page';
import { MyPageAdmin } from './my-page/my-page';
import { authGuard } from './core/auth.guard';
import { employerGuard } from './core/employer.guard';
import { ErrorPage } from './error/error-page';
import { MemberPage } from './member/member';
import { Legal } from './legal/legal';
import { Contact } from './contact/contact';
import { Saved } from './saved/saved';
import { Settings } from './settings/settings';
import { Test } from './test/test';
import { Verification } from './verification/verification';
import { Help } from './help/help';
import { ProfileAdd } from './profile-add/profile-add';
import { ProfileEdit } from './profile-edit/profile-edit';
import { Report } from './report/report';
import { Dashboard } from './dashboard/dashboard';
import { Notifications } from './notifications/notifications';
import { Compose } from './compose/compose';
import { Challenges } from './challenges/challenges';
import { ChallengeDetail } from './challenge-detail/challenge-detail';
import { ChallengeSolution } from './challenge-solution/challenge-solution';
import { Feed } from './feed/feed';
import { Forgot } from './forgot/forgot';
import { Home } from './home/home';
import { Login } from './login/login';
import { Messages } from './messages/messages';
import { OfferDetail } from './offer-detail/offer-detail';
import { Offers } from './offers/offers';
import { Profile } from './profile/profile';
import { Search } from './search/search';
import { Signup } from './signup/signup';

export const routes: Routes = [
  { path: '', pathMatch: 'full', component: Home, title: 'Engineers Compass — Le réseau des futurs ingénieurs, vérifié.' },
  { path: 'connexion', component: Login, title: 'Connexion — Engineers Compass' },
  { path: 'mot-de-passe-oublie', component: Forgot, title: 'Mot de passe oublié — Engineers Compass' },
  { path: 'inscription', component: Signup, title: 'Créer votre compte — Engineers Compass' },

  // pages du compte : la barre du haut (AccountLayout) reste affichée ; une session ouverte est obligatoire
  {
    path: '',
    component: AccountLayout,
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    children: [
      { path: 'fil', component: Feed, title: 'Accueil — Engineers Compass' },
      { path: 'publier', component: Compose, title: 'Créer une publication — Engineers Compass' },
      { path: 'tableau-de-bord', component: Dashboard, title: 'Tableau de bord d’activité — Engineers Compass' },
      { path: 'notifications', component: Notifications, title: 'Notifications — Engineers Compass' },
      { path: 'defis/:id/solution', component: ChallengeSolution, title: 'Proposer une solution — Engineers Compass' },
      { path: 'defis/:id', component: ChallengeDetail, title: 'Voir le projet — Engineers Compass' },
      { path: 'defis', component: Challenges, title: 'Défis — Engineers Compass' },
      { path: 'offres/:id', component: OfferDetail, title: 'Détail de l’offre — Engineers Compass' },
      { path: 'offres', component: Offers, title: 'Offres — Engineers Compass' },
      { path: 'profil/modifier', component: ProfileEdit, title: 'Modifier le profil — Engineers Compass' },
      { path: 'profil/ajouter', component: ProfileAdd, title: 'Ajouter à mon profil — Engineers Compass' },
      { path: 'reseau', component: Network, title: 'Mon réseau — Engineers Compass' },
      { path: 'reseau/:section', component: Network, title: 'Mon réseau — Engineers Compass' },
      { path: 'membre/:slug', component: MemberPage, title: 'Profil — Engineers Compass' },
      { path: 'page/:slug', component: Company, title: 'Page entreprise — Engineers Compass' },
      // pages réservées à l'employeur : créer sa page et l'administrer (jamais visibles par un visiteur)
      { path: 'creer-page', component: CreatePage, canActivate: [employerGuard], title: 'Créer une page — Engineers Compass' },
      { path: 'ma-page', component: MyPageAdmin, canActivate: [employerGuard], title: 'Ma page — Engineers Compass' },
      { path: 'conditions', component: Legal, data: { doc: 'conditions' }, title: 'Conditions d’utilisation — Engineers Compass' },
      { path: 'confidentialite', component: Legal, data: { doc: 'confidentialite' }, title: 'Politique de confidentialité — Engineers Compass' },
      { path: 'contact', component: Contact, title: 'Contact — Engineers Compass' },
      { path: 'enregistres', component: Saved, title: 'Enregistrés — Engineers Compass' },
      { path: 'parametres', pathMatch: 'full', redirectTo: 'parametres/compte' },
      { path: 'parametres/:section', component: Settings, title: 'Paramètres — Engineers Compass' },
      { path: 'test', component: Test, title: 'Test de connaissance — Engineers Compass' },
      { path: 'verification', component: Verification, title: 'Résultat de la vérification — Engineers Compass' },
      { path: 'signaler', component: Report, title: 'Signaler un problème — Engineers Compass' },
      { path: 'aide', component: Help, title: 'Centre d’aide — Engineers Compass' },
      { path: 'profil', component: Profile, title: 'Profil — Engineers Compass' },
      { path: 'messages', component: Messages, title: 'Messages — Engineers Compass' },
      { path: 'recherche', component: Search, title: 'Recherche — Engineers Compass' },
    ],
  },

  // erreurs : /erreur/500, /erreur/403, /erreur/offline… ; toute adresse inconnue → 404
  { path: 'erreur/:code', component: ErrorPage, title: 'Erreur — Engineers Compass' },
  { path: '**', component: ErrorPage, data: { code: '404' }, title: 'Page introuvable — Engineers Compass' },
];
