-- ---------------------------------------------------------------------------
-- Dépôts
-- ---------------------------------------------------------------------------

create table submissions (
  id              uuid primary key default gen_random_uuid(),
  reference       text unique not null default 'DEP-' || to_char(now(), 'YYYYMMDD') || '-'
                    || substr(gen_random_uuid()::text, 1, 6),
  compagnie       text not null check (length(trim(compagnie)) > 0),
  contact_nom     text not null check (length(trim(contact_nom)) > 0),
  contact_email   text not null check (contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  contact_tel     text,
  statut          depot_statut not null default 'nouvelle',
  note_interne    text,

  edit_token      uuid not null default gen_random_uuid(),
  edit_expires_at timestamptz not null default now() + interval '45 days',
  revision        integer not null default 0,
  last_edited_at  timestamptz,

  traitee_at      timestamptz,
  paie_purgee_at  timestamptz,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create unique index submissions_edit_token_idx on submissions(edit_token);
create index submissions_statut_idx on submissions(statut, created_at desc);

-- ---------------------------------------------------------------------------
-- Contrats : un salarié = une ligne
-- ---------------------------------------------------------------------------

create table contracts (
  id            uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions(id) on delete cascade,

  nom           text not null check (length(trim(nom)) > 0),
  prenom        text not null check (length(trim(prenom)) > 0),
  pseudo        text,

  date_debut    date not null,
  date_fin      date not null,

  categorie     contrat_categorie not null,
  profession    text not null check (length(trim(profession)) > 0),
  spectacle     text not null check (length(trim(spectacle)) > 0),

  cachets_nb       integer       check (cachets_nb > 0),
  cachets_type     cachet_type,
  cachets_montant  numeric(10,2) check (cachets_montant > 0),
  cachets_base     montant_base,

  services_nb      integer       check (services_nb > 0),
  services_type    service_type,
  services_montant numeric(10,2) check (services_montant > 0),
  services_base    montant_base,

  heures_nb        numeric(7,2)  check (heures_nb > 0),
  heures_montant   numeric(10,2) check (heures_montant > 0),
  heures_base      montant_base,

  commune       text not null check (length(trim(commune)) > 0),
  departement   text not null check (departement ~ '^(0[1-9]|[1-8][0-9]|9[0-5]|2[AB]|97[1-6])$'),

  dossier_paie_requis boolean not null default false,
  position      integer not null default 1,
  created_at    timestamptz not null default now(),

  constraint dates_coherentes check (date_fin >= date_debut),

  constraint artiste_cachets_complets check (
    case when categorie = 'artiste'
      then cachets_nb is not null and cachets_type is not null
       and cachets_montant is not null and cachets_base is not null
      else cachets_nb is null and cachets_type is null
       and cachets_montant is null and cachets_base is null
    end
  ),

  constraint artiste_services_complets check (
    (services_nb is null and services_type is null
     and services_montant is null and services_base is null)
    or (categorie = 'artiste' and services_nb is not null and services_type is not null
        and services_montant is not null and services_base is not null)
  ),

  constraint technicien_heures_completes check (
    case when categorie = 'technicien'
      then heures_nb is not null and heures_montant is not null and heures_base is not null
      else heures_nb is null and heures_montant is null and heures_base is null
    end
  )
);

create index contracts_submission_idx on contracts(submission_id, position);

-- ---------------------------------------------------------------------------
-- Éléments transmis au service paie : table séparée, purgée après traitement
-- ---------------------------------------------------------------------------

create table employee_details (
  contract_id       uuid primary key references contracts(id) on delete cascade,
  telephone         text not null check (length(trim(telephone)) > 0),
  email             text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  adresse1          text not null check (length(trim(adresse1)) > 0),
  adresse2          text,
  code_postal       text not null,
  ville             text not null check (length(trim(ville)) > 0),
  pays              text not null default 'France',
  naissance_date    date not null,
  naissance_ville   text not null check (length(trim(naissance_ville)) > 0),
  naissance_pays    text not null default 'France',
  conges_spectacles text,
  nir               text not null,
  iban              text not null,
  created_at        timestamptz not null default now(),

  constraint cp_francais check (pays <> 'France' or code_postal ~ '^\d{5}$'),
  constraint nir_format  check (nir ~ '^[1278]\d{4}(\d{2}|2[AB])\d{8}$'),
  constraint iban_format check (iban ~ '^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$')
);

-- ---------------------------------------------------------------------------
-- Gestionnaires, réglages, journaux
-- ---------------------------------------------------------------------------

create table managers (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  created_at timestamptz not null default now()
);

create table reglages (
  cle   text primary key,
  actif boolean not null default true,
  maj   timestamptz not null default now()
);

insert into reglages (cle, actif) values ('avis_purge_paie', true);

create table notifications (
  id            uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions(id) on delete cascade,
  event         text not null,
  destinataires text[] not null default '{}',
  statut        text not null check (statut in ('envoye', 'echec')),
  erreur        text,
  created_at    timestamptz not null default now()
);

create index notifications_submission_idx on notifications(submission_id, created_at desc);

create table consultations_paie (
  id          uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts(id) on delete cascade,
  user_id     uuid not null references auth.users(id),
  lu_at       timestamptz not null default now()
);

create index consultations_contract_idx on consultations_paie(contract_id, lu_at desc);
