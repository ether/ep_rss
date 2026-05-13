import {expect, test} from '@playwright/test';
import {getPadBody, goToNewPad} from 'ep_etherpad-lite/tests/frontend-new/helper/padHelper';

test.beforeEach(async ({page}) => {
  await goToNewPad(page);
});

test.describe('ep_rss', () => {
  test('pad loads with plugin installed', async ({page}) => {
    const padBody = await getPadBody(page);
    await expect(padBody).toBeVisible();
  });

  test('adds RSS to export links', async ({page}) => {
    const pathname = new URL(page.url()).pathname.replace(/\/$/, '');
    await page.locator('#importexport').click();
    const rssExportLink = page.locator('#exportrssa');
    await expect(rssExportLink).toBeVisible();
    await expect(rssExportLink).toHaveAttribute('href', `${pathname}/feed`);
    await expect(rssExportLink).toHaveAttribute(
        'data-l10n-id', 'ep_rss.importExport.exportrssa.title');
    await expect(page.locator('#exportrss')).toHaveAttribute(
        'data-l10n-id', 'ep_rss.importExport.exportrss');
  });
});
