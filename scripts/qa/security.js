// Fetches each page without a cookie and checks the security headers and the session cookie flags.
// Fails on any finding. Each finding is listed once, with the pages it was seen on.
const { BASE_URL, PAGES } = require('./common.js');

const findings = new Map();
function finding(message, path) {
  if (!findings.has(message)) findings.set(message, []);
  const pages = findings.get(message);
  if (!pages.includes(path)) pages.push(path);
}

async function checkPage(path) {
  const res = await fetch(BASE_URL + path, { redirect: 'manual' });
  await res.arrayBuffer();
  if (res.status >= 500) finding(`server error HTTP ${res.status}`, path);

  if (!res.headers.get('content-security-policy')) finding('missing Content-Security-Policy header', path);
  if (!res.headers.get('strict-transport-security')) finding('missing Strict-Transport-Security header', path);

  for (const cookie of res.headers.getSetCookie().filter((c) => c.startsWith('sid='))) {
    const attrs = cookie.toLowerCase().split(';').map((a) => a.trim());
    if (!attrs.includes('httponly')) finding('session cookie sid without HttpOnly', path);
    if (!attrs.includes('secure')) finding('session cookie sid without Secure', path);
    if (!attrs.some((a) => a.startsWith('samesite='))) finding('session cookie sid without SameSite', path);
  }
}

async function main() {
  for (const path of PAGES) {
    try {
      await checkPage(path);
    } catch (err) {
      finding(`request failed: ${err.message}`, path);
    }
  }

  if (findings.size > 0) {
    for (const [message, pages] of findings) console.error(`FAIL ${message} (pages: ${pages.join(', ')})`);
    process.exitCode = 1;
  } else {
    console.log(`security: ${PAGES.length} pages, security headers and session cookie flags are set`);
  }
}

main();
