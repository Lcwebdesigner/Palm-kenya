import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { reply, cors } from '../_shared/http.ts';

const DOMAIN = 'members.palmfoundation.internal'; // must match js/supabase-config.js

function normalizePhone(input: string): string | null {
  const d = (input || '').replace(/[^0-9+]/g, '');
  if (/^\+254[17][0-9]{8}$/.test(d)) return d;
  if (/^254[17][0-9]{8}$/.test(d)) return '+' + d;
  if (/^0[17][0-9]{8}$/.test(d)) return '+254' + d.slice(1);
  return null;
}
function detectType(b: Uint8Array): { mime: string; ext: string } | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg' };
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { mime: 'image/png', ext: 'png' };
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return { mime: 'application/pdf', ext: 'pdf' };
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  let createdUserId: string | null = null;
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  let path: string | null = null;
  try {
    const form = await req.formData();
    const full_name = String(form.get('full_name') || '').trim();
    const phone = normalizePhone(String(form.get('phone') || ''));
    const password = String(form.get('password') || '');
    const file = form.get('id_document');
    if (full_name.length < 2 || full_name.length > 120) throw new Error('Enter your full names.');
    if (!phone) throw new Error('Enter a valid Kenyan phone number, e.g. 0712345678.');
    if (password.length < 10 || password.length > 72) throw new Error('Your password must be 10 to 72 characters.');
    if (!(file instanceof File) || file.size === 0) throw new Error('Upload your ID document.');
    if (file.size > 5 * 1024 * 1024) throw new Error('The ID file must be 5 MB or smaller.');
    const bytes = new Uint8Array(await file.arrayBuffer());
    const type = detectType(bytes);
    if (!type) throw new Error('Only JPG, PNG or PDF files are accepted.');

    const { data: open } = await db.from('applications').select('id').eq('phone', phone).in('status', ['pending', 'approved']).limit(1);
    if (open && open.length) throw new Error('This phone number already has an application. Please log in, or contact the foundation.');

    const email = `${phone.slice(1)}@${DOMAIN}`;
    const { data: created, error: cErr } = await db.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name } });
    if (cErr || !created.user) {
      console.error('createUser failed', cErr?.message);
      if (/already|registered|exists/i.test(cErr?.message || '')) throw new Error('This phone number is already registered. Please log in, or contact the foundation.');
      throw new Error('We could not create your account right now. Please try again or contact the foundation.');
    }
    createdUserId = created.user.id;

    path = `${createdUserId}/${crypto.randomUUID()}.${type.ext}`;
    const { error: upErr } = await db.storage.from('id-documents').upload(path, bytes, { contentType: type.mime, upsert: false });
    if (upErr) throw new Error('Your ID document could not be uploaded. Please try again.');

    const { error: insErr } = await db.from('applications').insert({ user_id: createdUserId, full_name, phone, id_file_path: path });
    if (insErr) throw new Error('Your application could not be saved. Please try again.');
    return reply({ success: true });
  } catch (e) {
    if (path) await db.storage.from('id-documents').remove([path]);
    if (createdUserId) await db.auth.admin.deleteUser(createdUserId);
    return reply({ error: (e as Error).message || 'Registration failed.' }, 400);
  }
});
