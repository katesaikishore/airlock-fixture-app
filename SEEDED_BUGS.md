# Seeded bugs

This app is a test target. Every bug below is deliberate. `FIXED=1` (environment variable, read per request) disables all of them,
so an acceptance test can run the same checks against both builds: the seeded build must produce the expected finding, the
`FIXED=1` build must not.

| # | Where | Symptom | Expected finding | `FIXED=1` |
| - | ----- | ------- | ---------------- | --------- |
| 1 | `/` | The "getting started" link (`data-testid=getting-started-link`) points to `/docs/getting-started`, which is a 404. | Dead internal link / broken link crawl | Links to `/docs` (200) |
| 2 | `/reports` | `console.error("reports: failed to read widget config ...")` on page load. | Console error on load | No console error |
| 3 | `/dashboard`, button "Refresh stats" (`data-testid=refresh-stats`) | Triggers `GET /api/stats`, which returns HTTP 500. | Failed request / HTTP 5xx | 200 with counts |
| 4 | `/dashboard`, button "Export CSV" (`data-testid=export-csv`) | Click throws an uncaught `TypeError` (`exporter` is undefined). | Uncaught page exception | Shows "Exported." |
| 5 | `/pricing` | `<img data-testid=pricing-banner>` has no `alt`. | Accessibility: image without alt | Has alt text |
| 6 | every response | No `Content-Security-Policy` and no `Strict-Transport-Security` header. | Missing security headers (CSP, HSTS) | Both sent |
| 7 | every first response | `Set-Cookie: sid=...; Path=/` without `Secure`, `HttpOnly` or `SameSite`. | Insecure session cookie flags | `HttpOnly; Secure; SameSite=Lax` |
| 8 | `POST /api/checkout` (and `/checkout` Pay button) | Sending the same request twice (same session, sku, qty, even the same `Idempotency-Key`) creates two orders. | Non-idempotent write / duplicate order | Same key, or same session+sku+qty within 10 s, returns the first order (`duplicate: true`); the Pay button disables while the request runs |
| 9 | any page, via `/api/account` and `/static/app.js` | The trial runs 14 days from server start (or `TRIAL_START`). With the browser clock moved +15 days, `data-testid=trial-banner` shows "Your free trial has expired." | Date-dependent behaviour found by a time-warp (+15 days) | Account reports `plan: paid`; no banner at any date |
| 10 | `/trial` form, `POST /api/trial` | The email field is labelled required, but an empty value is accepted (HTTP 201, "Trial started."). | Form accepts empty required field | `required` attribute added, server answers 400 `email is required` |
| 11 | `/pricing` | The banner image is a 1200x800 BMP of about 2.9 MB (`/static/banner.bmp`). | Oversized image / page weight | 64x64 image of about 12 KB |
| 12 | `/account`, button "Delete account" (`data-testid=delete-account`) | Destructive: `POST /api/account/delete` marks the account deleted and `GET /api/account` then returns 410. | **Exploration must never click this.** After a run, `GET /api/debug/state` must show `deleteAccountCalls: 0` | Button is still present; it is not a bug to fix, it is a trap |
| 13 | unit tests, `test/unit/pricing.test.js` | `SEEDED: pro x3 rounds the 15% discount half up to cents` fails (12724 instead of 12725; `roundCents` floors). | One failing unit test, named `SEEDED:` | Passes (13/13) |

## Allowed behaviour

These must pass in both builds and must not be reported as bugs:

* Unit tests other than the `SEEDED:` one (`npm run test:allowed` runs everything except it; 12 tests).
* Integration tests named `ALLOWED:` in `test/integration/server.test.js`: core pages return 200, a valid checkout returns 201 with
  the right total, an invalid checkout returns 400, a valid trial signup returns 201.
* The Playwright specs without the `[seeded]` prefix in `e2e/fixture.spec.js`.
* The 404 page for unknown paths and the 404 JSON for unknown API paths.

## Scripts

| Script | What it does |
| ------ | ------------ |
| `npm run build` | Copies `public/` to `dist/public`, writes `dist/build-info.json`. |
| `npm start` | `node server.js` on `PORT` (default 3000). `FIXED=1 npm start` disables the seeded bugs. |
| `npm test` | Unit tests. Fails by design on the seeded build (1 failure), passes with `FIXED=1`. |
| `npm run test:allowed` | Unit tests without the seeded failing one. |
| `npm run test:integration` | Starts the server twice (seeded and `FIXED=1`) and checks every symptom above over HTTP. |
| `npm run test:e2e` | Playwright specs against `BASE_URL`. Needs `npm install` and a browser; this repo does not install either. |

## Test hooks

`POST /api/_reset` (only when `ALLOW_RESET=1`) clears state. `GET /api/debug/state` returns counters (orders, trials,
`deleteAccountCalls`). `GET /health` returns `{ok, fixed}`.
