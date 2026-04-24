-- Roles enum and table (security best practice: separate from profiles)
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Updated-at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Products (chicken cuts)
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  unit TEXT NOT NULL DEFAULT 'kg',
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active products"
  ON public.products FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage products"
  ON public.products FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_products_updated
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Daily prices
CREATE TABLE public.daily_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  price_per_unit NUMERIC(10,2) NOT NULL CHECK (price_per_unit >= 0),
  price_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, price_date)
);

ALTER TABLE public.daily_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view prices"
  ON public.daily_prices FOR SELECT
  USING (true);

CREATE POLICY "Admins manage prices"
  ON public.daily_prices FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_daily_prices_updated
  BEFORE UPDATE ON public.daily_prices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Shop settings (single row)
CREATE TABLE public.shop_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_name TEXT NOT NULL DEFAULT 'Fresh Chicken',
  upi_id TEXT NOT NULL DEFAULT 'yourshop@upi',
  contact_phone TEXT,
  address TEXT,
  notice TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shop_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view shop settings"
  ON public.shop_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins manage shop settings"
  ON public.shop_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_shop_settings_updated
  BEFORE UPDATE ON public.shop_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.shop_settings (shop_name, upi_id, contact_phone, address)
VALUES ('Fresh Cluck Chicken Co.', 'yourshop@upi', '+91 90000 00000', 'Main Road, Your City');

-- Orders
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT,
  items JSONB NOT NULL,
  total_amount NUMERIC(10,2) NOT NULL CHECK (total_amount >= 0),
  payment_status TEXT NOT NULL DEFAULT 'pending',
  upi_txn_ref TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can place an order"
  ON public.orders FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins view all orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete orders"
  ON public.orders FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_orders_updated
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial products
INSERT INTO public.products (name, description, unit, sort_order) VALUES
  ('Whole Chicken (with skin)', 'Fresh farm chicken, dressed and cleaned', 'kg', 1),
  ('Whole Chicken (skinless)', 'Skinless whole bird, ready to cook', 'kg', 2),
  ('Chicken Curry Cut', 'Bone-in pieces, perfect for curries', 'kg', 3),
  ('Boneless Breast', 'Lean white meat, skinless', 'kg', 4),
  ('Chicken Legs', 'Juicy whole legs with thighs', 'kg', 5),
  ('Chicken Wings', 'Tender wings, ideal for fry & grill', 'kg', 6),
  ('Chicken Liver', 'Fresh liver, cleaned', 'kg', 7),
  ('Country Chicken', 'Free-range desi murgi', 'kg', 8);

INSERT INTO public.daily_prices (product_id, price_per_unit, price_date)
SELECT id, 
  CASE name
    WHEN 'Whole Chicken (with skin)' THEN 220
    WHEN 'Whole Chicken (skinless)' THEN 260
    WHEN 'Chicken Curry Cut' THEN 280
    WHEN 'Boneless Breast' THEN 360
    WHEN 'Chicken Legs' THEN 300
    WHEN 'Chicken Wings' THEN 250
    WHEN 'Chicken Liver' THEN 180
    WHEN 'Country Chicken' THEN 480
  END,
  CURRENT_DATE
FROM public.products;-- 1. Restrict shop_settings SELECT to admins only
DROP POLICY IF EXISTS "Anyone can view shop settings" ON public.shop_settings;

CREATE POLICY "Admins view full shop settings"
ON public.shop_settings
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Public view exposing only non-sensitive fields
CREATE OR REPLACE VIEW public.shop_settings_public
WITH (security_invoker = true) AS
SELECT id, shop_name, address, notice, updated_at
FROM public.shop_settings;

GRANT SELECT ON public.shop_settings_public TO anon, authenticated;

-- 3. Drop public INSERT on orders (now goes through edge function with service role)
DROP POLICY IF EXISTS "Anyone can place an order" ON public.orders;

-- 4. Explicit deny for non-admins inserting into user_roles (defense in depth)
CREATE POLICY "Non-admins cannot self-assign roles"
ON public.user_roles
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));DROP VIEW IF EXISTS public.shop_settings_public;
CREATE VIEW public.shop_settings_public
WITH (security_invoker = true) AS
SELECT id, shop_name, address, notice, contact_phone, updated_at
FROM public.shop_settings;
GRANT SELECT ON public.shop_settings_public TO anon, authenticated;UPDATE public.shop_settings SET address = 'Kartika Chicken Center, Dombivli, Trimurti Nagar, Dombivli East, Thane, Kalyan, Maharashtra 421201', updated_at = now();ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_lat numeric(10,7),
  ADD COLUMN IF NOT EXISTS delivery_lng numeric(10,7);ALTER TABLE public.shop_settings ADD COLUMN IF NOT EXISTS rider_passcode text NOT NULL DEFAULT 'rider123';

-- Add the passcode column to the public view as well so riders can read it without auth
DROP VIEW IF EXISTS public.shop_settings_public;
CREATE VIEW public.shop_settings_public
WITH (security_invoker = true)
AS
SELECT id, shop_name, contact_phone, address, notice, updated_at, rider_passcode
FROM public.shop_settings;

GRANT SELECT ON public.shop_settings_public TO anon, authenticated;

-- Allow public (anon) read of pending/paid orders for the rider view
CREATE POLICY "Public can view active orders for delivery"
ON public.orders
FOR SELECT
TO anon, authenticated
USING (payment_status IN ('pending', 'paid'));-- 1. Recreate public view WITHOUT rider_passcode
DROP VIEW IF EXISTS public.shop_settings_public;
CREATE VIEW public.shop_settings_public
WITH (security_invoker = true) AS
SELECT id, shop_name, contact_phone, address, notice, updated_at
FROM public.shop_settings;
GRANT SELECT ON public.shop_settings_public TO anon, authenticated;

-- 2. Remove the overly-permissive public read policy on orders
DROP POLICY IF EXISTS "Public can view active orders for delivery" ON public.orders;

-- Admins keep full access via existing policies. Riders will read via edge function using service role + token check.
