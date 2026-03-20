import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        print("Navigating to dashboard...")
        await page.goto("http://localhost:5173/")
        await page.wait_for_timeout(2000) # wait for render
        
        print("Testing India (BHARAT_VIBE)...")
        await page.evaluate("window.aegisStream.notify({ event_type: 'LOCATION_UPDATE', data: { vpn_active: true, city: 'Mumbai', country: 'India' } })")
        await page.wait_for_timeout(2000) # wait for css transition
        await page.screenshot(path="C:/Users/rajea/.gemini/antigravity/brain/ee77b5f4-d532-47c8-a14f-664edb6e0d5c/india_aura.png")
        
        print("Testing Germany (DEUTSCHLAND_GLOW)...")
        await page.evaluate("window.aegisStream.notify({ event_type: 'LOCATION_UPDATE', data: { vpn_active: true, city: 'Berlin', country: 'Germany' } })")
        await page.wait_for_timeout(2000) # wait for css transition
        await page.screenshot(path="C:/Users/rajea/.gemini/antigravity/brain/ee77b5f4-d532-47c8-a14f-664edb6e0d5c/germany_aura.png")
        
        await browser.close()
        print("Done.")

asyncio.run(main())
