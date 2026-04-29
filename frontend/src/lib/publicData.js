// Fetches public product + today's price data directly from Supabase.
// Uses a localStorage cache (60s TTL) so repeat visits / fast navigations
// render instantly from cache, then revalidate in the background.
import { supabase } from './supabaseClient';

const CACHE_KEY = 'cc_products_v1';
const CACHE_TTL_MS = 60 * 1000; // 60s

const readCache = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (!ts || !Array.isArray(data)) return null;
    if (Date.now() - ts > CACHE_TTL_MS) return { stale: true, data };
    return { stale: false, data };
  } catch (_) {
    return null;
  }
};

const writeCache = (data) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
  } catch (_) {}
};

async function fetchFresh() {
  // Hard timeout so a hanging Supabase request never leaves the UI stuck on
  // "Loading today's board…" forever (common on slow mobile networks).
  const TIMEOUT_MS = 8000;
  const withTimeout = (promise, label) =>
    Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`${label} timed out`)), TIMEOUT_MS)
      ),
    ]);

  const [{ data: products, error: pErr }, { data: prices, error: prErr }] = await Promise.all([
    withTimeout(
      supabase
        .from('products')
        .select('id, name, description, image_url, unit, sort_order, is_active')
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
      'products'
    ),
    withTimeout(
      supabase
        .from('daily_prices')
        .select('product_id, price_per_unit, price_date')
        .order('price_date', { ascending: false })
        .limit(500),
      'daily_prices'
    ),
  ]);

  if (pErr) throw pErr;
  if (prErr) throw prErr;

  const today = new Date().toISOString().slice(0, 10);
  const priceMap = {};
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

  const merged = (products || []).map((p) => ({ ...p, price: priceMap[p.id] ?? null }));
  writeCache(merged);
  return merged;
}

// Returns cached data immediately if fresh; if stale, returns cached + triggers
// a background revalidation via the optional onRevalidate callback. If no
// cache exists and the network call fails/times out, the error bubbles up so
// the UI can show a retry button.
export async function fetchPublicProducts({ onRevalidate } = {}) {
  const cached = readCache();
  if (cached && !cached.stale) return cached.data;

  if (cached && cached.stale) {
    // Stale cache exists — try to refresh in background, but never block the
    // UI on it. If the refresh fails (slow network, Supabase down), we keep
    // showing stale prices instead of an empty board.
    fetchFresh()
      .then((fresh) => {
        if (onRevalidate) onRevalidate(fresh);
      })
      .catch(() => {});
    return cached.data;
  }

  // No cache at all — must fetch fresh. If this fails the caller handles it.
  return fetchFresh();
}

const SHOP_KEY = 'cc_shop_v1';
const SHOP_TTL = 5 * 60 * 1000;

export async function fetchPublicShop() {
  try {
    const raw = localStorage.getItem(SHOP_KEY);
    if (raw) {
      const { ts, data } = JSON.parse(raw);
      if (Date.now() - ts < SHOP_TTL && data) return data;
    }
  } catch (_) {}

  const { data, error } = await supabase
    .from('shop_settings')
    .select('id, shop_name, contact_phone, address, notice, upi_id, updated_at')
    .limit(1)
    .maybeSingle();
  if (error) throw error;

  try {
    localStorage.setItem(SHOP_KEY, JSON.stringify({ ts: Date.now(), data: data || {} }));
  } catch (_) {}
  return data || {};
}
