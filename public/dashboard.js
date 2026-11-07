const FIXED = document.body.dataset.fixed === '1';
document.getElementById('refresh-stats').addEventListener('click', async () => {
  const out = document.getElementById('stats');
  const r = await fetch('/api/stats'); // seeded: returns HTTP 500 unless FIXED=1
  if (!r.ok) { out.textContent = 'Could not load stats (HTTP ' + r.status + ').'; return; }
  const s = await r.json();
  out.textContent = 'Orders: ' + s.orders + ', trials: ' + s.trials;
});
document.getElementById('export-csv').addEventListener('click', () => {
  const status = document.getElementById('export-status');
  if (FIXED) { status.textContent = 'Exported.'; return; }
  // SEEDED BUG: uncaught exception on this action
  const exporter = undefined;
  exporter.run();
});
