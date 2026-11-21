const form = document.getElementById('applicationForm');
// Safety net: if an older register.html is still deployed, add the password fields so registration still works.
if (form && !form.elements.password) {
  const idLabel = form.elements.id_document.closest('label');
  const wrap = document.createElement('div');
  wrap.innerHTML = '<label>Create password *<input name="password" type="password" autocomplete="new-password" required minlength="10" maxlength="72"><span class="help">At least 10 characters. You will use this with your phone number to log in after approval.</span></label><label>Confirm password *<input name="confirm_password" type="password" autocomplete="new-password" required minlength="10" maxlength="72"></label>';
  while (wrap.firstChild) idLabel.parentNode.insertBefore(wrap.firstChild, idLabel);
}
form?.addEventListener('submit', async e => {
  e.preventDefault();
  const msg = document.getElementById('formMessage'), btn = form.querySelector('[type=submit]');
  const fail = t => { msg.textContent = t; msg.className = 'form-message error'; };
  msg.textContent = 'Submitting application…'; msg.className = 'form-message'; btn.disabled = true;
  try {
    const c = requirePalmClient(), f = new FormData(form), file = f.get('id_document');
    if (String(f.get('full_name')).trim().length < 2) return fail('Enter your full names.');
    if (!normalizeKenyanPhone(f.get('phone'))) return fail('Enter a valid Kenyan phone number, e.g. 0712345678.');
    if (f.get('password') !== f.get('confirm_password')) return fail('Passwords do not match.');
    if (String(f.get('password')).length < 10) return fail('Your password must be at least 10 characters.');
    if (!file || !file.size) return fail('Upload your ID document.');
    if (file.size > 5 * 1024 * 1024) return fail('The ID file must be 5 MB or smaller.');
    if (!['image/jpeg', 'image/png', 'application/pdf'].includes(file.type)) return fail('Only JPG, PNG or PDF files are accepted.');
    f.delete('confirm_password');
    const { data, error } = await c.functions.invoke('register-member', { body: f });
    if (error) { let m = 'Registration could not be completed. Please try again.'; try { const j = await error.context.json(); if (j?.error) m = j.error; } catch (_) {} return fail(m); }
    if (data?.error) return fail(data.error);
    form.reset();
    msg.textContent = 'Application submitted. You will be able to log in with your phone number and password once the foundation approves it.';
    msg.className = 'form-message success';
  } catch (err) { fail(err.message || 'Unable to submit application.'); }
  finally { btn.disabled = false; }
});
