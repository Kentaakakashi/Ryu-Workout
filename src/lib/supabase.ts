import { createClient } from '@supabase/supabase-js';

// Publishable keys are designed for browser apps. Never put a service-role/secret key here.
const projectUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nsvilcoeblbiohqndepz.supabase.co';
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_suqgW7RnT2V8v1it4qanLQ_dXE_ZXFD';

export const supabase = createClient(projectUrl, publishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
