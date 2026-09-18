-- ---------------------------------------------------------------------------
-- Fonctions internes
-- ---------------------------------------------------------------------------

create or replace function _masque(v text)
returns text language sql immutable
as $$ select case when v is null then null else '•••• ' || right(v, 4) end $$;

create or replace function _upsert_contract(p_submission uuid, c jsonb, p_position integer)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  cid    uuid := nullif(c ->> 'id', '')::uuid;
  d      jsonb := c -> 'details';
  requis boolean := coalesce((c ->> 'dossier_paie_requis')::boolean, false);
begin
  if cid is not null and not exists (
    select 1 from contracts where id = cid and submission_id = p_submission
  ) then
    raise exception 'Contrat inconnu';
  end if;

  if cid is null then
    insert into contracts (
      submission_id, nom, prenom, pseudo, date_debut, date_fin,
      categorie, profession, spectacle,
      cachets_nb, cachets_type, cachets_montant, cachets_base,
      services_nb, services_type, services_montant, services_base,
      heures_nb, heures_montant, heures_base,
      commune, departement, position, dossier_paie_requis
    ) values (
      p_submission,
      c ->> 'nom', c ->> 'prenom', nullif(c ->> 'pseudo', ''),
      (c ->> 'date_debut')::date, (c ->> 'date_fin')::date,
      (c ->> 'categorie')::contrat_categorie,
      c ->> 'profession', c ->> 'spectacle',
      (c ->> 'cachets_nb')::integer,
      (nullif(c ->> 'cachets_type', ''))::cachet_type,
      (c ->> 'cachets_montant')::numeric,
      (nullif(c ->> 'cachets_base', ''))::montant_base,
      (c ->> 'services_nb')::integer,
      (nullif(c ->> 'services_type', ''))::service_type,
      (c ->> 'services_montant')::numeric,
      (nullif(c ->> 'services_base', ''))::montant_base,
      (c ->> 'heures_nb')::numeric,
      (c ->> 'heures_montant')::numeric,
      (nullif(c ->> 'heures_base', ''))::montant_base,
      c ->> 'commune', c ->> 'departement', p_position, requis
    ) returning id into cid;
  else
    update contracts set
      nom = c ->> 'nom', prenom = c ->> 'prenom', pseudo = nullif(c ->> 'pseudo', ''),
      date_debut = (c ->> 'date_debut')::date, date_fin = (c ->> 'date_fin')::date,
      categorie = (c ->> 'categorie')::contrat_categorie,
      profession = c ->> 'profession', spectacle = c ->> 'spectacle',
      cachets_nb = (c ->> 'cachets_nb')::integer,
      cachets_type = (nullif(c ->> 'cachets_type', ''))::cachet_type,
      cachets_montant = (c ->> 'cachets_montant')::numeric,
      cachets_base = (nullif(c ->> 'cachets_base', ''))::montant_base,
      services_nb = (c ->> 'services_nb')::integer,
      services_type = (nullif(c ->> 'services_type', ''))::service_type,
      services_montant = (c ->> 'services_montant')::numeric,
      services_base = (nullif(c ->> 'services_base', ''))::montant_base,
      heures_nb = (c ->> 'heures_nb')::numeric,
      heures_montant = (c ->> 'heures_montant')::numeric,
      heures_base = (nullif(c ->> 'heures_base', ''))::montant_base,
      commune = c ->> 'commune', departement = c ->> 'departement',
      position = p_position, dossier_paie_requis = requis
    where id = cid;
  end if;

  if not requis then
    delete from employee_details where contract_id = cid;
    return cid;
  end if;

  if d is null or jsonb_typeof(d) <> 'object' then
    raise exception 'Éléments pour le service paie manquants';
  end if;
  if (d ->> 'naissance_date')::date >= current_date then
    raise exception 'Date de naissance incohérente';
  end if;

  if exists (select 1 from employee_details where contract_id = cid) then
    -- NIR et IBAN vides = inchangés (ils ne sont jamais renvoyés en clair au déposant)
    update employee_details set
      telephone = d ->> 'telephone',
      email = d ->> 'email',
      adresse1 = d ->> 'adresse1',
      adresse2 = nullif(d ->> 'adresse2', ''),
      code_postal = d ->> 'code_postal',
      ville = d ->> 'ville',
      pays = coalesce(nullif(d ->> 'pays', ''), 'France'),
      naissance_date = (d ->> 'naissance_date')::date,
      naissance_ville = d ->> 'naissance_ville',
      naissance_pays = coalesce(nullif(d ->> 'naissance_pays', ''), 'France'),
      conges_spectacles = nullif(d ->> 'conges_spectacles', ''),
      nir = coalesce(nullif(d ->> 'nir', ''), nir),
      iban = coalesce(nullif(d ->> 'iban', ''), iban)
    where contract_id = cid;
  else
    insert into employee_details (
      contract_id, telephone, email, adresse1, adresse2, code_postal, ville, pays,
      naissance_date, naissance_ville, naissance_pays, conges_spectacles, nir, iban
    ) values (
      cid, d ->> 'telephone', d ->> 'email', d ->> 'adresse1', nullif(d ->> 'adresse2', ''),
      d ->> 'code_postal', d ->> 'ville', coalesce(nullif(d ->> 'pays', ''), 'France'),
      (d ->> 'naissance_date')::date, d ->> 'naissance_ville',
      coalesce(nullif(d ->> 'naissance_pays', ''), 'France'),
      nullif(d ->> 'conges_spectacles', ''),
      d ->> 'nir', d ->> 'iban'
    );
  end if;

  return cid;
