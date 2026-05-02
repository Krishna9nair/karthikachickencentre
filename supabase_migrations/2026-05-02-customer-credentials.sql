 ChickenCrew — Customer email/password authentication
-- Adds passworded sign-in alongside the existing Google OAuth path.
-- Run this once in the Supabase SQL editor.
-- Date: 2026-05-02

-- 1) customer_credentials — bcrypt-hashed passwords keyed by email.
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

-- 2) user_sessions — add `role` so the frontend can route admins vs customers
--    after login (and a `remember_me` flag for telemetry).
alter table public.user_sessions add column if not exists role text not null default 'customer';
alter table public.user_sessions add column if not exists remember_me boolean not null default false;

create index if not exists idx_user_sessions_role on public.user_sessions (role);
