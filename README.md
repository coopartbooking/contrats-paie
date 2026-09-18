# Demandes de contrats — service paie

Collecte des informations nécessaires à la rédaction des contrats d'intermittents,
en remplacement d'un tableur partagé.

- **Dépôt public** — une compagnie remplit le formulaire depuis un simple lien, sans compte.
  Validation stricte : un dossier incomplet ne peut pas être envoyé. Un lien de relecture,
  valable 45 jours, permet de corriger tant que la demande n'a pas été prise en charge.
- **Gestion** — liste des demandes, détail, statut, export CSV. Accès réservé aux comptes
  inscrits dans la table `managers`, authentifiés par Google.
- **Notifications** — e-mail aux gestionnaires à chaque dépôt et à chaque modification,
  confirmation à la compagnie, avis d'effacement des données du dossier paie.

Vue 3 (Composition API) + Supabase. Pas de framework CSS.

## Architecture des données

| Table | Rôle |
|---|---|
| `submissions` | un dépôt : compagnie, contact, statut, jeton de relecture |
| `contracts` | un salarié = une ligne : emploi, dates, rémunération, lieu |
| `employee_details` | éléments transmis au service paie (identité, adresse, NIR, IBAN) — **effacés un mois après le traitement** |
| `managers` | comptes autorisés à consulter les demandes |
| `reglages` | interrupteurs ; `avis_purge_paie` active l'e-mail d'effacement |
| `notifications` | journal des envois, succès et échecs |
| `consultations_paie` | journal des accès aux données du dossier paie |

Le déposant n'a **aucun** droit direct sur ces tables. Tout passe par trois RPC
`security definer` : `submit_depot`, `get_depot`, `update_depot`. Les gestionnaires lisent
les tables via RLS, sauf `employee_details`, accessible seulement par `lire_details_paie()`,
qui journalise chaque consultation.

## Prérequis

- Node 20 ou plus
- Supabase CLI (`npm i -g supabase` ou `brew install supabase/tap/supabase`)
- Un projet Supabase en région européenne
- Un compte chez un service d'envoi d'e-mails (Resend par défaut ; le SMTP intégré de
  Supabase ne sert qu'aux e-mails d'authentification et ne convient pas ici)

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

⚠️ Un projet en plan Free est mis en pause après une semaine sans activité. Acceptable
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

Tant que ces deux secrets manquent, les dépôts fonctionnent mais aucun e-mail ne part
(un `warning` est écrit dans les logs).

### 5. La connexion Google

1. Google Cloud Console → APIs & Services → Credentials → Create OAuth client ID
   (type « Web application »).
2. Authorized redirect URI : `https://<ref>.supabase.co/auth/v1/callback`
3. Supabase → Authentication → Providers → Google : coller Client ID et Client Secret.
4. Supabase → Authentication → URL Configuration :
   - Site URL : l'URL publique de l'application
   - Redirect URLs : la même, plus `http://localhost:5173` pour le développement

Le client Supabase est configuré en **PKCE** : le retour de connexion arrive dans
`?code=…`, avant le `#`. En flux implicite, le jeton atterrirait dans le fragment et
écraserait la route.

### 6. L'Edge Function

```bash
supabase secrets set \
  RESEND_API_KEY=... \
  MAIL_FROM="Service paie <paie@exemple.fr>" \
  NOTIFY_SECRET=<le_meme_secret_que_dans_le_vault> \
  APP_BASE_URL=https://contrats.exemple.fr/ \
  NOTIFY_FALLBACK=paie@exemple.fr

supabase functions deploy notify-depot
```

`verify_jwt = false` est déjà dans `supabase/config.toml` : l'appelant est un trigger de
base, pas un utilisateur connecté, et la fonction vérifie elle-même le secret.

`NOTIFY_FALLBACK` sert tant que `managers` est vide.

### 7. Le front

```bash
cp .env.example .env
# VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY : Settings → API
npm run build
```

Le contenu de `dist/` se déploie n'importe où : Vercel, Netlify, un NAS. Le router est en
mode hash, donc **aucune règle de rewrite n'est nécessaire**.

### 8. Le premier gestionnaire

Connecte-toi une fois sur `…/#/gestion` avec Google. Tu verras « compte non autorisé » :
c'est normal, le compte existe désormais dans `auth.users` mais pas dans `managers`.
Dans le SQL Editor :

```sql
insert into managers (user_id, email)
select id, email from auth.users where email = 'toi@exemple.fr';
```

Recharge la page. Pour ajouter un collègue ensuite, même requête après sa première
tentative de connexion.

## Vérifications avant ouverture aux compagnies

1. Déposer une demande de test avec un salarié artiste et un technicien.
2. Vérifier les deux e-mails (gestionnaires + confirmation compagnie) et
   `select * from notifications order by created_at desc;`.
3. Ouvrir le lien de relecture, modifier un champ, enregistrer : un e-mail de révision
   doit partir et `revision` passer à 1.
4. Vérifier que le NIR et l'IBAN n'apparaissent **pas** en clair dans la page de relecture.
5. Dans la gestion : afficher les éléments du dossier paie, puis
   `select * from consultations_paie;` — la consultation doit être tracée.
6. Tester l'export CSV : ouverture directe dans Excel, aucune colonne du dossier paie.
7. Passer la demande en « traitée », puis forcer la purge :
   `select purger_donnees_paie();` après avoir avancé `traitee_at` d'un mois sur la
   demande de test. L'avis d'effacement doit partir.
8. Dashboard → Advisors : aucune alerte de sécurité.
9. Supprimer la demande de test : `delete from submissions where reference = '…';`

## Points de vigilance

- **La confirmation envoyée à la compagnie contient le lien de relecture**, donc un accès
  complet à la demande. C'est le prix du dépôt sans compte, et la raison pour laquelle NIR
  et IBAN ne sont jamais renvoyés en clair.
- **`pg_net` ne réessaie pas** en cas d'échec HTTP et n'avertit personne : la table
  `notifications` est la seule trace exploitable.
- **`submit_depot` est appelable anonymement.** Si le lien fuite hors du cercle des
  compagnies adhérentes, prévoir un plafond par IP ou par adresse e-mail.
- **Purge** : les données du dossier paie sont effacées un mois après le passage en
  « traitée », et dans tous les cas six mois après le dépôt. Le filet à six mois se retire
  dans `20260918090600_purge.sql`.
- **Pas de pagination** dans la liste des demandes. Au-delà de deux ou trois cents dépôts,
  ajouter un `range()`.

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
psql -d test -f supabase/tests/stub_local.sql
for f in supabase/migrations/2026*_{types,tables,rls,rpc,triggers,purge}.sql; do psql -d test -f "$f"; done
psql -d test -f supabase/tests/smoke.sql
```

La migration `_extensions.sql` est à sauter en local (pas de `pg_net` ni de `pg_cron`), et
les rôles `anon`, `authenticated` et `service_role` doivent exister.
