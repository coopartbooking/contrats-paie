create or replace function is_manager()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from managers where user_id = auth.uid());
$$;

alter table submissions        enable row level security;
alter table contracts          enable row level security;
alter table employee_details   enable row level security;
alter table managers           enable row level security;
alter table reglages           enable row level security;
alter table notifications      enable row level security;
alter table consultations_paie enable row level security;

-- Le déposant n'a AUCUN accès direct aux tables : tout passe par les RPC.

create policy submissions_read_managers on submissions
  for select to authenticated using (is_manager());

create policy submissions_update_managers on submissions
  for update to authenticated using (is_manager()) with check (is_manager());

create policy contracts_read_managers on contracts
  for select to authenticated using (is_manager());

-- Pas de policy de lecture sur employee_details : la seule voie est
-- lire_details_paie(), qui journalise la consultation.
create policy details_delete_managers on employee_details
  for delete to authenticated using (is_manager());

create policy managers_read_self on managers
  for select to authenticated using (user_id = auth.uid());

create policy reglages_managers on reglages
  for all to authenticated using (is_manager()) with check (is_manager());

create policy notifications_read on notifications
  for select to authenticated using (is_manager());

create policy consultations_read on consultations_paie
  for select to authenticated using (is_manager());
