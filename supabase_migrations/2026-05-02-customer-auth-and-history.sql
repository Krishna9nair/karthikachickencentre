-- ChickenCrew — Customer Auth (Google) + Multi-Address + Order History
-- Run this once in your Supabase SQL editor.
-- Date: 2026-05-02
-- ============================================================

-- 1) user_sessions: stores Google-auth session_token issued by backend.
--    A row is created when a user signs in via Emergent Google Auth.
--    `phone` is initially NULL; user links it from the profile page.
create table if not exists public.user_sessions (
    id            uuid primary key default gen_random_uuid(),
    session_token text unique not null,
    email         text not null,
    name          text,
    picture       text,
    phone         text, -- 10-digit Indian phone, links to customer_profiles.phone
    expires_at    timestamptz not null,
    created_at    timestamptz not null default now(),
    last_seen_at  timestamptz not null default now()
);

create index if not exists idx_user_sessions_token   on public.user_sessions (session_token);
create index if not exists idx_user_sessions_email   on public.user_sessions (email);
create index if not exists idx_user_sessions_expires on public.user_sessions (expires_at);

-- RLS: service-role only (backend)
alter table public.user_sessions enable row level security;
drop policy if exists user_sessions_service_only on public.user_sessions;
create policy user_sessions_service_only on public.user_sessions
    for all to authenticated, anon
    using (false) with check (false);

-- ============================================================
-- 2) customer_profiles: add `email` column to link Google identity → phone.
--    One email maps to at most one phone, and vice versa.
-- ============================================================
alter table public.customer_profiles add column if not exists email text;
create unique index if not exists idx_customer_profiles_email
    on public.customer_profiles (email)
    where email is not null;

-- ============================================================
-- 3) customer_addresses: multiple saved addresses per phone (Home / Office / Other).
-- ============================================================
create table if not exists public.customer_addresses (
    id          uuid primary key default gen_random_uuid(),
    phone       text not null,
    label       text not null default 'Home',
    address     text not null,
    lat         double precision,
    lng         double precision,
    is_default  boolean not null default false,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

create index if not exists idx_customer_addresses_phone on public.customer_addresses (phone);

alter table public.customer_addresses enable row level security;
drop policy if exists customer_addresses_service_only on public.customer_addresses;
create policy customer_addresses_service_only on public.customer_addresses
    for all to authenticated, anon
    using (false) with check (false);

-- Helper: ensure only one default per phone (last write wins).
create or replace function public.enforce_single_default_address()
returns trigger language plpgsql as $$
begin
    if new.is_default then
        update public.customer_addresses
            set is_default = false, updated_at = now()
            where phone = new.phone
              and id <> new.id
              and is_default = true;
    end if;
    new.updated_at := now();
    return new;
end;
$$;

drop trigger if exists trg_single_default_address on public.customer_addresses;
create trigger trg_single_default_address
    before insert or update on public.customer_addresses
    for each row execute function public.enforce_single_default_address();

-- ============================================================
-- 4) orders: add cancellation columns so customers can cancel pending orders.
-- ============================================================
alter table public.orders add column if not exists cancelled_at  timestamptz;
alter table public.orders add column if not exists cancelled_by  text; -- 'customer' | 'admin'
alter table public.orders add column if not exists cancel_reason text;

-- ============================================================
-- 5) Backfill: copy `customer_profiles.address` into customer_addresses
--    as a "Home" default for customers who already have an address saved.
-- ============================================================
insert into public.customer_addresses (phone, label, address, lat, lng, is_default)
select cp.phone, 'Home', cp.address, cp.lat, cp.lng, true
from public.customer_profiles cp
where cp.address is not null
  and cp.address <> ''
  and not exists (
      select 1 from public.customer_addresses ca where ca.phone = cp.phone
  );
