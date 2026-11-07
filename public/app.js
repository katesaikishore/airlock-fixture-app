// Shared: show the trial banner once the (possibly time-warped) browser clock is past the trial end.
(async function () {
  try {
    const r = await fetch('/api/account');
    if (!r.ok) return;
    const a = await r.json();
    if (a.plan !== 'trial' || !a.trialStart) return;
    const endsAt = new Date(a.trialStart).getTime() + 14 * 24 * 3600 * 1000;
    if (Date.now() > endsAt) {
      const b = document.getElementById('trial-banner');
      b.textContent = 'Your free trial has expired.';
      b.hidden = false;
    }
  } catch (e) { /* offline: no banner */ }
})();
