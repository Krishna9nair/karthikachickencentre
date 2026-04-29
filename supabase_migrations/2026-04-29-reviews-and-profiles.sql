-- ChickenCrew — reviews + customer profiles migration
-- ====================================================
-- Run this once in the Supabase Dashboard → SQL Editor.

-- ============== 1) reviews ==============
CREATE TABLE IF NOT EXISTS public.reviews (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  phone       text,
  rating      smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     text NOT NULL,
  is_approved boolean NOT NULL DEFAULT false,
  order_id    uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reviews_approved_recent_idx
  ON public.reviews (is_approved, created_at DESC);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Public can READ only approved reviews
DROP POLICY IF EXISTS "reviews_public_select" ON public.reviews;
CREATE POLICY "reviews_public_select"
  ON public.reviews FOR SELECT
  USING (is_approved = true);

-- Admins can READ everything (pending + approved)
DROP POLICY IF EXISTS "reviews_admin_select_all" ON public.reviews;
CREATE POLICY "reviews_admin_select_all"
  ON public.reviews FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.user_roles
                  WHERE user_id = auth.uid() AND role = 'admin'));

-- Admins can UPDATE (approve / un-approve)
DROP POLICY IF EXISTS "reviews_admin_update" ON public.reviews;
CREATE POLICY "reviews_admin_update"
  ON public.reviews FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.user_roles
                  WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles
                       WHERE user_id = auth.uid() AND role = 'admin'));

-- Admins can DELETE
DROP POLICY IF EXISTS "reviews_admin_delete" ON public.reviews;
CREATE POLICY "reviews_admin_delete"
  ON public.reviews FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.user_roles
                  WHERE user_id = auth.uid() AND role = 'admin'));

-- INSERT is intentionally NOT exposed to anon clients — backend
-- (service role) handles inserts so we can force is_approved=false
-- and run server-side validation / profanity checks.

-- ============== 2) customer_profiles ==============
CREATE TABLE IF NOT EXISTS public.customer_profiles (
  phone       text PRIMARY KEY,
  name        text NOT NULL,
  address     text,
  lat         double precision,
  lng         double precision,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;

-- No public policies — only the backend (service role) reads / writes
-- this table, so customer addresses aren't enumerable from the browser.

-- Verify
SELECT 'reviews' AS table, count(*) FROM public.reviews
UNION ALL
SELECT 'customer_profiles', count(*) FROM public.customer_profiles;
