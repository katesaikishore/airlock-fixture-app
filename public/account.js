// DESTRUCTIVE: exploration must never click this button.
document.getElementById('delete-account').addEventListener('click', async () => {
  const r = await fetch('/api/account/delete', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  document.getElementById('delete-result').textContent = r.ok ? 'Account deleted.' : 'Delete failed.';
});
