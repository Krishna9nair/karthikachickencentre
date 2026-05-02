-- ChickenCrew - Combined customer auth, addresses, history, credentials, password reset
-- Run this ONCE in the Supabase SQL editor. Safe to re-run (all statements are idempotent).
-- Date: 2026-05-02
-- ============================================================================

-- ============================================================================
-- PART 1 - Google OAuth sessions, customer addresses, order cancellation
-- ============================================================================

-- 1.1) user_sessions: stores session_token issued after sign-in (Google or email).
create table if not exists public.user_sessions (
    id            uuid primary key default gen_random_uuid(),
    session_token text unique not null,
    email         text not null,
    name          text,
    picture       text,
    phone         text,
    expires_at    timestamptz not null,
    created_at    timestamptz not null default now(),
    last_seen_at  timestamptz not null default now()
);

create index if not exists idx_user_sessions_token   on public.user_sessions (session_token);
create index if not exists idx_user_sessions_email   on public.user_sessions (email);
create index if not exists idx_user_sessions_expires on public.user_sessions (expires_at);

alter table public.user_sessions enable row level security;
drop policy if exists user_sessions_service_only on public.user_sessions;
create policy user_sessions_service_only on public.user_sessions
    for all to authenticated, anon
    using (false) with check (false);

-- 1.2) customer_profiles: add email column to link Google identity to phone.
alter table public.customer_profiles add column if not exists email text;
create unique index if not exists idx_customer_profiles_email
    on public.customer_profiles (email)
    where email is not null;

-- 1.3) customer_addresses: multiple saved addresses per phone.
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

-- Trigger: ensure only one default address per phone.
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

-- 1.4) orders: cancellation columns.
alter table public.orders add column if not exists cancelled_at  timestamptz;
alter table public.orders add column if not exists cancelled_by  text;
alter table public.orders add column if not exists cancel_reason text;

-- 1.5) Backfill: make existing customer_profiles.address into a default Home entry.
insert into public.customer_addresses (phone, label, address, lat, lng, is_default)
select cp.phone, 'Home', cp.address, cp.lat, cp.lng, true
from public.customer_profiles cp
where cp.address is not null
  and cp.address <> ''
  and not exists (
      select 1 from public.customer_addresses ca where ca.phone = cp.phone
  );


-- ============================================================================
-- PART 2 - Email/password credentials and session role
-- ============================================================================

-- 2.1) customer_credentials: bcrypt-hashed passwords keyed by email.
create table if not exists public.customer_credentials (
    email           text primary key,
    password_hash   text not null,
    failed_attempts integer not null default 0,
    locked_until    timestamptz,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

create index if not exists idx_customer_credentials_email on public.customer_credentials (email);

alter table public.customer_credentials enable row level security;
drop policy if exists customer_credentials_service_only on public.customer_credentials;
create policy customer_credentials_service_only on public.customer_credentials
    for all to authenticated, anon
    using (false) with check (false);

-- 2.2) user_sessions: add role and remember_me columns.
alter table public.user_sessions add column if not exists role text not null default 'customer';
alter table public.user_sessions add column if not exists remember_me boolean not null default false;

create index if not exists idx_user_sessions_role on public.user_sessions (role);


-- ============================================================================
-- PART 3 - Password reset tokens
-- ============================================================================

create table if not exists public.password_reset_tokens (
    token       text primary key,
    email       text not null,
    expires_at  timestamptz not null,
    used_at     timestamptz,
    created_at  timestamptz not null default now()
);

create index if not exists idx_password_reset_email   on public.password_reset_tokens (email);
create index if not exists idx_password_reset_expires on public.password_reset_tokens (expires_at);

alter table public.password_reset_tokens enable row level security;
drop policy if exists prt_service_only on public.password_reset_tokens;
create policy prt_service_only on public.password_reset_tokens
    for all to authenticated, anon
    using (false) with check (false);


-- ============================================================================
-- DONE. Verify with:
--   select count(*) from public.user_sessions;
--   select count(*) from public.customer_addresses;
--   select count(*) from public.customer_credentials;
--   select count(*) from public.password_reset_tokens;
-- ============================================================================
