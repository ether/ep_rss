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
    expect(body).toMatch(/^<\?xml version="1\.0" encoding="utf-8"\?>\n<rss /);
    // Channel title is a plain element; item title is CDATA-wrapped by
    // the feed library. Both must carry the pad id.
    expect(body).toContain(`<title>${padId}</title>`);
    expect(body).toContain(`<title><![CDATA[${padId}]]></title>`);
    expect(body).toContain(marker);
    expect(body.trim().endsWith('</rss>')).toBe(true);
  });

  test('uses RFC-822 dates for pubDate and lastBuildDate (feedvalidator.org)', async ({page, request}) => {
    await goToNewPad(page);
    const padId = padIdFromUrl(page.url());
    await writeToPad(page, 'date check');
    await page.waitForTimeout(1200);
    const body = await (await request.get(`${BASE_URL}/p/${padId}/feed`)).text();
    // "Mon, 18 May 2026 09:53:13 GMT" — what Date.toUTCString() emits and
    // what feedvalidator.org requires per RSS 2.0's RFC-822 rule.
    const RFC822 = /^[A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} GMT$/;
    const pub = body.match(/<pubDate>([^<]+)<\/pubDate>/g) || [];
    const build = body.match(/<lastBuildDate>([^<]+)<\/lastBuildDate>/);
    expect(pub.length).toBeGreaterThanOrEqual(1);
    for (const tag of pub) {
      const value = tag.replace(/<\/?pubDate>/g, '');
      expect(value, `pubDate "${value}"`).toMatch(RFC822);
    }
    expect(build).not.toBeNull();
    expect(build![1]).toMatch(RFC822);
  });

  test('item carries a stable non-permalink guid', async ({page, request}) => {
    await goToNewPad(page);
    const padId = padIdFromUrl(page.url());
    await writeToPad(page, 'guid check');
    await page.waitForTimeout(1200);

    const first = await (await request.get(`${BASE_URL}/p/${padId}/feed`)).text();
    const m = first.match(/<guid isPermaLink="false">([^<]+)<\/guid>/);
    expect(m, 'guid element missing').not.toBeNull();
    expect(m![1]).toContain(`/p/${padId}#`);

    // Polling the same pad without editing must return the same guid so
    // feed readers don't show a duplicate item every fetch.
    const second = await (await request.get(`${BASE_URL}/p/${padId}/feed`)).text();
    const m2 = second.match(/<guid isPermaLink="false">([^<]+)<\/guid>/);
    expect(m2![1]).toBe(m![1]);
  });

  test('atom:self link drops the query string so it matches the document URL', async ({page, request}) => {
    await goToNewPad(page);
    const padId = padIdFromUrl(page.url());
    await writeToPad(page, 'self-ref check');
    await page.waitForTimeout(1200);
    const body = await (await request.get(`${BASE_URL}/p/${padId}/feed?_=cachebust`)).text();
    const self = body.match(/<atom:link href="([^"]+)" rel="self"/);
    expect(self).not.toBeNull();
    expect(self![1]).toBe(`${BASE_URL}/p/${padId}/feed`);
  });

  test('pad text with XML-significant characters is CDATA-wrapped', async ({page, request}) => {
    await goToNewPad(page);
    const padId = padIdFromUrl(page.url());
    await writeToPad(page, 'tags <b>&</b>');
    await page.waitForTimeout(1200);

    const body = await (await request.get(`${BASE_URL}/p/${padId}/feed`)).text();
    // CDATA section protects raw `<` and `&` from XML parsing, so the
    // feed library passes pad text through verbatim instead of double-
    // encoding. The body must (a) be well-formed XML — that's covered
    // implicitly by every test that parses the response — and (b)
    // include the text inside the CDATA section.
    const descMatch = body.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/);
    expect(descMatch, 'item description must be CDATA-wrapped').not.toBeNull();
    expect(descMatch![1]).toContain('tags <b>&</b>');
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
