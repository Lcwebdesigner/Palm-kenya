import { adminContext, reply, cors } from '../_shared/http.ts';
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const { db, user } = await adminContext(req);
    const { application_id } = await req.json();
    if (!application_id) throw new Error('application_id is required.');
    const { data: app, error } = await db.from('applications').select('id,full_name,id_file_path').eq('id', application_id).maybeSingle();
    if (error || !app) throw new Error('Application not found.');
    const { data, error: sErr } = await db.storage.from('id-documents').createSignedUrl(app.id_file_path, 60);
    if (sErr || !data) throw new Error('Could not open the ID document. The file may be missing.');
    await db.from('admin_activity_log').insert({ admin_id: user.id, action: 'id_document_viewed', details: { application_id, applicant: app.full_name } });
    return reply({ signed_url: data.signedUrl, expires_in_seconds: 60 });
  } catch (e) { return reply({ error: (e as Error).message || 'Could not open document.' }, 400); }
});
