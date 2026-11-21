/* Public Supabase configuration. The anon/publishable key is safe for browser use
   only when Row Level Security is enabled and policies are correctly configured. */
(() => {
  const SUPABASE_URL = 'https://sqyzdpuucpjhbtdwhsgp.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_a4sQVSXPYNbzQbHSqCjVaw_ifW_B0uD';
  window.requirePalmClient = function () {
    if (!window.supabase?.createClient) throw new Error('Supabase library did not load. Check your internet connection.');
    if (SUPABASE_URL.includes('YOUR_') || SUPABASE_ANON_KEY.includes('YOUR_')) throw new Error('Website setup is incomplete. Add your Supabase URL and anon/publishable key in js/supabase-config.js.');
    if (!window.__palmSupabase) window.__palmSupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return window.__palmSupabase;
  };
  window.normalizeKenyanPhone = v => { const d = String(v || '').replace(/[^0-9+]/g, ''); if (/^\+254[17][0-9]{8}$/.test(d)) return d; if (/^254[17][0-9]{8}$/.test(d)) return '+' + d; if (/^0[17][0-9]{8}$/.test(d)) return '+254' + d.slice(1); return null; };
  window.memberAuthEmail = id => { const v = String(id).trim(); if (/^palm-/i.test(v)) return `${v.toLowerCase()}@members.palmfoundation.internal`; const p = window.normalizeKenyanPhone(v); if (!p) throw new Error('Enter a valid phone number (e.g. 0712345678) or your membership number.'); return `${p.slice(1)}@members.palmfoundation.internal`; };
})();
