-- Extensions nécessaires aux notifications (pg_net) et à la purge planifiée (pg_cron).
-- Si l'une des deux échoue ici, active-la depuis le dashboard :
-- Database > Extensions, puis relance `supabase db push`.

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;
