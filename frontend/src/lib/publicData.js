// Fetches public product + today's price data directly from Supabase.
// This avoids dependence on the FastAPI proxy for public reads
// (so Vercel / APK still work even if backend is unreachable).
import { supabase } from './supabaseClient';

export async function fetchPublicProducts() {
  const [{ data: products, error: pErr }, { data: prices, error: prErr }] = await Promise.all([
    supabase
      .from('products')
      .select('id, name, description, image_url, unit, sort_order, is_active')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    supabase
      .from('daily_prices')
      .select('product_id, price_per_unit, price_date')
      .order('price_date', { ascending: false })
      .limit(500),
  ]);

  if (pErr) throw pErr;
  if (prErr) throw prErr;

  const today = new Date().toISOString().slice(0, 10);
  const priceMap = {};
  // Prefer today's price; else fall back to latest known price per product
  for (const row of prices || []) {
    if (row.price_date === today && !(row.product_id in priceMap)) {
      priceMap[row.product_id] = Number(row.price_per_unit);
    }
  }
  for (const row of prices || []) {
    if (!(row.product_id in priceMap)) {
      priceMap[row.product_id] = Number(row.price_per_unit);
    }
  }

  return (products || []).map((p) => ({ ...p, price: priceMap[p.id] ?? null }));
}

export async function fetchPublicShop() {
  const { data, error } = await supabase
    .from('shop_settings')
    .select('id, shop_name, contact_phone, address, notice, upi_id, updated_at')
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data || {};
}
