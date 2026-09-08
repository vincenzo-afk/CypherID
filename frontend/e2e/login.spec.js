import { test, expect } from '@playwright/test';

/**
 * AuthGuard e2e — verifies unauthenticated visitors to a guarded route
 * (see src/components/AuthGuard.jsx and src/App.jsx routing table) are
 * redirected to /login, and that an authenticated wallet page renders.
 *
 * Network calls are mocked here so the spec runs without the full
 * docker-compose stack (5 Spring services + Fabric + Postgres/Redis/Kafka).
 * To exercise the real backend instead, delete the page.route(...) blocks
 * and run against `docker compose up` with E2E_BASE_URL pointing at the
 * running frontend container.
 */

test.describe('AuthGuard', () => {
  test('unauthenticated visit to a guarded route redirects to /login', async ({ page }) => {
    await page.goto('/wallet');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText('CypherID Login')).toBeVisible();
  });

  test('unauthenticated visit to /assets also redirects to /login', async ({ page }) => {
    await page.goto('/assets');
    await expect(page).toHaveURL(/\/login$/);
  });
});

test.describe('Login flow', () => {
  test('successful login navigates to /wallet', async ({ page }) => {
    await page.route('**/api/v1/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ accessToken: 'e2e-fake-token', expiresIn: 900 })
      });
    });
    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ did: 'did:cypherid:0xE2E', organization: 'DRDO', roles: [] })
      });
    });

    await page.goto('/login');
    await page.getByLabel('DID (did:cypherid:...)').fill('did:cypherid:0xE2E');
    await page.getByLabel('Password').fill('CypherID@2026!');
    await page.getByRole('button', { name: 'Login' }).click();

    await expect(page).toHaveURL(/\/wallet$/);
  });

  test('failed login shows an inline error and stays on /login', async ({ page }) => {
    await page.route('**/api/v1/auth/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'UNAUTHORIZED', message: 'Invalid credentials' })
      });
    });

    await page.goto('/login');
    await page.getByLabel('DID (did:cypherid:...)').fill('did:cypherid:0xE2E');
    await page.getByLabel('Password').fill('wrong-password');
    await page.getByRole('button', { name: 'Login' }).click();

    await expect(page.getByText('Login failed. Check DID and password.')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });
});
