import { expect, type Page } from '@playwright/test';

const email = process.env.E2E_EMAIL || 'codex.test@example.com';
const password = process.env.E2E_PASSWORD || 'CodexTest123!';

export async function visitAuthenticated(page: Page, path: string) {
  await page.goto(path);

  const logoutButton = page.getByRole('button', { name: 'Log out' });
  const alreadyAuthenticated = await logoutButton.waitFor({ state: 'visible', timeout: 5_000 }).then(() => true).catch(() => false);
  if (alreadyAuthenticated) return;

  const loginHeading = page.getByRole('heading', { name: 'Log in' });
  const needsLogin = await loginHeading.waitFor({ state: 'visible', timeout: 15_000 }).then(() => true).catch(() => false);

  if (needsLogin) {
    await page.getByRole('textbox', { name: 'Email' }).fill(email);
    await page.getByRole('textbox', { name: 'Password' }).fill(password);
    await page.getByRole('button', { name: 'Log in' }).click();
  }

  await expect(logoutButton).toBeVisible({ timeout: 30_000 });
}
