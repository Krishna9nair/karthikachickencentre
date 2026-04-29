-- ChickenCrew — delivery slots migration
-- ======================================
-- Run this once in the Supabase Dashboard → SQL Editor.

-- 1) Add delivery slot columns to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_slot_label text,   -- e.g. "9:00 AM – 11:00 AM"
  ADD COLUMN IF NOT EXISTS delivery_slot_start time,   -- e.g. '09:00'
  ADD COLUMN IF NOT EXISTS delivery_slot_end   time,   -- e.g. '11:00'
  ADD COLUMN IF NOT EXISTS delivery_slot_date  date;   -- e.g. 2026-04-29

CREATE INDEX IF NOT EXISTS orders_delivery_slot_idx
  ON public.orders (delivery_slot_date, delivery_slot_start);

-- 2) Per-slot disable list (admin can block a specific slot on a specific date)
CREATE TABLE IF NOT EXISTS public.disabled_slots (
  slot_date  date NOT NULL,
  slot_start time NOT NULL,
  reason     text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (slot_date, slot_start)
);

ALTER TABLE public.disabled_slots ENABLE ROW LEVEL SECURITY;

-- Public reads allowed so the checkout dialog can hide disabled slots.
DROP POLICY IF EXISTS "disabled_slots_public_select" ON public.disabled_slots;
CREATE POLICY "disabled_slots_public_select"
  ON public.disabled_slots FOR SELECT
  USING (true);

-- Only admins can write.
DROP POLICY IF EXISTS "disabled_slots_admin_write" ON public.disabled_slots;
CREATE POLICY "disabled_slots_admin_write"
  ON public.disabled_slots FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles
                  WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles
                       WHERE user_id = auth.uid() AND role = 'admin'));

-- Verify
SELECT column_name FROM information_schema.columns
 WHERE table_schema = 'public' AND table_name = 'orders'
   AND column_name LIKE 'delivery_slot%';
