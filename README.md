# Engineers Compass
<img width="1676" height="1972" alt="engineers_compass_clair" src="https://github.com/user-attachments/assets/df8c9368-d1b5-4e9c-b670-56f4c95f5374" />
Réseau professionnel pour les élèves ingénieurs, les ingénieurs et les employeurs : fil de publications, défis, offres, réseau de contacts, messagerie, profil vérifié.
Projet Web — Objectif 3 (développement et intégration des fonctionnalités principales), Sup'Com, année 2027/2026.

> cette version remplace l'ancien README (qui ne décrivait que la page d'accueil).
> Elle documente maintenant tout le projet : choix du framework, fonctionnalités, lancement, Supabase et tests.

---

## 1. Lancer le projet

Prérequis : Node.js 20 ou plus, npm, un navigateur récent.

```bash
npm install
npm start          # http://localhost:4200
npm test           # tests automatiques (15 tests)
npm run build      # version de production dans dist/
```

### Brancher Supabase (connexion et comptes)

1. Créez un projet sur https://supabase.com.
2. Ouvrez `src/environments/environment.ts` et remplacez :
   - `supabaseUrl` par la « Project URL » (Project Settings › API) ;
   - `supabaseKey` par la clé publique (`anon` ou `sb_publishable_...`).
3. Ne mettez **jamais** la clé `service_role` ou `sb_secret_...` dans le code.
4. Dans Authentication › Providers › Email, désactivez « Confirm email » pendant les tests.
5. Pour la mise en ligne, ajoutez l'adresse du site dans Authentication › URL Configuration.

La clé publique peut être publiée sur GitHub : elle est faite pour être visible. La sécurité des données repose sur les règles RLS de la base.

Pour que le bouton « Supprimer le compte » marche vraiment, exécutez une fois dans le SQL Editor de Supabase la fonction `delete_my_account()` (elle supprime l'utilisateur connecté, et lui seul).

---

## 2. Pourquoi ces choix 
| Choix | Pourquoi |
|---|---|
| **Angular** | Il impose une structure claire (pages, services, routes), ce qui garde le code propre dans un projet de beaucoup de pages. Les routes, les formulaires et la navigation sont déjà fournis. |
| **Signals** (gestion des états) | C'est le système d'état d'Angular. Quand une valeur change (un « J'aime », un message), l'écran se met à jour tout seul, sans bibliothèque en plus. |
| **CSS écrit à la main** | Pas de framework CSS : on reproduit fidèlement la maquette (thèmes clair et sombre, tablette, mobile) et le site reste léger. |
| **Supabase** | C'est un backend prêt à l'emploi (comptes, base de données, fichiers). On évite d'écrire un serveur et on a une vraie connexion sécurisée. |
| **Services séparés** (`core/`) | Chaque service gère un sujet (comptes, messages, réseau…). Pour changer la source des données, on modifie le corps du service sans toucher aux pages. |
| **Vitest** | Les tests vérifient les parcours importants (inscription, connexion, publication, messages entre deux comptes) pour détecter vite une régression. |

---

## 3. Fonctionnalités développées

- **Comptes** : inscription en 3 étapes avec vérification d'un document, connexion, « Rester connecté », mot de passe oublié, changement d'e-mail et de mot de passe, suppression du compte.
- **Rôles** : élève ingénieur, ingénieur, employeur, autre. Le rôle donne ou retire des droits (un employeur crée une page entreprise).
- **Fil et publications** : publier, partager, « J'aime » (un seul par personne, retirable), commentaires, brouillon.
- **Test de connaissance** : un projet ou un certificat n'est publié que si le score atteint 90 %.
- **Défis et offres** : consulter, proposer une solution, postuler, enregistrer.
- **Réseau** : suggestions, invitations, contacts.
- **Messages** : conversations, messages non lus, partage de publication, dossier spam pour les inconnus.
- **Notifications** : invitations, acceptations, nouveaux messages.
- **Profil** : photo, couverture, expériences, formations, certificats.
- **Recherche, enregistrés, paramètres, signalement, contact, aide, pages légales**.
- **Pages d'erreur** (404 et autres) et thème clair/sombre.
- **Responsive** : mobile, tablette et ordinateur (media queries dans les fichiers CSS des pages).

Le site compte plus de 35 routes, bien au-delà des 3 à 5 pages dynamiques demandées.

---

## 4. Données : ce qui est réel et ce qui est simulé

| Partie | État |
|---|---|
| Comptes, session, rôle | **Supabase Auth** (réel) |
| Profil, publications, réactions, messages, réseau, notifications, offres, défis, enregistrés, réglages | **Simulation locale** (stockage du navigateur, un espace par compte) |
| Échange entre comptes (invitation, message, publication) | **Simulation** : fonctionne entre comptes du même navigateur (`core/remote-store.ts`) |

Chaque service garde les mêmes méthodes et les mêmes `signal` : le passage à Supabase pour le reste ne change que le corps des méthodes (`supabase.from(...)`), pas les pages ni le design.
Prochaine étape prévue : migrer dans l'ordre profil, publications, test, réseau, messages, notifications, offres/défis, enregistrés/réglages, puis supprimer `remote-store.ts`, `remote.service.ts` et `sync.service.ts`.

---

## 5. Structure (src/app)

```
core/         services (auth, profil, publications, messages, réseau…), gardes de routes, thème, Supabase
shared/       composants et directives réutilisables (actions, commentaires, partage, icônes…)
testing/      faux Supabase utilisé par les tests
<page>/       un dossier par page (login, signup, feed, messages, offers, challenges, profile, settings…)
environments/ réglages Supabase
```

Conventions : un dossier par page, un service par sujet, noms de fichiers en minuscules avec tirets, commentaires en français.

---

## 6. Tests

`npm test` lance 15 tests automatiques sur les parcours principaux (compte neuf, connexion, publication, test de connaissance, deux comptes qui se parlent, suppression des données). Ils utilisent un faux Supabase (`src/app/testing/fake-supabase.ts`) : pas de connexion Internet nécessaire.

À vérifier à la main avant la remise : affichage sur Chrome, Firefox, Edge et Safari, liens, formulaires, poids des images, contrastes.

---

## 7. Dépendances

Angular 22, RxJS, `@supabase/supabase-js`, TypeScript, Vitest, Prettier.
