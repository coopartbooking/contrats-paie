create schema if not exists auth;
create schema if not exists vault;
create schema if not exists extensions;
create schema if not exists cron;
create schema if not exists net;

create table auth.users (id uuid primary key default gen_random_uuid(), email text);

create or replace function auth.uid() returns uuid
language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;

create table vault.secrets (name text primary key, secret text);
create view vault.decrypted_secrets as select name, secret as decrypted_secret from vault.secrets;
create or replace function vault.create_secret(s text, n text) returns void
language sql as $$ insert into vault.secrets values (n, s) $$;

create or replace function net.http_post(url text, body jsonb default '{}', params jsonb default '{}', headers jsonb default '{}', timeout_milliseconds int default 5000)
returns bigint language sql as $$ select 1::bigint $$;

create or replace function cron.schedule(jobname text, sched text, command text)
returns bigint language sql as $$ select 1::bigint $$;
