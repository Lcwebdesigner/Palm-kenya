import { adminContext, reply, cors } from '../_shared/http.ts';
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const { db, user } = await adminContext(req);
    const { member_id, status, reason } = await req.json();
    if (!member_id) throw new Error('member_id is required.');
    if (!['active', 'suspended'].includes(status)) throw new Error('Status must be active or suspended.');
    if (!reason || String(reason).trim().length < 5) throw new Error('Please give a reason (at least 5 characters).');
    const { data: m, error: fErr } = await db.from('members').select('id,membership_number,status').eq('id', member_id).maybeSingle();
    if (fErr || !m) throw new Error('Member not found.');
    if (m.status === status) throw new Error(`Member is already ${status}.`);
    const { error } = await db.from('members').update({ status, suspension_reason: status === 'suspended' ? String(reason).trim() : null, updated_by: user.id }).eq('id', member_id);
    if (error) throw error;
    // Revoke access immediately: ban blocks sign-in and token refresh for suspended members.
    await db.auth.admin.updateUserById(member_id, { ban_duration: status === 'suspended' ? '876000h' : 'none' });
    await db.from('admin_activity_log').insert({ admin_id: user.id, action: status === 'suspended' ? 'member_suspended' : 'member_reactivated', details: { member_id, membership_number: m.membership_number, reason: String(reason).trim() } });
    return reply({ success: true });
  } catch (e) { return reply({ error: (e as Error).message || 'Status change failed.' }, 400); }
});
