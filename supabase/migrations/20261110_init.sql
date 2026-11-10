-- VER'OPTIC — schéma initial (Phase 0)
-- À exécuter UNE fois dans Supabase → SQL Editor.
-- Principe RLS : lecture publique du contenu publié, écriture réservée aux admins.
-- Le modèle produits (handle, variantes, sku, prix) suit celui de Shopify
-- pour faciliter un branchement e-commerce ultérieur.

-- ───────────────────────── Admins ─────────────────────────
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- updated_at automatique
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ───────────────────────── Réglages du site (1 seule ligne) ─────────────────────────
create table public.settings (
  id smallint primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ───────────────────────── Catalogue ─────────────────────────
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  description text,
  cover_path text,
  sort_order int not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  description text,
  logo_path text,
  sort_order int not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  handle text not null unique check (handle ~ '^[a-z0-9-]+$'),
  title text not null,
  description text,
  category_id uuid references public.categories (id) on delete set null,
  brand_id uuid references public.brands (id) on delete set null,
  gender text check (gender in ('femme', 'homme', 'mixte', 'enfant')),
  frame_shape text,
  material text,
  tags text[] not null default '{}',
  sku text,
  price numeric(10, 2),
  price_on_request boolean not null default true,
  is_new boolean not null default false,
  is_featured boolean not null default false,
  is_published boolean not null default false,
  sort_order int not null default 0,
  shopify_product_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_category_idx on public.products (category_id);
create index products_brand_idx on public.products (brand_id);

-- Coloris (= variantes Shopify)
create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  color_name text not null,
  color_hex text check (color_hex is null or color_hex ~ '^#[0-9a-fA-F]{6}$'),
  sku text,
  sort_order int not null default 0,
  shopify_variant_id text,
  created_at timestamptz not null default now()
);
create index product_variants_product_idx on public.product_variants (product_id);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  variant_id uuid references public.product_variants (id) on delete set null,
  path text not null,
  alt text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index product_images_product_idx on public.product_images (product_id);

-- ───────────────────────── Contenus éditoriaux ─────────────────────────
create table public.services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title text not null,
  summary text,
  body text,
  cover_path text,
  sort_order int not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title text not null,
  excerpt text,
  body text,
  cover_path text,
  published_at timestamptz,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ───────────────────────── Demandes de RDV (formulaire public) ─────────────────────────
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  full_name text not null check (char_length(full_name) between 2 and 100),
  phone text not null check (char_length(phone) between 6 and 30),
  preferred_date date,
  preferred_slot text check (preferred_slot is null or char_length(preferred_slot) <= 50),
  reason text check (reason is null or char_length(reason) <= 100),
  message text check (message is null or char_length(message) <= 1000),
  product_handle text check (product_handle is null or char_length(product_handle) <= 120),
  status text not null default 'nouveau' check (status in ('nouveau', 'confirme', 'termine', 'annule'))
);

-- ───────────────────────── Triggers updated_at ─────────────────────────
create trigger settings_updated_at before update on public.settings for each row execute function public.set_updated_at();
create trigger categories_updated_at before update on public.categories for each row execute function public.set_updated_at();
create trigger brands_updated_at before update on public.brands for each row execute function public.set_updated_at();
create trigger products_updated_at before update on public.products for each row execute function public.set_updated_at();
create trigger services_updated_at before update on public.services for each row execute function public.set_updated_at();
create trigger articles_updated_at before update on public.articles for each row execute function public.set_updated_at();

-- ───────────────────────── RLS ─────────────────────────
alter table public.admins enable row level security;
alter table public.settings enable row level security;
alter table public.categories enable row level security;
alter table public.brands enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images enable row level security;
alter table public.services enable row level security;
alter table public.articles enable row level security;
alter table public.appointments enable row level security;