end;
$$;

create or replace function _upsert_contracts(p_submission uuid, p_contracts jsonb)
returns uuid[]
language plpgsql security definer set search_path = public
as $$
declare
  c   jsonb;
  i   integer := 0;
  ids uuid[] := '{}';
begin
  if jsonb_typeof(p_contracts) <> 'array' or jsonb_array_length(p_contracts) = 0 then
    raise exception 'Au moins un contrat est requis';
  end if;
  if jsonb_array_length(p_contracts) > 30 then
    raise exception 'Trop de contrats dans un seul dépôt';
  end if;

  for c in select * from jsonb_array_elements(p_contracts) loop
    i := i + 1;
    ids := ids || _upsert_contract(p_submission, c, i);
  end loop;

  return ids;
end;
$$;

revoke all on function _masque(text), _upsert_contract(uuid, jsonb, integer),
  _upsert_contracts(uuid, jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- RPC publiques
-- ---------------------------------------------------------------------------

create or replace function submit_depot(payload jsonb)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare s submissions;
begin
  insert into submissions (compagnie, contact_nom, contact_email, contact_tel)
  values (
    payload ->> 'compagnie', payload ->> 'contact_nom',
    payload ->> 'contact_email', nullif(payload ->> 'contact_tel', '')
  ) returning * into s;

  perform _upsert_contracts(s.id, payload -> 'contracts');

  return jsonb_build_object(
    'reference', s.reference, 'edit_token', s.edit_token, 'expires_at', s.edit_expires_at);
end;
$$;

create or replace function get_depot(p_token uuid)
returns jsonb
language plpgsql security definer stable set search_path = public
as $$
declare
  s        submissions;
  editable boolean;
begin
  select * into s from submissions where edit_token = p_token;
  if not found then raise exception 'Lien invalide'; end if;

  editable := s.statut = 'nouvelle' and now() < s.edit_expires_at;

  return jsonb_build_object(
    'reference', s.reference, 'statut', s.statut, 'revision', s.revision,
    'editable', editable, 'expires_at', s.edit_expires_at,
    'paie_purgee_at', s.paie_purgee_at,
    'compagnie', s.compagnie, 'contact_nom', s.contact_nom,
    'contact_email', s.contact_email, 'contact_tel', s.contact_tel,
    'contracts', coalesce((
      select jsonb_agg(
        (to_jsonb(c) - 'submission_id') || jsonb_build_object(
          'details', case when d.contract_id is null then null else
            (to_jsonb(d) - 'contract_id' - 'nir' - 'iban' - 'created_at')
            || jsonb_build_object(
                 'nir_masque', _masque(d.nir),
                 'iban_masque', _masque(d.iban))
          end
        ) order by c.position)
      from contracts c
      left join employee_details d on d.contract_id = c.id
      where c.submission_id = s.id
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function update_depot(p_token uuid, payload jsonb)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  s   submissions;
  ids uuid[];
begin
  select * into s from submissions where edit_token = p_token for update;
  if not found then raise exception 'Lien invalide'; end if;
  if s.statut <> 'nouvelle' then
    raise exception 'Ce dossier est déjà pris en charge, contactez le service paie';
  end if;
  if now() >= s.edit_expires_at then
    raise exception 'Ce lien de modification a expiré';
  end if;

  update submissions set
    compagnie = payload ->> 'compagnie',
    contact_nom = payload ->> 'contact_nom',
    contact_email = payload ->> 'contact_email',
    contact_tel = nullif(payload ->> 'contact_tel', ''),
    revision = s.revision + 1,
    last_edited_at = now()
  where id = s.id;

  ids := _upsert_contracts(s.id, payload -> 'contracts');
  delete from contracts where submission_id = s.id and not (id = any(ids));

  return jsonb_build_object('reference', s.reference, 'revision', s.revision + 1);
end;
$$;

create or replace function lire_details_paie(p_contract uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare d employee_details;
begin
  if not is_manager() then raise exception 'Accès refusé'; end if;

  select * into d from employee_details where contract_id = p_contract;
  if not found then return null; end if;

  insert into consultations_paie (contract_id, user_id) values (p_contract, auth.uid());
  return to_jsonb(d) - 'contract_id';
end;
$$;

grant execute on function submit_depot(jsonb)        to anon, authenticated;
grant execute on function get_depot(uuid)            to anon, authenticated;
grant execute on function update_depot(uuid, jsonb)  to anon, authenticated;
grant execute on function lire_details_paie(uuid)    to authenticated;
