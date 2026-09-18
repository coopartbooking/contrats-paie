-- Effacement des éléments transmis au service paie, un mois après le traitement.
-- Le filet de sécurité à six mois couvre les dossiers jamais marqués « traitée » ;
-- retire cette ligne si tu n'en veux pas.

create or replace function purger_donnees_paie()
returns integer
language plpgsql security definer set search_path = public
as $$
declare n integer;
begin
  with cibles as (
    select s.id
    from submissions s
    where s.paie_purgee_at is null
      and exists (
        select 1 from contracts c
        join employee_details d on d.contract_id = c.id
        where c.submission_id = s.id
      )
      and (
        (s.traitee_at is not null and s.traitee_at < now() - interval '1 month')
        or s.created_at < now() - interval '6 months'
      )
  ),
  effacees as (
    delete from employee_details d
    using contracts c, cibles t
    where d.contract_id = c.id and c.submission_id = t.id
    returning c.submission_id
  )
  update submissions set paie_purgee_at = now()
  where id in (select distinct submission_id from effacees);

  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function purger_donnees_paie() from public, anon, authenticated;

select cron.schedule('purge-donnees-paie', '20 4 * * *', $$select purger_donnees_paie()$$);
