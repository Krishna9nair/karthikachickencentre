-- ChickenCrew — products.unit migration
-- =====================================
-- Optional defense-in-depth: enforce only 'kg' | 'dzn' | 'piece' at DB level.
-- Run this once in the Supabase Dashboard → SQL Editor.
-- Backwards compatible with existing rows (already canonicalised in app code).

-- 1) Default value if a row is inserted without a unit:
ALTER TABLE public.products
  ALTER COLUMN unit SET DEFAULT 'kg';

-- 2) Disallow NULL units:
UPDATE public.products SET unit = 'kg' WHERE unit IS NULL;
ALTER TABLE public.products
  ALTER COLUMN unit SET NOT NULL;

-- 3) CHECK constraint — only the three canonical values allowed:
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_unit_check'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_unit_check
      CHECK (unit IN ('kg', 'dzn', 'piece'));
  END IF;
END $$;

-- 4) RLS: ensure only authenticated admins can update the unit field.
-- (If you already have an admin update policy on products, this is unchanged.)
-- Example policy reference (don't run if it already exists):
--
-- CREATE POLICY "products_admin_write"
--   ON public.products
--   FOR ALL
--   USING ( EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin') )
--   WITH CHECK ( EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin') );

-- Verify:
SELECT id, name, unit FROM public.products ORDER BY sort_order;
