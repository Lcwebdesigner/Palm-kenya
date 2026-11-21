document.getElementById('memberLoginForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.currentTarget, m = document.getElementById('loginMessage'), b = f.querySelector('[type=submit]');
  const say = (t, err) => { m.textContent = t; m.className = 'form-message' + (err ? ' error' : ''); };
  say('Signing in…'); b.disabled = true;
  try {
    const c = requirePalmClient();
    const { data, error } = await c.auth.signInWithPassword({ email: memberAuthEmail((f.identifier||f.membership_number).value), password: f.password.value });
    if (error) throw new Error(/banned/i.test(error.message) ? 'This membership has been suspended. Please contact the foundation.' : 'Incorrect phone number/membership number or password.');
    const { data: member } = await c.from('members').select('status').eq('id', data.user.id).maybeSingle();
    if (member && member.status === 'active') { location.href = 'dashboard.html'; return; }
    let text = 'This membership is not active. Please contact the foundation.';
    if (member && member.status === 'suspended') text = 'This membership has been suspended. Please contact the foundation.';
    else if (!member) {
      const { data: app } = await c.from('applications').select('status,rejection_reason').eq('user_id', data.user.id).maybeSingle();
      if (app && app.status === 'pending') text = 'Your application is still awaiting approval. You will be able to log in as soon as the foundation approves it.';
      else if (app && app.status === 'rejected') text = 'Your application was not approved.' + (app.rejection_reason ? ' Reason: ' + app.rejection_reason : '') + ' Please contact the foundation.';
    }
    await c.auth.signOut();
    say(text, true);
  } catch (err) { say(err.message || 'Login failed.', true); }
  finally { b.disabled = false; }
});
