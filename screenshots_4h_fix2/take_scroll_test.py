"""
額外 scroll 測試：
切到 Peter+Amy 家庭，看四層是否出現 scroll
"""
import asyncio
import os
from playwright.async_api import async_playwright

BASE_URL = "http://localhost:3000"
OUT = "/home/user/coeldery-family-tree/screenshots_4h_fix2"


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(args=["--no-sandbox"])
        ctx = await browser.new_context(viewport={"width": 390, "height": 844})
        page = await ctx.new_page()

        console_errors = []
        page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)

        await page.goto(BASE_URL, wait_until="networkidle")
        await page.wait_for_timeout(1500)

        # 取得 main 的 scrollHeight 與 clientHeight
        def get_scroll_info():
            return page.evaluate("""
                () => {
                  const main = document.querySelector('main[role="main"]');
                  return main ? {
                    scrollHeight: main.scrollHeight,
                    clientHeight: main.clientHeight,
                    scrollTop: main.scrollTop,
                    canScroll: main.scrollHeight > main.clientHeight
                  } : null;
                }
            """)

        # 初始狀態
        info0 = await get_scroll_info()
        print(f"初始 main scroll info: {info0}")
        await page.screenshot(path=f"{OUT}/extra_a0_initial.png")

        # 點擊子女代中的卡（Amy 或第一個 chip）
        # 找下層的卡 - 子女代是在 FocusChildLayer 中
        # 透過 JS 直接 click 子女代第一個 chip
        clicked = await page.evaluate("""
            () => {
              // 找子女代 label 後面的 wrapper
              const labels = Array.from(document.querySelectorAll('div'));
              const childLabel = labels.find(d => d.textContent && d.textContent.trim() === '子女代');
              if (!childLabel) return 'no child label';
              
              // 找下方第一個有 cursor:pointer 的 div
              let el = childLabel.nextElementSibling;
              let attempts = 0;
              while (el && attempts < 20) {
                const chips = el.querySelectorAll('[style*="cursor: pointer"]');
                if (chips.length > 0) {
                  const chip = chips[0];
                  const rect = chip.getBoundingClientRect();
                  chip.click();
                  return { clicked: chip.textContent?.slice(0, 30), rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height } };
                }
                el = el.nextElementSibling;
                attempts++;
              }
              return 'chip not found';
            }
        """)
        print(f"點擊子女代卡: {clicked}")
        await page.wait_for_timeout(600)

        info1 = await get_scroll_info()
        print(f"切焦點後 main scroll info: {info1}")
        await page.screenshot(path=f"{OUT}/extra_a1_after_focus_child.png")

        # 如果有 scroll，測試上下 scroll
        if info1 and info1.get("canScroll"):
            print("✅ 有 scroll！測試上下 scroll...")
            # scroll to bottom
            await page.evaluate("""
                () => {
                  const main = document.querySelector('main[role="main"]');
                  if (main) main.scrollTo({ top: main.scrollHeight, behavior: 'smooth' });
                }
            """)
            await page.wait_for_timeout(600)
            await page.screenshot(path=f"{OUT}/extra_a2_scroll_bottom.png")
            info_bottom = await get_scroll_info()
            print(f"scroll 到底後: {info_bottom}")

            # scroll back to top
            await page.evaluate("""
                () => {
                  const main = document.querySelector('main[role="main"]');
                  if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
                }
            """)
            await page.wait_for_timeout(600)
            await page.screenshot(path=f"{OUT}/extra_a3_scroll_top.png")
            info_top = await get_scroll_info()
            print(f"scroll 回頂後: {info_top}")
        else:
            print("❌ 無需 scroll（三層恰好 viewport）")
            # 嘗試再點一層
            print("嘗試再進一層...")
            clicked2 = await page.evaluate("""
                () => {
                  const main = document.querySelector('main[role="main"]');
                  if (!main) return 'no main';
                  const chips = main.querySelectorAll('[style*="cursor: pointer"]');
                  // 找子女代的卡（最下方）
                  let lastChip = null;
                  chips.forEach(c => {
                    const rect = c.getBoundingClientRect();
                    if (rect.top > 400) lastChip = c;
                  });
                  if (lastChip) {
                    lastChip.click();
                    return { clicked: lastChip.textContent?.slice(0, 30) };
                  }
                  return 'no chip found below 400';
                }
            """)
            print(f"再點下層: {clicked2}")
            await page.wait_for_timeout(600)
            info2 = await get_scroll_info()
            print(f"再點後 scroll info: {info2}")
            await page.screenshot(path=f"{OUT}/extra_a1b_after_second_focus.png")

            if info2 and info2.get("canScroll"):
                print("✅ 現在有 scroll！")
                await page.evaluate("""
                    () => {
                      const main = document.querySelector('main[role="main"]');
                      if (main) main.scrollTo({ top: main.scrollHeight, behavior: 'smooth' });
                    }
                """)
                await page.wait_for_timeout(600)
                await page.screenshot(path=f"{OUT}/extra_a2_scroll_bottom.png")
                await page.evaluate("""
                    () => {
                      const main = document.querySelector('main[role="main"]');
                      if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                """)
                await page.wait_for_timeout(600)
                await page.screenshot(path=f"{OUT}/extra_a3_scroll_top.png")

        print(f"\nConsole errors: {console_errors if console_errors else 'NONE ✅'}")
        await browser.close()


asyncio.run(main())
