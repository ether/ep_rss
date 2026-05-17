import {expect, test} from '@playwright/test';
import {goToNewPad} from 'ep_etherpad-lite/tests/frontend-new/helper/padHelper';

test.describe('ep_rss export-column link', () => {
  test('renders the RSS link inside the Import/Export column', async ({page}) => {
    await goToNewPad(page);
    const link = page.locator('#exportColumn a#exportrssa');
    await expect(link).toHaveCount(1);
    await expect(link).toHaveAttribute('data-l10n-id', 'ep_rss.exportrssa.title');
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener');
    const href = await link.getAttribute('href');
    expect(href).toMatch(/\/feed$/);
    await expect(link.locator('span#exportrss svg')).toHaveCount(1);
  });

  test('localized title attribute resolves via html10n', async ({page}) => {
    await goToNewPad(page);
    const link = page.locator('#exportrssa');
    await expect.poll(
      async () => link.getAttribute('title'),
      {timeout: 5000},
    ).toBe('RSS feed of this pad');
  });

  test('clicking the link reaches /p/<pad>/feed', async ({page, request}) => {
    await goToNewPad(page);
    const href = await page.locator('#exportrssa').getAttribute('href');
    expect(href).toBeTruthy();
    const resolved = new URL(href!, page.url()).toString();
    const res = await request.get(resolved);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('application/rss+xml');
  });

  test('share/embed popup no longer carries an RSS block', async ({page}) => {
    await goToNewPad(page);
    // The legacy embedFrame.ejs put `<a class="rssfeed">` inside #embed.
    // Verify nothing in #embed references the feed any more.
    const stale = page.locator('#embed a.rssfeed, #embed a[href*="feed"]');
    await expect(stale).toHaveCount(0);
  });
});
