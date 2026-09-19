-- Distinction administrateur / gestionnaire : seul un administrateur peut
-- ajouter ou retirer des accès. La modification passe par l'Edge Function
-- `gestionnaires`, qui détient la clé de service — jamais par le navigateur.

alter table managers add column admin boolean not null default false;

-- Le compte le plus ancien devient administrateur.
update managers set admin = true
where user_id = (select user_id from managers order by created_at limit 1);

create or replace function is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from managers where user_id = auth.uid() and admin);
$$;

-- Les gestionnaires voient la liste de l'équipe ; personne n'y écrit directement.
create policy managers_read_all on managers
  for select to authenticated using (is_manager());
