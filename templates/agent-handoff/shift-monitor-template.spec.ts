import { test, expect } from '@playwright/test';

/**
 * S.H.I.F.T. Self-Healing Monitor Template
 * 
 * This Playwright test serves as both an E2E validation and a self-healing monitor.
 * It tests the "Happy Path" and the "Bad Day" simulation, ensuring the UI remains
 * neuro-inclusive and predictable even when external systems fail.
 */

test.describe('S.H.I.F.T. Monitor: Core Workflows', () => {

  test('Happy Path: App loads and UI is predictable', async ({ page }) => {
    await page.goto('/');

    // 1. Predictability: Ensure core navigation exists in expected locations
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();

    // 2. Contrast & Halation: Verify background isn't pure white (#FFFFFF)
    // and text isn't pure black (#000000) - This requires computed style checks
    const bodyBg = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
    expect(bodyBg).not.toBe('rgb(255, 255, 255)'); // Avoid pure white if possible, depending on theme

    // 3. Action: User can interact with a primary feature
    // (Replace with actual app feature, e.g., viewing an OSINT feed)
    const primaryHeading = page.locator('h1').first();
    await expect(primaryHeading).toBeVisible();
  });

  test('Bad Day Simulation: External API Failure (Self-Healing Check)', async ({ page }) => {
    // Simulate a failure of a critical external API (e.g., GDELT or a backend route)
    await page.route('**/api/feeds/**', route => {
      route.abort('failed'); // Simulate network failure
    });

    await page.goto('/');

    // 1. System Reliability: The app should not crash entirely
    await expect(page.locator('body')).toBeVisible();

    // 2. Calm Microcopy: The error message should be reassuring, not alarming
    // It should NOT say "FATAL ERROR" or "500 Internal Server Error"
    const errorMessage = page.locator('text=We couldn\'t load the latest updates right now').or(page.locator('text=Please try again later'));
    await expect(errorMessage).toBeVisible();
    
    // Ensure no aggressive error styling (e.g., bright flashing red)
    // This is a basic check; real tests might check specific classes or styles
    const errorContainer = errorMessage.locator('..');
    await expect(errorContainer).not.toHaveClass(/fatal|crash|panic/i);
  });

});
