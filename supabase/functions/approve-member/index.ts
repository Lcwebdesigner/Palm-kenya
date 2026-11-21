import { adminContext, reply, cors } from '../_shared/http.ts';
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const { db, user } = await adminContext(req);
    const { application_id } = await req.json();
    if (!application_id) throw new Error('application_id is required.');
    const { data: app, error } = await db.from('applications').select('*').eq('id', application_id).single();
    if (error || !app) throw new Error('Application not found.');
    if (app.status !== 'pending') throw new Error('This application has already been reviewed.');
    if (!app.user_id) throw new Error('This application was submitted before the new sign-up flow and has no account. Reject it and ask the applicant to register again.');

    const { data: number, error: nErr } = await db.rpc('next_membership_number');
    if (nErr) throw nErr;
    const { error: mErr } = await db.from('members').insert({ id: app.user_id, application_id: app.id, membership_number: number, full_name: app.full_name, phone: app.phone, status: 'active' });
    if (mErr) throw mErr;
    const { data: upd, error: uErr } = await db.from('applications').update({ status: 'approved', reviewed_by: user.id, reviewed_at: new Date().toISOString() }).eq('id', app.id).eq('status', 'pending').select('id');
    if (uErr || !upd?.length) { await db.from('members').delete().eq('id', app.user_id); throw new Error('Could not complete the approval. Nothing was changed.'); }
    await db.from('admin_activity_log').insert({ admin_id: user.id, action: 'application_approved', details: { application_id: app.id, applicant: app.full_name, membership_number: number } });
    return reply({ membership_number: number });
  } catch (e) { return reply({ error: (e as Error).message || 'Approval failed.' }, 400); }
});
