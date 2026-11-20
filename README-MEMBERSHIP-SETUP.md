# Palm Foundation Kenya — Membership & Admin Portal

This upgrade adds a membership application workflow, secure admin review, automatic membership numbers, first-time password activation, member login/dashboard, and an admin news manager. It retains the existing static website and green visual identity.

## Important workflow

1. Applicant enters full names and phone number and uploads an ID document (JPG, PNG or PDF, maximum 5 MB).
2. The application is stored with `pending` status. Applicants cannot view or edit submitted applications.
3. An authorised admin signs in and reviews the application and ID file.
4. On approval, the system creates a unique number such as `PALM-2026-0001` and a one-time activation code valid for 7 days.
5. The admin must privately send both details to the applicant. The code is displayed once in the admin screen; it is not emailed or texted automatically.
6. The member enters the membership number and activation code and creates their own password (minimum 10 characters).
7. Thereafter, the member signs in using membership number + password.
8. Admins can publish news and optional JPG/PNG cover images. Published news appears on the public News page and home page.

## 1. Create Supabase project

1. Create a project at https://supabase.com/.
2. Open **Project Settings → API** and copy the Project URL and anon/publishable key.
3. Edit `js/supabase-config.js` and replace `YOUR_SUPABASE_PROJECT_URL` and `YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY`.
4. In **SQL Editor**, run the complete contents of `supabase/schema.sql`.

## 2. Create the first administrator

1. In Supabase, open **Authentication → Users → Add user**.
2. Create the foundation administrator using an official foundation email and a strong password. Confirm the email if prompted.
3. Copy that user's UUID.
4. In SQL Editor, run this command after replacing the placeholder:

```sql
insert into public.admins(user_id) values ('PASTE_AUTH_USER_UUID_HERE');
```

Only users whose UUID is in `public.admins` can use the admin dashboard. Do not add members to this table.

## 3. Deploy the Edge Functions

Install the Supabase CLI and sign in, then from this project directory run:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy approve-member
supabase functions deploy activate-member
```

The functions use the project's built-in `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` secrets. Supabase provides these to deployed Edge Functions. Never paste the service-role key into website JavaScript, GitHub Pages, or a public file.

## 4. Publish the website

Upload the contents of this folder to your GitHub repository (the files inside `THE-Palm-Foundation-Kenya-Upgrade`, not the enclosing folder if you want `index.html` at the repository root). Keep the directory structure intact. GitHub Pages can serve the static public site; Supabase handles authentication, database and private file storage.

Pages added:
- `member/register.html` — membership application
- `member/login.html` — member login and first-time activation
- `member/dashboard.html` — member area
- `admin/login.html` — administrator login
- `admin/dashboard.html` — review applications and manage news
- `news.html` — public news feed

## 5. Test before launch

- Submit a test application with a test ID file.
- Sign in as the administrator and verify that the application appears.
- Open the ID document from the admin dashboard and test approve/reject.
- On approval, copy the membership number and activation code and share them privately with the test applicant.
- Activate the member account by setting a password; then test sign-in and sign-out.
- Publish a test news item and verify it appears on the home page and News page.
- Test on a phone and desktop.

## Privacy and security notes

- National ID documents are stored in a **private** Supabase Storage bucket. Only admins can create signed viewing links. Do not move ID files to the public news-images bucket.
- Public visitors can submit applications but cannot read the applications table.
- Passwords are handled by Supabase Auth; the website does not store plaintext passwords.
- The first-login activation code expires after 7 days and is stored only as a SHA-256 hash. Admins should send the displayed code privately and never post it publicly.
- The admin service-role key is used only inside Supabase Edge Functions and must never be added to the GitHub repository.
- Add a privacy notice and retention/deletion policy approved by the foundation before collecting real National ID documents. Collect only the identity data the foundation has a lawful, necessary reason to process. Restrict admin access and enable MFA for administrator accounts.
- This package is a technical starter, not legal advice or proof of regulatory compliance. Have the foundation confirm its membership criteria and data-protection obligations before launch.

## Configuration reminder

The website will display a setup error until the Supabase URL and anon/publishable key are entered in `js/supabase-config.js`, the SQL is run, and the Edge Functions are deployed. No real admin account or Supabase project has been created by this ZIP.
