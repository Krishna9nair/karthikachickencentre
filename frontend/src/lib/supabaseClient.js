import { createClient } from '@supabase/supabase-js';

// Public anon credentials. These are designed to be exposed to the browser
// (Supabase enforces row-level security on the server). Env vars override
// them locally; the fallback ensures Vercel/preview deploys never break
// even if env vars are mis-configured.
const SUPABASE_URL =
  process.env.REACT_APP_SUPABASE_URL || 'https://ksgvwlmmsplamtfkuavb.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.REACT_APP_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzZ3Z3bG1tc3BsYW10Zmt1YXZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NjQ3NDQsImV4cCI6MjA5MjU0MDc0NH0.7d4smxNZ3mfMHWtWwcLwCQZoa9IrfeEztFh4HGsvusg';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'fc-admin-session',
  },
});
