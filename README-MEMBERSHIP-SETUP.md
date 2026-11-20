# Palm Foundation Kenya — Membership and Administration Portal

This package includes a static public website and a Supabase-backed membership/admin portal. It is a deployment starter; it is **not connected to a live Supabase project** until you configure one.

## Features included in this codebase
- Administrator sign-in with an explicit `public.admins` allowlist.
- Admin dashboard overview, application queue, member directory, news management and activity view.
- Application review with secure, short-lived signed ID-document links.
- Approval creates a unique membership number and one-time activation code (valid for seven days).
- Rejection requires a reason.
- Member profile updates and active/suspended status changes through Edge Functions.
- Public news feed and member news feed.
- Private ID-document bucket and public news-image bucket.
- Realtime application/member refresh with a 60-second polling fallback.

## 1. Create and configure Supabase
1. Create a Supabase project.
2. Copy the Project URL and anon/publishable key from Project Settings → API.
3. Put them in `js/supabase-config.js` (these are public browser values; never put the service-role key there).
4. Run the full `supabase/schema.sql` in the Supabase SQL Editor.
5. Enable email/password authentication. The membership activation flow creates internal email identities, so do not expose those credentials to members; members use their membership number in the portal.

## 2. Create the first administrator
1. In Supabase Authentication → Users, create the foundation administrator with a strong password and confirm the email.
2. Copy the Auth user's UUID.
3. Run this SQL, replacing the UUID:

```sql
insert into public.admins(user_id, role)
values ('YOUR_AUTH_USER_UUID', 'super_admin');
```

Only users listed in `public.admins` can access the admin portal. Do not make a public admin registration page.

## 3. Deploy Edge Functions
Install the Supabase CLI, then from the project root:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy approve-member
supabase functions deploy reject-application
supabase functions deploy activate-member
supabase functions deploy get-id-document-url
supabase functions deploy update-member
supabase functions deploy set-member-status
supabase functions deploy regenerate-activation
```

Supabase supplies `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` to deployed functions. Never commit or paste the service-role key into frontend files, source control or public hosting.

## 4. Deploy the website
Publish the repository root using GitHub Pages, Netlify or Vercel. Keep all folders in their current relative locations. The site uses Supabase for data, authentication and file storage.

## 5. Test using dummy data first
- Submit an application with a dummy ID document.
- Sign in as the allowlisted admin and verify it appears.
- Open its ID link (expires after 60 seconds).
- Approve it and privately copy the one-time activation code immediately; it is only returned once.
- Activate the member account with a password of at least 10 characters.
- Sign in using the membership number and password.
- Test member editing and suspension/reactivation.
- Create, edit, publish, unpublish and delete a dummy news item.
- Test on mobile and desktop and inspect browser/Edge Function logs.

## Important limitations / launch checks
- This ZIP cannot create or configure your actual Supabase project, first admin account, DNS, or production secrets.
- The first admin must be added manually as described above.
- ID uploads are sensitive personal data. The current public insert policy allows anonymous applicants to upload into the private ID bucket; restrict abuse with appropriate rate limiting/bot protection before public launch.
- The news image bucket is public by design; never upload identity documents there.
- Review and approve the privacy notice, lawful basis, retention period, access process and deletion policy before collecting real ID documents. Enable MFA for admin accounts.
- The frontend currently provides basic member editing and status controls. A formal audit trail is recorded for privileged Edge Function actions; review policies and test all permissions before production.
- This is technical implementation guidance, not legal advice or a guarantee of regulatory compliance.
