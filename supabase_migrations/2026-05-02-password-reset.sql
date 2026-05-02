-- ChickenCrew — Password reset tokens
-- Stores one-time tokens emailed to customers who forgot their password.
-- Run this once in the Supabase SQL editor.
-- Date: 2026-05-02

create table if not exists public.password_reset_tokens (
    token       text primary key,
    email       text not null,
    expires_at  timestamptz not null,
    used_at     timestamptz,
    created_at  timestamptz not null default now()
);

create index if not exists idx_password_reset_email on public.password_reset_tokens (email);
create index if not exists idx_password_reset_expires on public.password_reset_tokens (expires_at);

alter table public.password_reset_tokens enable row level security;
drop policy if exists prt_service_only on public.password_reset_tokens;
create policy prt_service_only on public.password_reset_tokens
    for all to authenticated, anon
    using (false) with check (false);
