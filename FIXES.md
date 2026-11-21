# Changes in this version

## New membership flow (no activation codes)
1. Applicant registers: full names, phone, password, ID document. Account is created immediately but has NO access.
2. Admin approves in the dashboard -> membership number is generated and the applicant can log in with phone number + password.
3. Before approval, login says the application is pending (or rejected, with the reason). Suspended members cannot sign in.

## News
Edit mode with banner, replace/remove cover image, publish/unpublish, delete (confirm + image cleanup), draft/published labels, and real errors if a save is blocked. News actions appear in the activity log.

## Deployment order (important)
1. Deploy functions: register-member, approve-member, reject-application, get-id-document-url, update-member, set-member-status.
2. Upload the new website files.
3. Run supabase/patches/001_fix_live_database.sql, then 002_no_activation_codes.sql.
4. In Supabase > Edge Functions, DELETE the old activate-member and regenerate-activation functions.
5. Applications submitted under the old flow (no account) cannot be approved: reject them; the applicant registers again.
