\set ON_ERROR_STOP on
select vault.create_secret('https://exemple/functions/v1/notify-depot', 'notify_url');
select vault.create_secret('secret-test', 'notify_secret');

-- 1. Dépôt
select submit_depot('{
  "compagnie": "Compagnie du Chien Jaune",
  "contact_nom": "Lea Fournier",
  "contact_email": "admin@chienjaune.example",
  "contact_tel": null,
  "contracts": [
    {
      "nom": "Rivoire", "prenom": "Camille", "pseudo": null,
      "date_debut": "2026-11-03", "date_fin": "2026-11-08",
      "categorie": "artiste", "profession": "Comedienne", "spectacle": "Les Fils du vent",
      "cachets_nb": 3, "cachets_type": "CI", "cachets_montant": 150.5, "cachets_base": "brut",
      "services_nb": 4, "services_type": "SR4", "services_montant": 60, "services_base": "brut",
      "heures_nb": null, "heures_montant": null, "heures_base": null,
      "commune": "Le Puy-en-Velay", "departement": "43",
      "dossier_paie_requis": true,
      "details": {
        "telephone": "0612345678", "email": "camille@example.org",
        "adresse1": "12 rue de Exemple", "adresse2": null,
        "code_postal": "43000", "ville": "Le Puy-en-Velay", "pays": "France",
        "naissance_date": "1990-06-14", "naissance_ville": "Saint-Etienne",
        "naissance_pays": "France", "conges_spectacles": null,
        "nir": "285044312345695", "iban": "FR7630004000031234567890143"
      }
    },
    {
      "nom": "Dubois", "prenom": "Marc", "pseudo": null,
      "date_debut": "2026-11-03", "date_fin": "2026-11-08",
      "categorie": "technicien", "profession": "Technicien son", "spectacle": "Les Fils du vent",
      "cachets_nb": null, "cachets_type": null, "cachets_montant": null, "cachets_base": null,
      "services_nb": null, "services_type": null, "services_montant": null, "services_base": null,
      "heures_nb": 35, "heures_montant": 18.5, "heures_base": "brut",
      "commune": "Le Puy-en-Velay", "departement": "43",
      "dossier_paie_requis": false, "details": null
    }
  ]
}'::jsonb) \gset depot_

\echo '--- get_depot (NIR/IBAN doivent etre masques)'
select jsonb_pretty(
  get_depot((:'depot_submit_depot'::jsonb ->> 'edit_token')::uuid) -> 'contracts' -> 0 -> 'details'
);

-- 2. Modification : NIR/IBAN laisses vides = inchanges, id conserve
select get_depot((:'depot_submit_depot'::jsonb ->> 'edit_token')::uuid) as d \gset
select update_depot(
  (:'depot_submit_depot'::jsonb ->> 'edit_token')::uuid,
  jsonb_build_object(
    'compagnie', 'Compagnie du Chien Jaune',
    'contact_nom', 'Lea Fournier',
    'contact_email', 'admin@chienjaune.example',
    'contracts', jsonb_build_array(
      (:'d'::jsonb -> 'contracts' -> 0)
        || jsonb_build_object('profession', 'Comedienne (corrige)')
        || jsonb_build_object('details', ((:'d'::jsonb -> 'contracts' -> 0 -> 'details')
             - 'nir_masque' - 'iban_masque') || '{"nir": null, "iban": null}'::jsonb)
    )
  )
);

\echo '--- apres modification'
select revision, (select count(*) from contracts c where c.submission_id = s.id) as nb_contrats
from submissions s;
select profession, dossier_paie_requis from contracts;
select nir, iban, telephone from employee_details;

-- 3. Consultation tracee
insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'paie@exemple.fr');
insert into managers (user_id, email) values ('11111111-1111-1111-1111-111111111111', 'paie@exemple.fr');
set test.uid = '11111111-1111-1111-1111-111111111111';
select (lire_details_paie((select id from contracts where dossier_paie_requis)) ->> 'iban') as iban_lu;
select count(*) as consultations from consultations_paie;

-- 4. Purge
update submissions set statut = 'traitee';
update submissions set traitee_at = now() - interval '2 months';
select purger_donnees_paie() as purges;
select count(*) as details_restants from employee_details;
select paie_purgee_at is not null as purge_horodatee from submissions;
