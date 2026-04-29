-- ChickenCrew — coupon codes migration
-- =====================================
-- Run this once in the Supabase Dashboard → SQL Editor.

-- ============== 1) coupons ==============
CREATE TABLE IF NOT EXISTS public.coupons (
  code             text PRIMARY KEY,
  discount_type    text NOT NULL CHECK (discount_type IN ('pct', 'flat')),
  discount_value   numeric NOT NULL CHECK (discount_value > 0),
  min_order_amount numeric NOT NULL DEFAULT 0 CHECK (min_order_amount >= 0),
  valid_until      timestamptz,
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Only admins can read or modify coupons via the dashboard. The customer-facing
-- /api/coupons/validate endpoint goes through the backend's service-role client,
-- which bypasses RLS, so we don't need a public SELECT policy.
DROP POLICY IF EXISTS "coupons_admin_all" ON public.coupons;
CREATE POLICY "coupons_admin_all"
  ON public.coupons FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles
                  WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles
                       WHERE user_id = auth.uid() AND role = 'admin'));

-- ============== 2) coupon_uses ==============
-- One row per (code, phone) — enforces "one use per phone" policy.
CREATE TABLE IF NOT EXISTS public.coupon_uses (
  code     text NOT NULL REFERENCES public.coupons(code) ON DELETE CASCADE,
  phone    text NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  used_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (code, phone)
);

ALTER TABLE public.coupon_uses ENABLE ROW LEVEL SECURITY;

-- Admins can view usage for analytics. Inserts only happen via backend service role.
DROP POLICY IF EXISTS "coupon_uses_admin_select" ON public.coupon_uses;
CREATE POLICY "coupon_uses_admin_select"
  ON public.coupon_uses FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.user_roles
                  WHERE user_id = auth.uid() AND role = 'admin'));

-- ============== 3) seed first coupon ==============
INSERT INTO public.coupons (code, discount_type, discount_value, min_order_amount, valid_until, is_active)
VALUES ('WELCOME20', 'pct', 20, 599, '2026-05-31 23:59:59+05:30', true)
ON CONFLICT (code) DO UPDATE SET
  discount_type    = EXCLUDED.discount_type,
  discount_value   = EXCLUDED.discount_value,
  min_order_amount = EXCLUDED.min_order_amount,
  valid_until      = EXCLUDED.valid_until,
  is_active        = EXCLUDED.is_active;

-- Verify
SELECT code, discount_type, discount_value, min_order_amount, valid_until, is_active
FROM public.coupons;
