import { test, expect, type Page } from '@playwright/test';

// Credentials that match the global-setup seed (mirrors db/seed.ts)
const STEVE = { email: 'steve@gmail.com', password: 'pass123' };
const MARIA = { email: 'maria@gmail.com', password: 'pass123' };

// Must match pages/index.tsx PAGE_SIZE
const PAGE_SIZE = 6;

// ─── shared helpers ─────────────────────────────────────────────────────────

async function loginViaUI(page: Page, creds: { email: string; password: string }) {
  await page.goto('/login');
  await page.locator('[name="email"]').fill(creds.email);
  await page.locator('[name="password"]').fill(creds.password);
  await page.getByRole('button', { name: 'Login' }).click();
  // Wait for the nav Logout button — more reliable than URL because the Login
  // page has a useEffect that can redirect back to "/" after auth state is set.
  await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
}

async function logoutViaUI(page: Page) {
  await page.getByRole('button', { name: 'Logout' }).click();
  // Wait for React to re-render the header in the logged-out state
  await expect(page.getByRole('button', { name: 'Logout' })).not.toBeVisible();
}

// ─── tests ───────────────────────────────────────────────────────────────────

test.describe('Blog E2E', () => {
  /**
   * Test 1 — Home page posts count
   *
   * The global setup seeds 10 posts. The home page paginates at PAGE_SIZE=6,
   * so page 1 must always show exactly six post cards.
   */
  test('home page renders exactly PAGE_SIZE post cards', async ({ page }) => {
    await page.goto('/');

    // Wait for at least one article to appear (loading state is gone)
    await expect(page.locator('article').first()).toBeVisible();

    await expect(page.locator('article')).toHaveCount(PAGE_SIZE);
  });

  /**
   * Test 2 — Register then login
   *
   * Uses a unique email so it doesn't clash with the seeded users even if
   * the test DB is not perfectly wiped between runs.
   */
  test('register + login flow', async ({ page }) => {
    const email = `e2e-${Date.now()}@example.com`;
    const password = 'secret123';

    // ── Register ──────────────────────────────────────────────────────────
    await page.goto('/register');
    await page.locator('[name="email"]').fill(email);
    await page.locator('[name="password"]').fill(password);
    await page.getByRole('button', { name: 'Register' }).click();
    // Successful registration returns a JWT and logs the user in immediately.
    // The Logout button in the header is the definitive sign of an active session.
    await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();

    // ── Logout ────────────────────────────────────────────────────────────
    await logoutViaUI(page);

    // ── Login with the same credentials ───────────────────────────────────
    await loginViaUI(page, { email, password });
    // loginViaUI already asserts the Logout button, but confirm the profile
    // page is accessible while logged in.
    await page.goto('/profile');
    await expect(page.getByRole('heading', { name: 'My account' })).toBeVisible();
  });

  /**
   * Test 3 — Logged-in owner: create → edit → delete
   */
  test('owner can create, edit, and delete their post', async ({ page }) => {
    await loginViaUI(page, STEVE);

    // ── Create ────────────────────────────────────────────────────────────
    const title = `E2E-Create-${Date.now()}`;
    const content = 'This is the body of the E2E test post. It is definitely long enough.';

    await page.goto('/posts/new');
    await page.locator('[name="title"]').fill(title);
    await page.locator('[name="content"]').fill(content);
    await page.getByRole('button', { name: 'Publish' }).click();

    // Redirected to the new post's detail page
    await page.waitForURL(/\/posts\/\d+$/);

    // Owner controls are visible
    await expect(page.getByRole('heading', { level: 1 })).toContainText(title);
    await expect(page.getByRole('link', { name: 'Edit post' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Delete' })).toBeVisible();

    // ── Edit ──────────────────────────────────────────────────────────────
    await page.getByRole('link', { name: 'Edit post' }).click();
    await page.waitForURL(/\/posts\/\d+\/edit$/);

    const editedTitle = `${title} (edited)`;
    await page.locator('[name="title"]').fill(editedTitle);
    await page.getByRole('button', { name: 'Save changes' }).click();

    await page.waitForURL(/\/posts\/\d+$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(editedTitle);

    // ── Delete ────────────────────────────────────────────────────────────
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Delete' }).click();

    // Successful deletion redirects to the home page
    await page.waitForURL('/');
  });

  /**
   * Test 4 — Non-owner visibility
   *
   * Steve creates a post; Maria visits it and must NOT see Edit or Delete.
   */
  test("non-owner does not see Edit or Delete on someone else's post", async ({ page }) => {
    // ── Steve creates a post ──────────────────────────────────────────────
    await loginViaUI(page, STEVE);

    await page.goto('/posts/new');
    const title = `E2E-NonOwner-${Date.now()}`;
    await page.locator('[name="title"]').fill(title);
    await page.locator('[name="content"]').fill(
      'Content for the non-owner access test, long enough to pass validation.',
    );
    await page.getByRole('button', { name: 'Publish' }).click();
    await page.waitForURL(/\/posts\/\d+$/);

    const postUrl = page.url();

    // ── Steve logs out ────────────────────────────────────────────────────
    await logoutViaUI(page);

    // ── Maria logs in ─────────────────────────────────────────────────────
    await loginViaUI(page, MARIA);

    // ── Maria visits Steve's post ─────────────────────────────────────────
    await page.goto(postUrl);
    // Wait for auth and post data to fully load
    await expect(page.getByRole('heading', { level: 1 })).toContainText(title);

    // Neither owner control should be present in the DOM for a non-owner
    await expect(page.getByRole('link', { name: 'Edit post' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Delete' })).not.toBeVisible();
  });
});
