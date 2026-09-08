import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Automated a11y scan — feeds docs/reports/ACCESSIBILITY_REPORT.md.
 * Run: npm run e2e -- a11y.spec.js
 * (requires the @axe-core/playwright devDependency added alongside this spec)
 *
 * This checks WCAG 2.0/2.1 A + AA rules via axe-core on the pages that
 * don't require a live backend to render meaningfully. Authenticated pages
 * are covered with the same login mock used in login.spec.js.
 */

test.describe('Accessibility (axe-core)', () => {
  test('login page has no detectable WCAG A/AA violations', async ({ page }) => {
    await page.goto('/login');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });

  test('register page has no detectable WCAG A/AA violations', async ({ page }) => {
    await page.goto('/register');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });

  test('wallet page (authenticated) has no detectable WCAG A/AA violations', async ({ page }) => {
    await page.route('**/api/v1/auth/me', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ did: 'did:cypherid:0xE2E', organization: 'DRDO', roles: [] })
      })
    );
    // AuthGuard reads the token synchronously from localStorage before the
    // mocked /me call resolves, so seed it via an init script before navigation.
    await page.addInitScript(() => {
      window.localStorage.setItem('cypherid_access_token', 'e2e-fake-token');
    });
    await page.goto('/wallet');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });
});
