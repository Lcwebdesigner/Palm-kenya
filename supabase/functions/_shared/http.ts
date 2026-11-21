// Shared helpers for all Palm Foundation Edge Functions.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

export async function hash(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function newActivationCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 symbols, no I/O/0/1
  return Array.from(crypto.getRandomValues(new Uint8Array(9))).map((b) => alphabet[b % 32]).join('');
}

// Verifies the caller's session token AND that the user is listed in public.admins.
export async function adminContext(req: Request) {
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) throw new Error('Authentication required. Please sign in again.');
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) throw new Error('Your session has expired. Please sign in again.');
  const { data: admin } = await db.from('admins').select('user_id').eq('user_id', data.user.id).maybeSingle();
  if (!admin) throw new Error('You are not authorised to perform this action.');
  return { db, user: data.user };
}
