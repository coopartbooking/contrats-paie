-- Droits explicites sur les tables exposées à l'API.
-- Supabase cesse le 30 octobre 2026 d'accorder ces droits automatiquement :
-- une table créée sans grant devient injoignable par l'API. Chaque migration
-- pose donc désormais ses propres droits.

-- Le déposant (anon) ne touche aucune table : tout passe par les RPC.
revoke all on table
  public.submissions, public.contracts, public.employee_details,
  public.managers, public.reglages, public.notifications, public.consultations_paie
  from anon, authenticated;

-- Gestionnaires connectés. Les lignes restent filtrées par les policies RLS.
grant select, update on table public.submissions        to authenticated;
grant select         on table public.contracts          to authenticated;
grant delete         on table public.employee_details   to authenticated;
grant select         on table public.managers           to authenticated;
grant select         on table public.notifications      to authenticated;
grant select         on table public.consultations_paie to authenticated;
grant select, insert, update, delete on table public.reglages to authenticated;

-- Clé de service : Edge Functions et tâches planifiées.
grant select, insert, update, delete on table
  public.submissions, public.contracts, public.employee_details,
  public.managers, public.reglages, public.notifications, public.consultations_paie
  to service_role;
