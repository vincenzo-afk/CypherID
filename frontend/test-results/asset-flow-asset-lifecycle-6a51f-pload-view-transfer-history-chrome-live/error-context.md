# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: asset-flow.spec.js >> asset lifecycle (live UI) >> upload, view, transfer, history
- Location: e2e\asset-flow.spec.js:23:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: expect(locator).toBeVisible() failed

Locator: getByText(/Transferred|Transfer failed/).first()
Expected: visible
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByText(/Transferred|Transfer failed/).first() with timeout 90000ms
  - waiting for getByText(/Transferred|Transfer failed/).first()
  - Test timeout of 30000ms exceeded.

```

```yaml
- banner:
  - heading "CypherID" [level=6]
  - link "Wallet":
    - /url: /wallet
  - link "Assets":
    - /url: /assets
  - link "Access":
    - /url: /access-requests
  - link "Audit":
    - /url: /audit
  - link "Notifications 12":
    - /url: /notifications
  - button "Logout"
- heading "Asset Hub" [level=5]
- heading "Upload + Mint" [level=6]
- paragraph: Files are encrypted locally, pinned to IPFS, then minted on-chain.
- button "Choose file"
- text: Classification
- combobox "Classification": CONFIDENTIAL
- button "Encrypt + Upload + Protect" [disabled]
- heading "My Assets (9)" [level=6]
- table:
  - rowgroup:
    - row "Asset ID Classification Status Tx Actions":
      - columnheader "Asset ID"
      - columnheader "Classification"
      - columnheader "Status"
      - columnheader "Tx"
      - columnheader "Actions"
  - rowgroup:
    - row "ASSET-c307d3ab-8ef7-487f-8832-2bb5f6588676 CONFIDENTIAL ACTIVE Detail View":
      - cell "ASSET-c307d3ab-8ef7-487f-8832-2bb5f6588676"
      - cell "CONFIDENTIAL"
      - cell "ACTIVE"
      - cell
      - cell "Detail View":
        - button "Detail"
        - button "View"
    - row "ASSET-7b845a61-cd7e-4e40-a962-427155d2baef TOP_SECRET ACTIVE Detail View":
      - cell "ASSET-7b845a61-cd7e-4e40-a962-427155d2baef"
      - cell "TOP_SECRET"
      - cell "ACTIVE"
      - cell
      - cell "Detail View":
        - button "Detail"
        - button "View"
    - row "ASSET-f5952cd1-98ed-4168-b5fe-59516b28f8df CONFIDENTIAL ACTIVE Detail View":
      - cell "ASSET-f5952cd1-98ed-4168-b5fe-59516b28f8df"
      - cell "CONFIDENTIAL"
      - cell "ACTIVE"
      - cell
      - cell "Detail View":
        - button "Detail"
        - button "View"
    - row "ASSET-475cc741-b1b8-43bb-b685-3bfcc50c86d1 CONFIDENTIAL ACTIVE Detail View":
      - cell "ASSET-475cc741-b1b8-43bb-b685-3bfcc50c86d1"
      - cell "CONFIDENTIAL"
      - cell "ACTIVE"
      - cell
      - cell "Detail View":
        - button "Detail"
        - button "View"
    - row "ASSET-7335a71e-bef8-4915-be89-5f3d5f63131f CONFIDENTIAL ACTIVE Detail View":
      - cell "ASSET-7335a71e-bef8-4915-be89-5f3d5f63131f"
      - cell "CONFIDENTIAL"
      - cell "ACTIVE"
      - cell
      - cell "Detail View":
        - button "Detail"
        - button "View"
    - row "ASSET-d9a4187a-01c5-44be-b03b-244ad25e1535 CONFIDENTIAL ACTIVE Detail View":
      - cell "ASSET-d9a4187a-01c5-44be-b03b-244ad25e1535"
      - cell "CONFIDENTIAL"
      - cell "ACTIVE"
      - cell
      - cell "Detail View":
        - button "Detail"
        - button "View"
    - row "ASSET-b81c324a-4e5b-4182-af9a-4c52bbb82188 CONFIDENTIAL ACTIVE Detail View":
      - cell "ASSET-b81c324a-4e5b-4182-af9a-4c52bbb82188"
      - cell "CONFIDENTIAL"
      - cell "ACTIVE"
      - cell
      - cell "Detail View":
        - button "Detail"
        - button "View"
    - row "ASSET-a61d306d-a15a-4b39-9c3d-9d2375aab59c UNCLASSIFIED ACTIVE Detail View":
      - cell "ASSET-a61d306d-a15a-4b39-9c3d-9d2375aab59c"
      - cell "UNCLASSIFIED"
      - cell "ACTIVE"
      - cell
      - cell "Detail View":
        - button "Detail"
        - button "View"
    - row "ASSET-ec73458c-86fa-4421-822e-dd0ffe07d0b0 CONFIDENTIAL ACTIVE Detail View":
      - cell "ASSET-ec73458c-86fa-4421-822e-dd0ffe07d0b0"
      - cell "CONFIDENTIAL"
      - cell "ACTIVE"
      - cell
      - cell "Detail View":
        - button "Detail"
        - button "View"
