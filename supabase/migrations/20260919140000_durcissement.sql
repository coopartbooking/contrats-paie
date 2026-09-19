-- Durcissement, suite aux advisors de sécurité Supabase.
--
-- Note importante : révoquer EXECUTE sur is_manager(), comme le suggère
-- littéralement l'advisor, casse TOUTES les policies — elles sont évaluées avec
-- les droits de l'appelant. La bonne réponse est de sortir ces fonctions du
-- schéma exposé par l'API, ce qui les retire de /rest/v1/rpc sans toucher à RLS.

-- 1. search_path figé sur les trois fonctions qui l'avaient laissé mutable.
alter function public._masque(text)        set search_path = public;
alter function public.touch_updated_at()   set search_path = public;
alter function public.marquer_traitee()    set search_path = public;

-- 2. Les helpers RLS quittent le schéma public.
create schema if not exists private;
grant usage on schema private to authenticated;

alter function public.is_manager() set schema private;
alter function public.is_admin()   set schema private;

revoke all on function private.is_manager() from public, anon;
revoke all on function private.is_admin()   from public, anon;
grant execute on function private.is_manager() to authenticated;
grant execute on function private.is_admin()   to authenticated;

-- 3. Les fonctions de trigger ne sont jamais appelées directement.
--    Un trigger se déclenche sans que l'appelant ait EXECUTE.
revoke all on function public.notify_depot()      from public, anon, authenticated;
revoke all on function public.touch_updated_at()  from public, anon, authenticated;
revoke all on function public.marquer_traitee()   from public, anon, authenticated;

-- 4. lire_details_paie appelle is_manager() : il faut la requalifier,
--    sinon son search_path ne la trouve plus.
create or replace function public.lire_details_paie(p_contract uuid)
returns jsonb
language plpgsql security definer set search_path = public, private
as $$
declare d employee_details;
begin
  if not private.is_manager() then raise exception 'Accès refusé'; end if;

  select * into d from employee_details where contract_id = p_contract;
  if not found then return null; end if;

  insert into consultations_paie (contract_id, user_id) values (p_contract, auth.uid());
  return to_jsonb(d) - 'contract_id';
end;
$$;

revoke all on function public.lire_details_paie(uuid) from public, anon;
grant execute on function public.lire_details_paie(uuid) to authenticated;

-- submit_depot, get_depot et update_depot restent appelables par anon : c'est
-- l'API publique du dépôt sans compte, elles vérifient le jeton elles-mêmes.
