-- ChickenCrew — Sunday Spinning Wheel migration
-- =============================================
-- Run once in Supabase Dashboard → SQL Editor.

-- 1) Spin log: one row per (phone, week-of-Sunday). Enforces "one spin per
--    phone per Sunday" via the composite PK.
CREATE TABLE IF NOT EXISTS public.wheel_spins (
  phone        text NOT NULL,
  spin_date    date NOT NULL,                  -- the Sunday they spun (IST)
  prize_label  text NOT NULL,                  -- "5% off", "₹50 off", "Better luck next time", etc.
  prize_kind   text NOT NULL,                  -- 'pct' | 'flat' | 'none'
  prize_value  numeric NOT NULL DEFAULT 0,     -- 5 / 10 / 15 / 50 / 75 / 0
  coupon_code  text REFERENCES public.coupons(code) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (phone, spin_date)
);

ALTER TABLE public.wheel_spins ENABLE ROW LEVEL SECURITY;

-- Admin can read all spins (analytics). Writes happen via service role.
DROP POLICY IF EXISTS "wheel_spins_admin_select" ON public.wheel_spins;
CREATE POLICY "wheel_spins_admin_select"
  ON public.wheel_spins FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.user_roles
                  WHERE user_id = auth.uid() AND role = 'admin'));

-- 2) Add admin toggle to shop_settings
ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS sunday_wheel_enabled boolean NOT NULL DEFAULT true;

-- Verify
SELECT column_name FROM information_schema.columns
 WHERE table_schema = 'public' AND table_name = 'shop_settings'
   AND column_name = 'sunday_wheel_enabled';
SELECT count(*) AS spins FROM public.wheel_spins;
