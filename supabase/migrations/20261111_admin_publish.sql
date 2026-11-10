-- VER'OPTIC — Phase 1 (admin)
-- 1. Bouton « Publier » : l'admin appelle publish_site(), qui déclenche le Deploy Hook Vercel
--    depuis Supabase. L'URL du hook reste en base (schéma privé), jamais dans le navigateur.
-- 2. Storage : les admins doivent pouvoir LIRE les objets pour pouvoir les supprimer.

create extension if not exists pg_net with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.config (
  key text primary key,
  value text not null
);

create or replace function public.publish_site()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  hook text;
begin
  if not public.is_admin() then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;

  select value into hook from private.config where key = 'vercel_deploy_hook';
  if hook is null then
    raise exception 'Deploy hook non configuré';
  end if;

  perform net.http_post(url := hook);
end;
$$;

revoke execute on function public.publish_site() from public, anon;
grant execute on function public.publish_site() to authenticated;

create policy "media_admin_select" on storage.objects for select to authenticated
  using (bucket_id = 'media' and public.is_admin());
