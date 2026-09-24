# Demandes de contrats — service paie

Collecte des informations nécessaires à la rédaction des contrats d'intermittents,
en remplacement d'un tableur partagé.

- **Dépôt public** — une compagnie remplit le formulaire depuis un simple lien, sans compte.
  Validation stricte : un dossier incomplet ne peut pas être envoyé. Un lien de relecture,
  valable 45 jours, permet de corriger tant que la demande n'a pas été prise en charge.
- **Gestion** — liste des demandes triée par urgence, détail, statut, export CSV. Accès
  réservé aux comptes inscrits dans `managers`, par adresse et mot de passe.
- **Équipe** — un administrateur ajoute, retire et réinitialise les gestionnaires depuis
  l'application, sans SQL.
- **Notifications** — e-mail au service paie à chaque dépôt et à chaque modification,
  confirmation à la compagnie, avis d'effacement des données du dossier paie.

Vue 3 (Composition API) + Supabase. Pas de framework CSS.

## Architecture des données

| Table | Rôle |
|---|---|
| `submissions` | un dépôt : compagnie, contact, statut, jeton de relecture |
| `contracts` | un salarié = une ligne : emploi, dates, rémunération, lieu |
| `employee_details` | éléments transmis au service paie (identité, adresse, NIR, IBAN) — **effacés un mois après le traitement** |
| `managers` | comptes autorisés ; `admin` donne le droit de gérer les accès |
| `reglages` | interrupteurs ; `avis_purge_paie` active l'e-mail d'effacement |
| `notifications` | journal des envois, succès et échecs |
| `consultations_paie` | journal des accès aux données du dossier paie |

Le déposant n'a **aucun** droit direct sur ces tables. Tout passe par trois RPC
`security definer` : `submit_depot`, `get_depot`, `update_depot`. Les gestionnaires lisent
les tables via RLS, sauf `employee_details`, accessible seulement par `lire_details_paie()`,
qui journalise chaque consultation.

Les policies s'appuient sur `private.is_manager()` et `private.is_admin()` : hors du schéma
`public`, donc hors de l'API, mais exécutables par le rôle `authenticated`.

Les droits de table sont posés explicitement dans `20260924090000_droits_api.sql` : `anon`
n'a aucun accès aux tables, `authenticated` a la lecture plus la mise à jour du statut,
`service_role` a tout. **Toute migration qui crée une table doit désormais poser ses propres
`grant`** : depuis le 30 octobre 2026, Supabase ne les accorde plus automatiquement, et une
table sans `grant` est injoignable par l'API.

## Prérequis

- Node 20 ou plus
- Supabase CLI (`npm i -g supabase` ou `brew install supabase/tap/supabase`)
- Un projet Supabase en région européenne
- Une boîte e-mail dédiée chez un hébergeur fournissant un SMTP (ici OVH,
  `notifications@coopart.fr`), utilisée pour les notifications **et** pour les e-mails
  d'authentification

## Mise en place, dans l'ordre

### 1. Le dépôt

```bash
git clone https://github.com/coopartbooking/contrats-paie.git
cd contrats-paie
npm install
```

### 2. Le projet Supabase

Dashboard → New project. Région européenne, mot de passe de base **conservé dans un
gestionnaire de mots de passe** : il n'est affiché qu'une fois. Note la référence du projet
(la chaîne dans `https://<ref>.supabase.co`).

⚠️ Un projet en plan Free est mis en pause après une semaine sans activité, n'a aucune
sauvegarde, et ne propose pas la protection contre les mots de passe compromis. Acceptable
pendant les tests, pas une fois le lien donné aux compagnies.

### 3. Lier et pousser le schéma

```bash
supabase login
supabase link --project-ref <ref>
supabase db push
```

Si la première migration échoue sur `pg_cron` ou `pg_net`, active les deux extensions
depuis Database → Extensions, puis relance `supabase db push`.

### 4. Les secrets du Vault

Dans le SQL Editor, avec la vraie référence de projet et un secret aléatoire
(`openssl rand -hex 24`) :

```sql
select vault.create_secret(
  'https://<ref>.supabase.co/functions/v1/notify-depot', 'notify_url');
select vault.create_secret('<secret_aleatoire>', 'notify_secret');
```

