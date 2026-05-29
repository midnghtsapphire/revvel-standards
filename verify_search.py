import asyncio
from playwright.async_api import async_playwright
import os

async def run_verification():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(viewport={'width': 1280, 'height': 720})
        page = await context.new_page()

        # Load the local index.html
        file_path = f"file://{os.getcwd()}/reesereviews/index.html"
        await page.goto(file_path)

        # 1. Initial state screenshot
        await page.screenshot(path="reesereviews_initial.png")

        # 2. Test Search: "Mixer"
        await page.fill('.search-box', 'Mixer')
        await page.wait_for_timeout(500) # wait for animation/rendering
        await page.screenshot(path="reesereviews_search_mixer.png")

        # 3. Test Category Filter: "Home & Kitchen"
        # Reset search first
        await page.fill('.search-box', '')
        # Find and click the "Home & Kitchen" button
        buttons = await page.query_selector_all('.filter-btn')
        for btn in buttons:
            text = await btn.inner_text()
            if "Home & Kitchen" in text:
                await btn.click()
                break
        await page.wait_for_timeout(500)
        await page.screenshot(path="reesereviews_filter_home.png")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run_verification())
