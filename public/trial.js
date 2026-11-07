document.getElementById('trial-form').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const out = document.getElementById('trial-result');
  const email = document.getElementById('email');
  if (email.hasAttribute('required') && !email.value) { out.textContent = 'Email is required.'; return; }
  const r = await fetch('/api/trial', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: email.value }) });
  out.textContent = r.ok ? 'Trial started.' : 'Error: ' + (await r.json()).error;
});