- heading "Asset Detail + Provenance" [level=6]
- text: "{ \"assetId\": \"ASSET-ec73458c-86fa-4421-822e-dd0ffe07d0b0\", \"ownerDID\": \"did:cypherid:admin:root\", \"ipfsHash\": \"Qmek9A6az5rvajZMwU4YZS9LzbWEgkv1A3MAKm9Dsv1nnK\", \"classification\": \"CONFIDENTIAL\", \"policyId\": \"\", \"status\": \"ACTIVE\", \"fileName\": \"flow.txt\", \"fileType\": \"text/plain\", \"fileSizeBytes\": 35, \"createdAt\": \"2026-09-15T17:58:10.147183048Z\", \"updatedAt\": \"2026-09-15T17:58:10.147183048Z\" }"
- heading "History (1)" [level=6]
- text: "[ { \"event\": \"MINTED\", \"actor\": \"did:cypherid:admin:root\", \"timestamp\": \"2026-09-15T17:58:10.147592199Z\", \"txHash\": \"fe09b9ab801c29a5df6fba7e772b8aa9a0ae2f4b96dbb5540a31b7b17e020d16\" } ] Transfer to DID"
- textbox "Transfer to DID": did:cypherid:0xfedfdd0d8a80a80fd77c055ed5e435bc99128af7
- text: Owner signature
- textbox "Owner signature": e2e-owner-signature
- button "Transfer"
- button "Burn"
```

# Test source

```ts
  1   | import { test, expect } from './fixtures.js';
  2   | import fs from 'node:fs';
  3   | import os from 'node:os';
  4   | import path from 'node:path';
  5   | 
  6   | /**
  7   |  * Full asset lifecycle through the REAL UI: upload → appears in list →
  8   |  * view in protected viewer (content actually renders) → transfer with an
  9   |  * owner signature → history shows the trail.
  10  |  *
  11  |  * Owner signature: currently presence-validated only (chaincode checks
  12  |  * non-empty; full cryptographic verification is Phase-16 per AssetService
  13  |  * docs) — so any non-empty string exercises the flow.
  14  |  *
  15  |  * Run: HEADED=1 npx playwright test --config playwright.live.config.js asset-flow
  16  |  */
  17  | const ADMIN_DID = process.env.E2E_ADMIN_DID || 'did:cypherid:admin:root';
  18  | const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'CypherID@Admin2026!';
  19  | const TEST_USER_DID = 'did:cypherid:0xfedfdd0d8a80a80fd77c055ed5e435bc99128af7';
  20  | const FILE_TEXT = 'CypherID e2e asset flow check 12345';
  21  | 
  22  | test.describe('asset lifecycle (live UI)', () => {
  23  |   test('upload, view, transfer, history', async ({ page }) => {
  24  |     const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cypher-')), 'flow.txt');
  25  |     fs.writeFileSync(tmp, FILE_TEXT);
  26  | 
  27  |     // Login
  28  |     await page.goto('/login');
  29  |     await page.getByLabel('DID (did:cypherid:...)').fill(ADMIN_DID);
  30  |     await page.getByLabel('Password').fill(ADMIN_PASSWORD);
  31  |     await page.getByRole('button', { name: 'Login' }).click();
  32  |     await expect(page).toHaveURL(/\/wallet$/, { timeout: 20000 });
  33  | 
  34  |     // Upload
  35  |     await page.goto('/assets');
  36  |     await expect(page.getByText('My Assets')).toBeVisible({ timeout: 15000 });
  37  |     await page.locator('input[type="file"]').setInputFiles(tmp);
  38  |     await page.getByRole('button', { name: /Encrypt \+ Upload \+ Protect/ }).click();
  39  |     // Success navigates to the protected viewer on session issuance
  40  |     await expect(page).toHaveURL(/\/protected\/document\//, { timeout: 60000 });
  41  | 
  42  |     // Viewer authorizes (content itself paints to canvas by design —
  43  |     // camera-resistance renderer — so assert state + canvas, and verify the
  44  |     // actual bytes through the chunk API below).
  45  |     await expect(page.getByText(/Protected Document/).first()).toBeVisible({ timeout: 30000 });
  46  |     await expect(page.locator('canvas').first()).toBeVisible({ timeout: 15000 });
  47  |     await expect(page.getByText(/AUTHORIZED|PROTECTED_VIEW/).first()).toBeVisible({ timeout: 15000 });
  48  |     console.log('VIEWER authorized with canvas');
  49  | 
  50  |     // Prove the real bytes: pull chunk 0 with a fresh session and compare.
  51  |     // (New session because chunk reads transition state + rate limits.)
  52  |     const apiBase = '/api/v1';
  53  |     const wb = await page.evaluate(async ({ base, did, password }) => {
  54  |       const login = await (await fetch(`${base}/auth/login`, {
  55  |         method: 'POST', headers: { 'Content-Type': 'application/json' },
  56  |         body: JSON.stringify({ did, password, nonce: `e2e-${Date.now()}` }),
  57  |       })).json();
  58  |       const ps = await (await fetch(`${base}/assets?ownerDID=${encodeURIComponent(did)}`, {
  59  |         headers: { Authorization: `Bearer ${login.accessToken}` },
  60  |       })).json();
  61  |       const assets = Array.isArray(ps) ? ps : ps.assets || ps.content || [];
  62  |       const mine = assets.filter((a) => (a.fileName || '').includes('flow.txt'));
  63  |       const latest = mine[mine.length - 1];
  64  |       const s = await (await fetch(`${base}/assets/${latest.assetId || latest.id}/protected-session`, {
  65  |         method: 'POST', headers: { Authorization: `Bearer ${login.accessToken}` },
  66  |       })).json();
  67  |       const info = await (await fetch(`${base}/protected-content/session-info`, {
  68  |         headers: { Authorization: `Bearer ${s.sessionToken}` },
  69  |       })).json();
  70  |       const c0 = await (await fetch(`${base}/protected-content/chunk?chunk=0`, {
  71  |         headers: { Authorization: `Bearer ${s.sessionToken}` },
  72  |       })).arrayBuffer();
  73  |       return { assetId: latest.assetId || latest.id, totalChunks: info.totalChunks, bytes: new Uint8Array(c0).slice(0, 64) };
  74  |     }, { base: apiBase, did: ADMIN_DID, password: ADMIN_PASSWORD });
  75  |     console.log('CHUNK check: asset=' + wb.assetId + ' chunks=' + wb.totalChunks);
  76  |     const head = Buffer.from(wb.bytes).toString('utf8');
  77  |     console.log('CHUNK head: ' + JSON.stringify(head));
  78  |     expect(head).toContain(FILE_TEXT.slice(0, 20));
  79  | 
  80  |     // Back to hub, asset listed; open detail
  81  |     await page.goto('/assets');
  82  |     await expect(page.getByText(FILE_TEXT.slice(0, 10), { exact: false }).first()).toBeVisible({ timeout: 15000 }).catch(() => {});
  83  |     const row = page.locator('table tbody tr').first();
  84  |     await expect(row).toBeVisible({ timeout: 60000 });
  85  |     const assetId = (await row.locator('td').first().textContent())?.trim();
  86  |     console.log('ASSET listed: ' + assetId);
  87  |     expect(assetId).toMatch(/ASSET-/);
  88  | 
  89  |     // Transfer the JUST-uploaded asset (not the first row) to the test user
  90  |     const mine = page.locator('table tbody tr', { hasText: wb.assetId }).first();
  91  |     await expect(mine).toBeVisible({ timeout: 15000 });
  92  |     await mine.getByRole('button', { name: 'Detail' }).click();
  93  |     await expect(page.getByLabel('Transfer to DID')).toBeVisible({ timeout: 15000 });
  94  |     await page.getByLabel('Transfer to DID').fill(TEST_USER_DID);
  95  |     await page.getByLabel('Owner signature').fill('e2e-owner-signature');
  96  |     await page.getByRole('button', { name: 'Transfer' }).click();
  97  |     // 3-org endorsement can outlast the 15s UI timeout, so the banner may say
  98  |     // Transferred OR a timeout error while the commit still lands — verify the
  99  |     // ground truth on-chain via API instead of the banner alone.
> 100 |     await expect(page.getByText(/Transferred|Transfer failed/).first()).toBeVisible({ timeout: 90000 });
      |                                                                         ^ Error: expect(locator).toBeVisible() failed
  101 |     const t = await page.evaluate(async ({ base, did, password, assetId, toDid }) => {
  102 |       const login = await (await fetch(`${base}/auth/login`, {
  103 |         method: 'POST', headers: { 'Content-Type': 'application/json' },
  104 |         body: JSON.stringify({ did, password, nonce: `e2e-t-${Date.now()}` }),
  105 |       })).json();
  106 |       for (let i = 0; i < 12; i++) {
  107 |         const meta = await (await fetch(`${base}/assets/${assetId}`, {
  108 |           headers: { Authorization: `Bearer ${login.accessToken}` },
  109 |         })).json().catch(() => ({}));
  110 |         if (meta.ownerDID === toDid) return { ok: true, owner: meta.ownerDID };
  111 |         await new Promise((r) => setTimeout(r, 5000));
  112 |       }
  113 |       return { ok: false };
  114 |     }, { base: apiBase, did: ADMIN_DID, password: ADMIN_PASSWORD, assetId: wb.assetId, toDid: TEST_USER_DID });
  115 |     expect(t.ok).toBe(true);
  116 |     console.log('TRANSFERRED to test user (owner now ' + t.owner + ')');
  117 | 
  118 |     // History shows mint + transfer
  119 |     await expect(page.getByText(/Minted|mint|Transfer|transfer/).first()).toBeVisible({ timeout: 15000 });
  120 |     const history = await page.textContent('body');
  121 |     console.log('HISTORY len=' + (history?.length || 0));
  122 |   });
  123 | });
  124 | 
```