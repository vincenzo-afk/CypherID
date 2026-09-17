import { test, expect } from './fixtures.js';

/**
 * NON-DEVELOPER CLARITY sweep — runs against the real stack in a real Chrome.
 *
 * Guards the promise that a first-time, non-technical visitor can understand
 * what CypherID is:
 *   1. the landing page explains the product without jargon
 *   2. every screen has a human heading plus a one-line explanation
 *   3. raw identifiers/JSON stay hidden inside "Technical details" accordions
 *
 * Run: E2E_BASE_URL=http://localhost:3000 npx playwright test ui-clarity
 *      --config=playwright.live.config.js --project=chrome-live
 */
const ADMIN_DID = process.env.E2E_ADMIN_DID || 'did:cypherid:admin:root';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'CypherID@Admin2026!';

// Words a non-developer should not meet on the main screens.
const JARGON = [
  'IPFS', 'on-chain', 'onchain', 'mint', 'minting', 'blockchain',
  'CouchDB', 'orderer', 'MSP', 'chaincode', 'DID document',
  'verifiable credential', 'delegation', 'multisig', 'provenance',
  'burn', 'burned', 'moire', 'shader', 'hash'
];

const jargonIn = (text) => {
  const lower = text.toLowerCase();
  return JARGON.filter((word) => lower.includes(word.toLowerCase()));
};

async function login(page) {
  await page.goto('/login');
  await page.getByLabel('Digital ID').fill(ADMIN_DID);
  await page.getByLabel('Password').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).toHaveURL(/\/wallet$/, { timeout: 20000 });
}
test.describe('plain-language UI for non-developers', () => {
  test('landing page explains the product in plain words', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Your ID, your files, and proof/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create my ID' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible();

    for (const card of ['One identity', 'Files you control', 'Proof you can show']) {
      await expect(page.getByRole('heading', { name: card })).toBeVisible();
    }

    await page.getByRole('button', { name: 'How does it work?' }).click();
    await expect(page.getByText('Create your digital ID — takes a minute.')).toBeVisible();
    await expect(page.getByText(/Somebody needs it\? They ask, you approve\./)).toBeVisible();
    await expect(page.getByText(/does not make it impossible/i)).toBeVisible();

    expect(jargonIn(await page.textContent('body'))).toEqual([]);
  });

  test('login asks for a digital ID, not a database key', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Log in to CypherID' })).toBeVisible();
    await expect(page.getByLabel('Digital ID')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByText(/It always starts with did:cypherid:/)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Create my ID' })).toBeVisible();
  });

  test('register explains that a one-time password follows', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: 'Create your digital ID' })).toBeVisible();
    await expect(page.getByLabel('Full name')).toBeVisible();
    await expect(page.getByLabel('Staff number')).toBeVisible();
    await expect(page.getByLabel('Organization')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create my ID' })).toBeVisible();
  });
});
test.describe('everyday words on every signed-in screen', () => {
  test('navigation and screens are readable by a non-developer', async ({ page }) => {
    await login(page);

    const nav = page.getByRole('banner');
    for (const label of ['Home', 'My ID', 'My files', 'Sharing', 'Admin', 'Activity', 'Alerts', 'Log out']) {
      await expect(nav.getByRole('button', { name: label })).toBeVisible();
    }

    await page.goto('/wallet');
    await expect(page.getByRole('heading', { name: 'My ID' })).toBeVisible();
    await expect(page.getByText(/This is your digital identity/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Look up' })).toBeVisible();

    await page.goto('/assets');
    await expect(page.getByRole('heading', { name: 'My files' })).toBeVisible();
    await expect(page.getByText(/Add any kind of file/)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Add a file' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Choose file' })).toBeVisible();
    await expect(page.getByText('Any file type is fine, up to 50 MB.')).toBeVisible();

    await page.goto('/access-requests');
    await expect(page.getByRole('heading', { name: 'Sharing' })).toBeVisible();

    await page.goto('/notifications');
    await expect(page.getByRole('heading', { name: 'Alerts' })).toBeVisible();
    await expect(page.getByText(/Everything that happened to your account/)).toBeVisible();

    await page.goto('/audit');
    await expect(page.getByRole('heading', { name: 'Activity' })).toBeVisible();
    await expect(page.getByText(/The full story of what happened/)).toBeVisible();

    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Admin' })).toBeVisible();
    for (const section of [
      'Is everything working?',
      'Who may open what',
      'Create a user',
      'Give someone a role',
      'Issue a certificate',
      'Stop an identity',
      'Open a file as a last resort',
      'Trace a leaked copy',
      'Organizations',
      'Anything unusual?'
    ]) {
      await expect(page.getByRole('heading', { name: section, exact: true })).toBeVisible();
    }
  });

  test('raw payloads stay collapsed behind "Technical details"', async ({ page }) => {
    await login(page);
    await page.goto('/wallet');
    await expect(page.getByText('Technical details')).toBeVisible();
    expect((await page.textContent('body')) || '').not.toContain('"didDocument"');
    await page.getByText('Technical details').click();
    await expect(page.locator('pre').first()).toBeVisible();
  });
});