-- Admins : chacun ne voit que sa propre ligne (sert à l'admin pour vérifier son rôle)
create policy "admins_self_read" on public.admins for select to authenticated using (user_id = auth.uid());

-- Réglages : lecture publique, écriture admin
create policy "settings_public_read" on public.settings for select to anon, authenticated using (true);
create policy "settings_admin_write" on public.settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Contenus publiés : lecture publique ; admin voit et modifie tout
create policy "categories_public_read" on public.categories for select to anon, authenticated using (is_published or public.is_admin());
create policy "categories_admin_write" on public.categories for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "brands_public_read" on public.brands for select to anon, authenticated using (is_published or public.is_admin());
create policy "brands_admin_write" on public.brands for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "products_public_read" on public.products for select to anon, authenticated using (is_published or public.is_admin());
create policy "products_admin_write" on public.products for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "variants_public_read" on public.product_variants for select to anon, authenticated
  using (public.is_admin() or exists (select 1 from public.products p where p.id = product_id and p.is_published));
create policy "variants_admin_write" on public.product_variants for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "images_public_read" on public.product_images for select to anon, authenticated
  using (public.is_admin() or exists (select 1 from public.products p where p.id = product_id and p.is_published));
create policy "images_admin_write" on public.product_images for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "services_public_read" on public.services for select to anon, authenticated using (is_published or public.is_admin());
create policy "services_admin_write" on public.services for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "articles_public_read" on public.articles for select to anon, authenticated using (is_published or public.is_admin());
create policy "articles_admin_write" on public.articles for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- RDV : tout le monde peut ENVOYER une demande (statut forcé à 'nouveau'), seul l'admin lit/traite
create policy "appointments_public_insert" on public.appointments for insert to anon, authenticated with check (status = 'nouveau');
create policy "appointments_admin_read" on public.appointments for select to authenticated using (public.is_admin());
create policy "appointments_admin_update" on public.appointments for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "appointments_admin_delete" on public.appointments for delete to authenticated using (public.is_admin());

-- Droits d'accès explicites (la RLS filtre ensuite ligne par ligne)
grant usage on schema public to anon, authenticated;
grant select on public.settings, public.categories, public.brands, public.products,
  public.product_variants, public.product_images, public.services, public.articles to anon, authenticated;
grant insert, update, delete on public.settings, public.categories, public.brands, public.products,
  public.product_variants, public.product_images, public.services, public.articles to authenticated;
grant insert on public.appointments to anon, authenticated;
grant select, update, delete on public.appointments to authenticated;
grant select on public.admins to authenticated;
grant execute on function public.is_admin() to anon, authenticated;

-- ───────────────────────── Storage (images) ─────────────────────────
-- Bucket public en lecture ; seuls les admins peuvent ajouter/modifier/supprimer.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml'])
on conflict (id) do nothing;

create policy "media_admin_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and public.is_admin());
create policy "media_admin_update" on storage.objects for update to authenticated
  using (bucket_id = 'media' and public.is_admin()) with check (bucket_id = 'media' and public.is_admin());
create policy "media_admin_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and public.is_admin());

-- ───────────────────────── Données de départ ─────────────────────────
insert into public.settings (id, data) values (1, jsonb_build_object(
  'name', 'VER''OPTIC',
  'tagline', 'Opticien à Casablanca',
  'phone', '+212653770832',
  'whatsapp', '+212653770832',
  'address', 'N°177, Bd Abou Hounaifa Naamane, Hay Al Qods, Sidi Bernoussi, Casablanca',
  'google_maps_url', 'https://share.google/4aTpYQUUhLaI6QZ2Q',
  'instagram', 'https://www.instagram.com/verroptic/',
  'hours', jsonb_build_array()
));

insert into public.categories (slug, name, sort_order) values
  ('optique', 'Optique', 1),
  ('solaire', 'Solaire', 2),
  ('clip-on', 'Clip-on', 3),
  ('enfants', 'Enfants', 4),
  ('lentilles', 'Lentilles', 5);
