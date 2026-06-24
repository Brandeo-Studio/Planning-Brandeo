-- ============================================================
-- Planning Brandeo — Schema completo para Supabase
-- Correr en el SQL Editor de Supabase
-- ============================================================

-- 1. PROFILES
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        text not null check (role in ('admin', 'cm')),
  name        text,
  created_at  timestamptz default now()
);

-- Crear profile automáticamente al registrar un usuario
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, role, name)
  values (new.id, 'cm', new.raw_user_meta_data->>'name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. CLIENTS
create table if not exists public.clients (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  created_at  timestamptz default now()
);

-- 3. CLIENT_CMS  (asignación de CMs a clientes)
create table if not exists public.client_cms (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients(id) on delete cascade,
  cm_id       uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz default now(),
  unique(client_id, cm_id)
);

-- 4. PLANNINGS  (un planning por cliente/año/mes)
create table if not exists public.plannings (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients(id) on delete cascade,
  year        int not null,
  month       int not null check (month between 1 and 12),
  created_at  timestamptz default now(),
  unique(client_id, year, month)
);

-- 5. POSTS
create table if not exists public.posts (
  id           uuid primary key default gen_random_uuid(),
  planning_id  uuid not null references public.plannings(id) on delete cascade,
  type         text not null check (type in ('historia', 'posteo', 'reel', 'carrusel')),
  title        text,
  copy         text,
  date         date,
  status       text not null default 'borrador' check (status in ('borrador', 'listo', 'programado', 'publicado')),
  image_url    text,
  video_url    text,
  created_at   timestamptz default now()
);

-- 6. COMMENTS
create table if not exists public.comments (
  id           uuid primary key default gen_random_uuid(),
  post_id      uuid not null references public.posts(id) on delete cascade,
  author_name  text not null,
  content      text not null,
  created_at   timestamptz default now()
);

-- ============================================================
-- ÍNDICES
-- ============================================================
create index if not exists idx_client_cms_cm_id       on public.client_cms(cm_id);
create index if not exists idx_client_cms_client_id   on public.client_cms(client_id);
create index if not exists idx_plannings_client_id    on public.plannings(client_id);
create index if not exists idx_posts_planning_id      on public.posts(planning_id);
create index if not exists idx_posts_date             on public.posts(date);
create index if not exists idx_comments_post_id       on public.comments(post_id);
create index if not exists idx_clients_slug           on public.clients(slug);

-- ============================================================
-- ROW LEVEL SECURITY — Políticas abiertas (using true)
-- Reemplazá por políticas estrictas cuando quieras restringir acceso
-- ============================================================

alter table public.profiles   enable row level security;
alter table public.clients    enable row level security;
alter table public.client_cms enable row level security;
alter table public.plannings  enable row level security;
alter table public.posts      enable row level security;
alter table public.comments   enable row level security;

-- profiles
create policy "profiles_all" on public.profiles for all using (true) with check (true);

-- clients
create policy "clients_all" on public.clients for all using (true) with check (true);

-- client_cms
create policy "client_cms_all" on public.client_cms for all using (true) with check (true);

-- plannings
create policy "plannings_all" on public.plannings for all using (true) with check (true);

-- posts
create policy "posts_all" on public.posts for all using (true) with check (true);

-- comments
create policy "comments_all" on public.comments for all using (true) with check (true);

-- ============================================================
-- STORAGE — Bucket para imágenes de posts
-- ============================================================
-- Correr esto por separado si querés habilitar el upload de imágenes:
--
-- insert into storage.buckets (id, name, public)
-- values ('planning-media', 'planning-media', true)
-- on conflict do nothing;
--
-- create policy "storage_all" on storage.objects
--   for all using (bucket_id = 'planning-media') with check (bucket_id = 'planning-media');

-- ============================================================
-- EJEMPLO: crear el primer usuario admin manualmente
-- ============================================================
-- Después de crear el usuario en Supabase Auth, correr:
--
-- update public.profiles set role = 'admin', name = 'Admin' where id = '<uuid-del-usuario>';
