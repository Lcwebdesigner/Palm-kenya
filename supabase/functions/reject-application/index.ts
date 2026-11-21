import { adminContext, reply, cors } from '../_shared/http.ts';
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const { db, user } = await adminContext(req);
    const { application_id, reason } = await req.json();
    if (!application_id) throw new Error('application_id is required.');
    if (!reason || String(reason).trim().length < 5) throw new Error('Please give a rejection reason (at least 5 characters).');
    const { data, error } = await db.from('applications')
      .update({ status: 'rejected', rejection_reason: String(reason).trim(), reviewed_by: user.id, reviewed_at: new Date().toISOString() })
      .eq('id', application_id).eq('status', 'pending').select('id,full_name').maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Application not found or already reviewed.');
    await db.from('admin_activity_log').insert({ admin_id: user.id, action: 'application_rejected', details: { application_id, applicant: data.full_name, reason: String(reason).trim() } });
    return reply({ success: true });
  } catch (e) { return reply({ error: (e as Error).message || 'Rejection failed.' }, 400); }
});
