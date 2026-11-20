/* Public Supabase configuration. The anon/publishable key is safe for browser use
   only when Row Level Security is enabled and policies are correctly configured. */
(() => {
  const SUPABASE_URL = 'YOUR_SUPABASE_PROJECT_URL';
  const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY';
  window.requirePalmClient = function () {
    if (!window.supabase?.createClient) throw new Error('Supabase library did not load. Check your internet connection.');
    if (SUPABASE_URL.includes('YOUR_') || SUPABASE_ANON_KEY.includes('YOUR_')) throw new Error('Website setup is incomplete. Add your Supabase URL and anon/publishable key in js/supabase-config.js.');
    if (!window.__palmSupabase) window.__palmSupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return window.__palmSupabase;
  };
  window.memberAuthEmail = n => `${String(n).toLowerCase()}@members.palmfoundation.internal`;
})();