Pour le remplacer plus tard : `select vault.update_secret(id, '<nouveau>')` avec l'`id`
lu dans `vault.secrets`. Tant que ces deux secrets manquent, les dépôts fonctionnent mais
aucun e-mail ne part (un `warning` est écrit dans les logs).

### 5. La connexion des gestionnaires

Connexion par adresse et mot de passe. Aucune inscription libre : un administrateur crée
les comptes depuis la page Équipe, qui affiche un mot de passe provisoire à transmettre par
un autre canal que l'e-mail.

**a. Authentication → Sign In / Providers → Email** : provider activé, *Allow new users to
sign up* **désactivé**, confirmation d'e-mail désactivée (le compte est créé déjà confirmé
par la fonction `gestionnaires`).

**b. Authentication → URL Configuration**

- Site URL : l'URL publique de l'application (en développement `http://localhost:5173`)
- Redirect URLs : la même suivie de `/**`

**c. Authentication → Emails → SMTP Settings** : le mailer intégré de Supabase est bridé à
quelques envois par heure. Déclare le SMTP de la boîte dédiée (OVH : `ssl0.ovh.net`, port
465, utilisateur et expéditeur = l'adresse complète). Les gabarits d'e-mails deviennent
alors modifiables, notamment *Reset password*.

Le client Supabase est en **PKCE**, et `src/lib/pre-auth.js` récupère un éventuel retour
d'authentification arrivé dans le fragment avant que le router en mode hash ne le perde.

### 6. Les Edge Functions

```bash
supabase secrets set \
  SMTP_HOST=ssl0.ovh.net \
  SMTP_PORT=465 \
  SMTP_USER=notifications@exemple.fr \
  SMTP_PASSWORD='<mot_de_passe_de_la_boite>' \
  MAIL_FROM="Service paie <notifications@exemple.fr>" \
  MAIL_REPLY_TO=paie@exemple.fr \
  NOTIFY_SECRET=<le_meme_secret_que_dans_le_vault> \
  NOTIFY_TO=paie@exemple.fr \
  NOTIFY_FALLBACK=paie@exemple.fr \
  APP_BASE_URL=https://contrats.exemple.fr/

supabase functions deploy notify-depot
supabase functions deploy gestionnaires
```

- `MAIL_FROM` doit porter l'adresse du compte SMTP authentifié, sinon OVH refuse l'envoi.
- `NOTIFY_TO` fixe les destinataires des alertes. Sans lui, les adresses de `managers` sont
  utilisées, et `NOTIFY_FALLBACK` tant que la table est vide.
- `notify-depot` tourne avec `verify_jwt = false` : l'appelant est un trigger de base, pas un
  utilisateur connecté, et la fonction vérifie elle-même `NOTIFY_SECRET`.
- `gestionnaires` tourne avec `verify_jwt = true` et revérifie que l'appelant est
  administrateur avant toute création ou suppression de compte.

Le mot de passe SMTP et la clé `service_role` ne doivent jamais entrer dans le dépôt ni dans
`.env` : ils vivent dans les secrets Supabase.

### 7. Le front

```bash
cp .env.example .env
# VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY : Settings → API
npm run build
```

Le router est en mode hash : **aucune règle de rewrite n'est nécessaire**, et le jeton de
relecture reste dans le fragment, donc hors des journaux serveur.

Déploiement sur GitHub Pages par `.github/workflows/deploy.yml`, à chaque push sur `main` :

- Settings → Pages → Source : **GitHub Actions**
- Settings → Secrets and variables → Actions → **Variables** : `VITE_SUPABASE_URL` et
  `VITE_SUPABASE_PUBLISHABLE_KEY` (des Variables, pas des Secrets : elles sont publiques par
  nature et doivent apparaître dans le build)
- `vite.config.js` fixe `base: '/contrats-paie/'` en build : à changer en `'/'` avec un
  domaine dédié

### 8. Le premier administrateur

Authentication → Users → **Add user**, avec ton adresse et un mot de passe, *Auto Confirm
User* coché. Puis dans le SQL Editor :

```sql
insert into managers (user_id, email, admin)
select id, email, true from auth.users where email = 'toi@exemple.fr';
```

Connecte-toi sur `…/#/gestion`. Les comptes suivants s'ajoutent depuis la page Équipe.

## Vérifications avant ouverture aux compagnies

1. Déposer une demande de test avec un salarié artiste et un technicien.
2. Vérifier les deux e-mails (alerte service paie + confirmation compagnie) et
   `select * from notifications order by created_at desc;`.
3. Vérifier la délivrabilité : dans Gmail, « Afficher l'original » doit donner SPF, DKIM et
   DMARC en `pass`. Sinon, compléter la zone DNS du domaine.
4. Répondre à la confirmation : la réponse doit arriver dans la boîte `MAIL_REPLY_TO`.
5. Ouvrir le lien de relecture, modifier un champ, enregistrer : un e-mail de révision doit
   partir et `revision` passer à 1.
6. Vérifier que le NIR et l'IBAN n'apparaissent **pas** en clair dans la page de relecture.
7. Dans la gestion : afficher les éléments du dossier paie, puis
   `select * from consultations_paie;` — la consultation doit être tracée.
8. Tester l'export CSV : ouverture directe dans Excel, aucune colonne du dossier paie.
9. Ajouter puis retirer un gestionnaire de test depuis la page Équipe.
10. Passer la demande en « traitée », puis forcer la purge :
    `select purger_donnees_paie();` après avoir avancé `traitee_at` d'un mois sur la
    demande de test. L'avis d'effacement doit partir.
11. Dashboard → Advisors : voir ci-dessous les alertes attendues.
12. Supprimer les demandes de test : `delete from submissions where reference = '…';`

### Alertes Advisors attendues

Huit avertissements restent, tous assumés :

- `submit_depot`, `get_depot`, `update_depot` exposés à `anon` et `authenticated` : c'est le
  dépôt sans compte. Les fonctions valident tout ce qu'elles reçoivent et le jeton de
  relecture est la seule clé d'accès à une demande.
- `lire_details_paie` exposée à `authenticated` : la fonction vérifie elle-même
  `private.is_manager()` et journalise la consultation.
- Protection contre les mots de passe compromis désactivée : réservée au plan Pro.

## Points de vigilance

- **La confirmation envoyée à la compagnie contient le lien de relecture**, donc un accès
  complet à la demande. C'est le prix du dépôt sans compte, et la raison pour laquelle NIR
  et IBAN ne sont jamais renvoyés en clair.
- **Chaque nouvelle table doit emporter ses `grant`** dans la migration qui la crée, sinon
  elle reste injoignable par l'API.
- **`pg_net` ne réessaie pas** en cas d'échec HTTP et n'avertit personne : la table
  `notifications` est la seule trace exploitable.
- **`submit_depot` est appelable anonymement.** Si le lien fuite hors du cercle des
  compagnies adhérentes, prévoir un plafond par IP ou par adresse e-mail.
- **Purge** : les données du dossier paie sont effacées un mois après le passage en
  « traitée », et dans tous les cas six mois après le dépôt. Le filet à six mois se retire
  dans `20260918090600_purge.sql`.
- **Pas de pagination** dans la liste des demandes. Au-delà de deux ou trois cents dépôts,
  ajouter un `range()`.
- **Pas de rafraîchissement automatique** de la liste : deux gestionnaires simultanés ne
  voient les changements de l'autre qu'après rechargement.

## Développement

```bash
npm run dev     # http://localhost:5173
```

Pour travailler sur la base en local : `supabase start`, puis `supabase db reset` pour
rejouer toutes les migrations.

## Tests de la base

`supabase/tests/` contient de quoi rejouer le schéma sur un PostgreSQL nu, hors Supabase :

- `stub_local.sql` — bouchons pour `auth`, `vault`, `net.http_post` et `cron.schedule`
- `smoke.sql` — parcours complet : dépôt, relecture masquée, modification, consultation
  tracée, purge

```bash
createdb test
psql -d test -c "create role anon nologin; create role authenticated nologin;
                 create role service_role nologin bypassrls;
                 grant usage on schema public to anon, authenticated, service_role;"
psql -d test -f supabase/tests/stub_local.sql
for f in supabase/migrations/2026*.sql; do
  case "$f" in *extensions.sql) continue;; esac
  psql -d test -v ON_ERROR_STOP=1 -f "$f"
done
psql -d test -f supabase/tests/smoke.sql
```

La migration `_extensions.sql` est à sauter en local : ni `pg_net` ni `pg_cron` n'y sont.
