import { test, expect } from './fixtures.js';

/**
 * LIVE sweep — runs against the real stack (docker compose up, no mocks).
 * Logs in as the bootstrapped SUPER_ADMIN, visits every route, and records:
 *   - JS page errors (fail the test)
 *   - console.error calls (fail the test)
 *   - failed API responses >= 400 (logged; triaged manually — some are
 *     expected, e.g. FABRIC_UNAVAILABLE without the Phase-2 network)
 *
 * Run: E2E_BASE_URL=http://localhost:3000 npx playwright test live-sweep --project=chromium
 * Creds via env (defaults = dev bootstrap account, see AdminBootstrapRunner).
 */
const ADMIN_DID = process.env.E2E_ADMIN_DID || 'did:cypherid:admin:root';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'CypherID@Admin2026!';

const ROUTES = [
  '/wallet',
  '/assets',
  '/access-requests',
  '/admin',
  '/audit',
  '/notifications',
  '/register',
  '/login',
  '/protected/document/fake-session',
  '/protected/exam/fake-session',
  '/protected/video/fake-session',
  '/no-such-route-xyz',
];

test.describe('LIVE full-app sweep', () => {
  test('login works against the real backend', async ({ page }) => {
    const bad = [];
    page.on('response', (r) => {
      if (r.url().includes('/api/') && r.status() >= 400) bad.push(`${r.status()} ${r.url()}`);
    });
    await page.goto('/login');
    await page.getByLabel('DID (did:cypherid:...)').fill(ADMIN_DID);
    await page.getByLabel('Password').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page).toHaveURL(/\/wallet$/, { timeout: 20000 });
    console.log('login bad-api-calls: ' + JSON.stringify(bad));
  });

  for (const route of ROUTES) {
    test(`route ${route} renders without JS errors`, async ({ page }) => {
      const pageErrors = [];
      const consoleErrors = [];
      const badApi = [];
      page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 300)));
      page.on('console', (m) => {
        // Browser-internal "Failed to load resource" lines for HTTP error
        // statuses are noise (expected while Fabric is down by design) —
        // app-level console.error calls are the real signal.
        if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) {
          consoleErrors.push(m.text().slice(0, 300));
        }
      });
      page.on('response', (r) => {
        if (r.url().includes('/api/') && r.status() >= 400) badApi.push(`${r.status()} ${r.url()}`);
      });

      // Authenticate first via real login
      await page.goto('/login');
      await page.getByLabel('DID (did:cypherid:...)').fill(ADMIN_DID);
      await page.getByLabel('Password').fill(ADMIN_PASSWORD);
      await page.getByRole('button', { name: 'Login' }).click();
      await expect(page).toHaveURL(/\/wallet$/, { timeout: 20000 });

      await page.goto(route);
      await page.waitForTimeout(2500);
      const bodyText = (await page.textContent('body')) || '';
      console.log(`ROUTE ${route} body_len=${bodyText.length} bad_api=${JSON.stringify(badApi)}`);
      expect(bodyText.length, `blank page at ${route}`).toBeGreaterThan(0);
      expect(pageErrors, `JS errors at ${route}: ${JSON.stringify(pageErrors)}`).toEqual([]);
      expect(consoleErrors, `console.error at ${route}: ${JSON.stringify(consoleErrors)}`).toEqual([]);
    });
  }
});
