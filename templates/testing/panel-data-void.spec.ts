// Universal Playwright E2E data-void test template
// Checks each page loads without error and content areas are not empty
// Copy to: tests/e2e/panel-data-void.spec.ts

import { test, expect } from '@playwright/test';

// BASE_URL from environment, falls back to localhost
const BASE_URL = process.env.BASE_URL ?? 'https://localhost:3000';

// -------------------------------------------------------------------------
// Configure pages to test
// Replace [PAGE_PATH] and [PANEL_SELECTOR] with your actual values
// -------------------------------------------------------------------------

const PAGES_TO_CHECK: Array<{
  name: string;
  path: string;
  panelSelector: string;
  emptyStateSelector?: string;
  requiresAuth?: boolean;
}> = [
  {
    name: 'Home page',
    path: '/',                          // [PAGE_PATH]
    panelSelector: 'main',              // [PANEL_SELECTOR] — replace with specific selector
    emptyStateSelector: '[data-testid="empty-state"]', // Default empty state selector
    requiresAuth: false,
  },
  {
    name: 'Dashboard',
    path: '/dashboard',                 // [PAGE_PATH]
    panelSelector: '.dashboard-panel',  // [PANEL_SELECTOR]
    emptyStateSelector: '[data-testid="empty-state"]', // Default empty state selector
    requiresAuth: true,
  },
  // INSTRUCTION: Add all pages you want to validate
  // {
  //   name: '[PAGE_NAME]',
  //   path: '[PAGE_PATH]',
  //   panelSelector: '[PANEL_SELECTOR]',
  //   emptyStateSelector: '[EMPTY_STATE_SELECTOR]', // Optional
  //   requiresAuth: true,
  // },
];

// -------------------------------------------------------------------------
// Auth setup (if needed)
// Replace with your actual login flow
// -------------------------------------------------------------------------

async function loginAsTestUser(page: import('@playwright/test').Page) {
  // Replace with your actual login flow
  // await page.goto(`${BASE_URL}/login`);
  // await page.fill('[data-testid="email-input"]', process.env.TEST_USER_EMAIL!);
  // await page.fill('[data-testid="password-input"]', process.env.TEST_USER_PASSWORD!);
  // await page.click('[data-testid="login-button"]');
  // await page.waitForURL(`${BASE_URL}/dashboard`);
}

// -------------------------------------------------------------------------
// Tests
// -------------------------------------------------------------------------

test.describe('Panel Data Void Check — no empty states in production', () => {
  test.beforeEach(async ({ page }) => {
    // Set a reasonable timeout for page loads
    page.setDefaultTimeout(30_000);
  });

  for (const pageConfig of PAGES_TO_CHECK) {
    test(`[${pageConfig.name}] loads without error`, async ({ page }) => {
      if (pageConfig.requiresAuth) {
        await loginAsTestUser(page);
      }

      const response = await page.goto(`${BASE_URL}${pageConfig.path}`);

      // Page must return a 200 status
      expect(response?.status()).toBe(200);

      // No JavaScript errors in console
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));
      await page.waitForLoadState('networkidle');
      expect(errors).toHaveLength(0);
    });

    test(`[${pageConfig.name}] content panel is not empty`, async ({ page }) => {
      if (pageConfig.requiresAuth) {
        await loginAsTestUser(page);
      }

      await page.goto(`${BASE_URL}${pageConfig.path}`);
      await page.waitForLoadState('networkidle');

      const panel = page.locator(pageConfig.panelSelector);

      // Panel must exist
      await expect(panel).toBeVisible();

      // Panel must not show "Loading..." (data must have resolved)
      await expect(panel).not.toContainText('Loading...', { ignoreCase: true });
      await expect(panel).not.toContainText('loading', { ignoreCase: true });

      // Panel must not be empty (must have some content)
      const textContent = await panel.textContent();
      expect(textContent?.trim().length).toBeGreaterThan(0);
    });

    test(`[${pageConfig.name}] shows no error states`, async ({ page }) => {
      if (pageConfig.requiresAuth) {
        await loginAsTestUser(page);
      }

      await page.goto(`${BASE_URL}${pageConfig.path}`);
      await page.waitForLoadState('networkidle');

      const panel = page.locator(pageConfig.panelSelector);

      // Panel must not show generic error messages
      await expect(panel).not.toContainText('Something went wrong', { ignoreCase: true });
      await expect(panel).not.toContainText('Error', { ignoreCase: false });
      await expect(panel).not.toContainText('404', { ignoreCase: false });
      await expect(panel).not.toContainText('500', { ignoreCase: false });

      // Panel must not be the only content visible (empty state only)
      if (pageConfig.emptyStateSelector) {
        const emptyState = panel.locator(pageConfig.emptyStateSelector);
        const emptyStateCount = await emptyState.count();
        const allContent = panel.locator(`:not(${pageConfig.emptyStateSelector})`);
        if (emptyStateCount > 0) {
          await expect(allContent).not.toHaveCount(0);
        }
      }
    });
  }
});
