import { test as base, chromium, expect } from '@playwright/test';

/**
 * Shared test object — two modes:
 *  - CDP attach: set CDP_URL=http://localhost:9222 to drive the user's own
 *    open Chrome window (launch it with --remote-debugging-port=9222 first).
 *    Tests open a NEW tab; existing tabs are untouched; the browser is left
 *    open afterwards (disconnect, never close).
 *  - Normal: launches the machine's Chrome (channel: 'chrome'), headed when
 *    HEADED=1 so the run is watchable.
 */
export const test = base.extend({
  browser: async ({}, use) => {
    if (process.env.CDP_URL) {
      const browser = await chromium.connectOverCDP(process.env.CDP_URL);
      await use(browser);
      await browser.disconnect?.().catch(() => {});
      return;
    }
    const browser = await chromium.launch({
      channel: 'chrome',
      headless: process.env.HEADED !== '1',
      args: process.env.HEADED === '1' ? ['--start-maximized'] : [],
    });
    await use(browser);
    await browser.close();
  },
});

export { expect };
