import {expect, test} from '@playwright/test';
import {goToNewPad, writeToPad} from 'ep_etherpad-lite/tests/frontend-new/helper/padHelper';

const BASE_URL = 'http://localhost:9001';

const padIdFromUrl = (url: string) => url.split('/p/')[1].split('?')[0];

test.describe('ep_rss feed', () => {
  test('declares the RSS alternate link in the pad page head', async ({page}) => {
    await goToNewPad(page);
    const link = page.locator('head link[rel="alternate"][type="application/rss+xml"]');
    await expect(link).toHaveAttribute('href', 'feed');
  });

  test('serves an RSS document at /p/<pad>/feed containing the pad text', async ({page, request}) => {
    await goToNewPad(page);
    const padId = padIdFromUrl(page.url());
    const marker = `ep-rss-marker-${Date.now()}`;
    await writeToPad(page, marker);
    // Give the socket time to flush the change to the pad store before the
    // route reads it back via API.getLastEdited / padManager.getPad.
    await page.waitForTimeout(1200);

    const res = await request.get(`${BASE_URL}/p/${padId}/feed`);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('application/rss+xml');
    const body = await res.text();
    expect(body).toMatch(/^<rss /);
    expect(body).toContain(`<title>${padId}</title>`);
    expect(body).toContain(marker);
    expect(body.trim().endsWith('</rss>')).toBe(true);
  });

  test('escapes HTML special characters in the description', async ({page, request}) => {
    await goToNewPad(page);
    const padId = padIdFromUrl(page.url());
    await writeToPad(page, 'tags <b>&</b>');
    await page.waitForTimeout(1200);

    const body = await (await request.get(`${BASE_URL}/p/${padId}/feed`)).text();
    expect(body).toContain('&lt;b&gt;&amp;&lt;/b&gt;');
    expect(body).not.toContain('<b>&</b>');
  });

  for (const alias of ['rss', 'feed.rss', 'atom.xml']) {
    test(`/p/<pad>/${alias} redirects to /p/<pad>/feed`, async ({page, request}) => {
      await goToNewPad(page);
      const padId = padIdFromUrl(page.url());
      const res = await request.get(`${BASE_URL}/p/${padId}/${alias}`, {maxRedirects: 0});
      expect(res.status()).toBe(302);
      expect(res.headers()['location']).toBe(`/p/${padId}/feed`);
    });
  }
});
