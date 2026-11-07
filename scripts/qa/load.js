// Bounded load: 20 concurrent workers for 20 seconds against BASE_URL, cycling over a few GET paths.
// Fails on a p95 latency above 1000 ms, any 5xx response, or any request that gets no response.
const { BASE_URL } = require('./common.js');

const CONCURRENCY = 20;
const DURATION_MS = 20_000;
const P95_LIMIT_MS = 1000;
const PATHS = ['/', '/pricing', '/trial', '/account', '/api/account'];

const latencies = [];
const serverErrors = [];
const transportErrors = [];

async function worker(stopAt) {
  let i = 0;
  while (Date.now() < stopAt) {
    const path = PATHS[i++ % PATHS.length];
    const started = performance.now();
    try {
      const res = await fetch(BASE_URL + path, { redirect: 'manual' });
      await res.arrayBuffer();
      latencies.push(performance.now() - started);
      if (res.status >= 500) serverErrors.push(`HTTP ${res.status} ${path}`);
    } catch (err) {
      transportErrors.push(`${path}: ${err.message}`);
    }
  }
}

function percentile(sorted, p) {
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];
}

async function main() {
  const stopAt = Date.now() + DURATION_MS;
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker(stopAt)));

  const sorted = [...latencies].sort((a, b) => a - b);
  const p95 = sorted.length > 0 ? percentile(sorted, 95) : Infinity;
  const summary = {
    baseUrl: BASE_URL,
    concurrency: CONCURRENCY,
    durationSeconds: DURATION_MS / 1000,
    requests: latencies.length + transportErrors.length,
    p50Ms: sorted.length > 0 ? Math.round(percentile(sorted, 50)) : null,
    p95Ms: Number.isFinite(p95) ? Math.round(p95) : null,
    serverErrors: serverErrors.length,
    transportErrors: transportErrors.length,
  };
  console.log(JSON.stringify(summary));

  const failures = [];
  if (sorted.length === 0) failures.push('no request got a response');
  if (p95 > P95_LIMIT_MS) failures.push(`p95 ${Math.round(p95)} ms is above ${P95_LIMIT_MS} ms`);
  if (serverErrors.length > 0) failures.push(`${serverErrors.length} 5xx response(s), first: ${serverErrors[0]}`);
  if (transportErrors.length > 0) failures.push(`${transportErrors.length} request(s) got no response, first: ${transportErrors[0]}`);

  if (failures.length > 0) {
    for (const f of failures) console.error(`FAIL ${f}`);
    process.exitCode = 1;
  } else {
    console.log(`load: p95 ${summary.p95Ms} ms, no 5xx, no dropped requests`);
  }
}

main().catch((err) => {
  console.error(`load: ${err && err.message ? err.message : err}`);
  process.exitCode = 1;
});
