-- Palm Foundation Kenya portal schema. Run in Supabase SQL Editor on a new project.
create extension if not exists pgcrypto;
create table if not exists public.admins (
 user_id uuid primary key references auth.users(id) on delete cascade,
 role text not null default 'admin' check (role in ('admin','super_admin')),
 created_at timestamptz not null default now()
);
create table if not exists public.applications (
 id uuid primary key default gen_random_uuid(),
 full_name text not null check (char_length(full_name) between 2 and 120),
 phone text not null unique,
 id_file_path text not null,
 status text not null default 'pending' check (status in ('pending','approved','rejected')),
 rejection_reason text,
 reviewed_by uuid references auth.users(id),
 reviewed_at timestamptz,
 created_at timestamptz not null default now()
);
create table if not exists public.membership_number_counter (
 year integer primary key,
 last_value integer not null default 0
);
create table if not exists public.members (
 id uuid primary key references auth.users(id) on delete cascade,
 application_id uuid unique references public.applications(id),
 membership_number text not null unique,
 full_name text not null,
 phone text not null unique,
 status text not null default 'active' check (status in ('active','suspended')),
 joined_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 updated_by uuid references auth.users(id),
 suspension_reason text
);
create table if not exists public.member_activation_codes (
 application_id uuid primary key references public.applications(id) on delete cascade,
 member_id uuid not null unique references public.members(id) on delete cascade,
 code_hash text not null,
 expires_at timestamptz not null,
 used_at timestamptz,
 created_at timestamptz not null default now()
);
create table if not exists public.member_status_history (
 id bigint generated always as identity primary key,
 member_id uuid not null references public.members(id) on delete cascade,
 old_status text,
 new_status text not null,
 reason text,
 changed_by uuid references auth.users(id),
 created_at timestamptz not null default now()
);
create table if not exists public.admin_activity_log (
 id bigint generated always as identity primary key,
 admin_id uuid references auth.users(id),
 action text not null,
 details jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create table if not exists public.news (
 id uuid primary key default gen_random_uuid(),
 title text not null check (char_length(title) between 1 and 160),
 summary text not null check (char_length(summary) <= 300),
 body text not null,
 image_url text,
 published boolean not null default false,
 created_by uuid references auth.users(id),
 updated_at timestamptz not null default now(),
 created_at timestamptz not null default now()
);
create index if not exists applications_status_created_idx on public.applications(status,created_at desc);
create index if not exists members_joined_idx on public.members(joined_at desc);
create index if not exists news_published_created_idx on public.news(published,created_at desc);
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.admins where user_id=auth.uid()) $$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;
create or replace function public.next_membership_number() returns text language plpgsql security definer set search_path=public as $$ declare y integer:=extract(year from now())::integer; n integer; begin insert into public.membership_number_counter(year,last_value) values(y,1) on conflict(year) do update set last_value=membership_number_counter.last_value+1 returning last_value into n; return 'PALM-'||y||'-'||lpad(n::text,4,'0'); end; $$;
revoke all on function public.next_membership_number() from public,anon,authenticated;
create or replace function public.log_member_status_change() returns trigger language plpgsql security definer set search_path=public as $$ begin if old.status is distinct from new.status then insert into public.member_status_history(member_id,old_status,new_status,reason,changed_by) values(new.id,old.status,new.status,new.suspension_reason,auth.uid()); end if; new.updated_at=now(); return new; end; $$;
drop trigger if exists members_status_history_trigger on public.members;
create trigger members_status_history_trigger before update on public.members for each row execute function public.log_member_status_change();

alter table public.admins enable row level security;
alter table public.applications enable row level security;
alter table public.members enable row level security;
alter table public.member_activation_codes enable row level security;
alter table public.member_status_history enable row level security;
alter table public.admin_activity_log enable row level security;
alter table public.news enable row level security;

drop policy if exists admins_read_self_or_admin on public.admins;
create policy admins_read_self_or_admin on public.admins for select to authenticated using (user_id=auth.uid() or public.is_admin());
drop policy if exists applications_public_submit on public.applications;
create policy applications_public_submit on public.applications for insert to anon,authenticated with check (status='pending' and reviewed_by is null and reviewed_at is null and rejection_reason is null);
drop policy if exists applications_admin_read on public.applications;
create policy applications_admin_read on public.applications for select to authenticated using (public.is_admin());
drop policy if exists members_admin_all on public.members;
create policy members_admin_all on public.members for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists members_read_self on public.members;
create policy members_read_self on public.members for select to authenticated using (id=auth.uid());
drop policy if exists activation_admin_only on public.member_activation_codes;
create policy activation_admin_only on public.member_activation_codes for select to authenticated using (public.is_admin());
drop policy if exists history_admin_or_member on public.member_status_history;
create policy history_admin_or_member on public.member_status_history for select to authenticated using (public.is_admin() or member_id=auth.uid());
drop policy if exists activity_admin_read on public.admin_activity_log;
create policy activity_admin_read on public.admin_activity_log for select to authenticated using (public.is_admin());
drop policy if exists news_public_read on public.news;
create policy news_public_read on public.news for select to anon,authenticated using (published=true or public.is_admin());
drop policy if exists news_admin_insert on public.news;
create policy news_admin_insert on public.news for insert to authenticated with check (public.is_admin());
drop policy if exists news_admin_update on public.news;
create policy news_admin_update on public.news for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists news_admin_delete on public.news;
create policy news_admin_delete on public.news for delete to authenticated using (public.is_admin());

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('id-documents','id-documents',false,5242880,array['image/jpeg','image/png','application/pdf']),
 ('news-images','news-images',true,5242880,array['image/jpeg','image/png'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists id_upload_anon on storage.objects;
create policy id_upload_anon on storage.objects for insert to anon,authenticated with check (bucket_id='id-documents');
drop policy if exists id_admin_read on storage.objects;
create policy id_admin_read on storage.objects for select to authenticated using (bucket_id='id-documents' and public.is_admin());
drop policy if exists id_admin_delete on storage.objects;
create policy id_admin_delete on storage.objects for delete to authenticated using (bucket_id='id-documents' and public.is_admin());
drop policy if exists news_images_public_read on storage.objects;
create policy news_images_public_read on storage.objects for select to anon,authenticated using (bucket_id='news-images');
drop policy if exists news_images_admin_write on storage.objects;
create policy news_images_admin_write on storage.objects for insert to authenticated with check (bucket_id='news-images' and public.is_admin());
drop policy if exists news_images_admin_update on storage.objects;
create policy news_images_admin_update on storage.objects for update to authenticated using (bucket_id='news-images' and public.is_admin());
drop policy if exists news_images_admin_delete on storage.objects;
create policy news_images_admin_delete on storage.objects for delete to authenticated using (bucket_id='news-images' and public.is_admin());
