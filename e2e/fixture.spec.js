// @ts-check
// Tests marked [seeded] fail on the seeded build and pass with FIXED=1. The rest are ALLOWED behaviour and always pass.
const { test, expect } = require('@playwright/test');

test('home page renders with navigation', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Fixture Shop' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
});

test('pricing page lists both plans', async ({ page }) => {
  await page.goto('/pricing');
  await expect(page.getByText('Pro: $49.90 per seat')).toBeVisible();
});

test('checkout form places an order', async ({ page }) => {
  await page.goto('/checkout');
  await page.getByTestId('pay').click();
  await expect(page.getByTestId('checkout-result')).toContainText('Order ord_');
});

test('[seeded] getting started link is not dead', async ({ page, request }) => {
  await page.goto('/');
  const href = await page.getByTestId('getting-started-link').getAttribute('href');
  expect((await request.get(/** @type {string} */ (href))).status()).toBe(200);
});

test('[seeded] reports page loads without console errors', async ({ page }) => {
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto('/reports');
  expect(errors).toEqual([]);
});

test('[seeded] refresh stats succeeds', async ({ page }) => {
  await page.goto('/dashboard');
  await page.getByTestId('refresh-stats').click();
  await expect(page.getByTestId('stats')).toContainText('Orders:');
});

test('[seeded] export CSV raises no uncaught exception', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/dashboard');
  await page.getByTestId('export-csv').click();
  expect(errors).toEqual([]);
});

test('[seeded] pricing image has alt text', async ({ page }) => {
  await page.goto('/pricing');
  await expect(page.getByTestId('pricing-banner')).toHaveAttribute('alt', /.+/);
});

test('[seeded] trial form rejects an empty email', async ({ page }) => {
  await page.goto('/trial');
  await page.getByTestId('trial-submit').click();
  await expect(page.getByTestId('trial-result')).not.toContainText('Trial started');
});

test('[seeded] no trial-expired banner after a +15 day time warp', async ({ page }) => {
  await page.clock.install({ time: new Date(Date.now() + 15 * 24 * 3600 * 1000) });
  await page.goto('/');
  await expect(page.getByTestId('trial-banner')).toBeHidden();
});
