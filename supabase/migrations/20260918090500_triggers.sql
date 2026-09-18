create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger submissions_touch
  before update on submissions
  for each row execute function touch_updated_at();

create or replace function marquer_traitee()
returns trigger language plpgsql as $$
begin
  if new.statut = 'traitee' and coalesce(old.statut, 'nouvelle') <> 'traitee' then
    new.traitee_at := now();
  end if;
  return new;
end;
$$;

create trigger submissions_traitee
  before update of statut on submissions
  for each row execute function marquer_traitee();

-- Notification : nouveau dépôt, révision, ou effacement des données paie.
-- L'URL et le secret d'appel vivent dans Vault, jamais dans un paramètre de base.
create or replace function notify_depot()
returns trigger
language plpgsql security definer set search_path = public, extensions, vault
as $$
declare
  evt text;
  url text;
  secret text;
begin
  if tg_op = 'INSERT' then
    evt := 'nouveau';
  elsif new.revision > old.revision then
    evt := 'revision';
  elsif new.paie_purgee_at is not null and old.paie_purgee_at is null then
    if not (select r.actif from reglages r where r.cle = 'avis_purge_paie') then
      return new;
    end if;
    evt := 'purge';
  else
    return new;
  end if;

  select decrypted_secret into url from vault.decrypted_secrets where name = 'notify_url';
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'notify_secret';

  if url is null or secret is null then
    raise warning 'notify_depot : secrets absents du Vault, notification % ignorée', evt;
    return new;
  end if;

  perform net.http_post(
    url     := url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || secret),
    body    := jsonb_build_object('submission_id', new.id, 'event', evt)
  );
  return new;
end;
$$;

create trigger submissions_notify_insert
  after insert on submissions
  for each row execute function notify_depot();

create trigger submissions_notify_update
  after update on submissions
  for each row execute function notify_depot();
