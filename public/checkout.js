const FIXED = document.body.dataset.fixed === '1';
document.getElementById('checkout-form').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const btn = document.getElementById('pay');
  const out = document.getElementById('checkout-result');
  if (FIXED) btn.disabled = true; // seeded: the button stays clickable without FIXED=1, so a double click pays twice
  const r = await fetch('/api/checkout', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sku: document.getElementById('sku').value, qty: Number(document.getElementById('qty').value) }),
  });
  const b = await r.json();
  out.textContent = r.ok ? 'Order ' + b.orderId + ' total ' + (b.total / 100).toFixed(2) : 'Error: ' + b.error;
  if (FIXED) btn.disabled = false;
});
