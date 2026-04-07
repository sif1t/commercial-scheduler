-- Run this SQL in your Supabase SQL Editor.
-- It creates the tables required by the backend API.

create extension if not exists pgcrypto;

create table if not exists public.users (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    email text not null unique,
    password text not null,
    role text not null default 'user' check (role in ('user', 'admin', 'superAdmin')),
    team text not null check (team in ('video', 'portal')),
    is_active boolean not null default true,
    last_login timestamptz,
    password_changed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.products (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    brand text default '',
    team text not null check (team in ('video', 'portal')),
    monthly_target integer not null default 0 check (monthly_target >= 0),
    remaining_stock integer not null default 0 check (remaining_stock >= 0),
    start_date date,
    end_date date,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.daily_entries (
    id uuid primary key default gen_random_uuid(),
    product_id uuid not null references public.products(id) on delete cascade,
    morning_count integer not null default 0 check (morning_count >= 0),
    evening_count integer not null default 0 check (evening_count >= 0),
    late_night_count integer not null default 0 check (late_night_count >= 0),
    date date not null default current_date,
    entered_by text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (product_id, date)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
before update on public.users
for each row
execute function public.set_updated_at();

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row
execute function public.set_updated_at();

drop trigger if exists daily_entries_set_updated_at on public.daily_entries;
create trigger daily_entries_set_updated_at
before update on public.daily_entries
for each row
execute function public.set_updated_at();
