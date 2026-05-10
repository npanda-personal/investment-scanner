import { expect, type Page } from '@playwright/test';
import { visitAuthenticated } from './auth';

export async function expectNoPageError(page: Page) {
  await expect(page.getByText('Authentication required')).toHaveCount(0);
  await expect(page.getByText('Unable to load')).toHaveCount(0);
  await expect(page.getByText('Failed to load')).toHaveCount(0);
}

export async function expectModuleChrome(page: Page, heading: string) {
  await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();
  await expect(page.locator('#market-scope-button')).toContainText(/Market: India|IN/);
  await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible({ timeout: 30_000 });
  await expectNoPageError(page);
}

export async function visitModule(page: Page, path: string, heading: string) {
  await visitAuthenticated(page, path);
  await expectModuleChrome(page, heading);
}
