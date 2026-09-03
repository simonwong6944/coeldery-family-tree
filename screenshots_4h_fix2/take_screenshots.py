"""
4h-fix-2 截圖腳本
驗收：(a) scroll 頂/中/底, (b) carousel scroll + 下層對位,
      (c) 頭像 click, (d) 中層橫線, (e) 置中, (f) console 無錯誤
"""
import asyncio
import os
from playwright.async_api import async_playwright

BASE_URL = "http://localhost:3000"
OUT = "/home/user/coeldery-family-tree/screenshots_4h_fix2"

JS_SET_FOCUS = """
(focusId) => {
  const event = new CustomEvent('dev:setFocusId', { detail: { id: focusId } });
  window.dispatchEvent(event);
}
"""

JS_GET_MAIN_SCROLL_HEIGHT = """
() => {
  const main = document.querySelector('main[role="main"]');
  if (!main) return null;
  return {
    scrollHeight: main.scrollHeight,
    clientHeight: main.clientHeight,
    scrollTop: main.scrollTop,
    style: main.getAttribute('style')
  };
}
"""

JS_SCROLL_MAIN = """
(top) => {
  const main = document.querySelector('main[role="main"]');
  if (main) { main.scrollTop = top; }
  return main ? main.scrollTop : -1;
}
"""

JS_GET_CONSOLE_ERRORS = """
() => { return window.__consoleErrors__ || []; }
"""

JS_INSTALL_CONSOLE_CAPTURE = """
() => {
  window.__consoleErrors__ = [];
  const orig = console.error.bind(console);
  console.error = function() {
    window.__consoleErrors__.push(Array.from(arguments).join(' '));
    orig.apply(console, arguments);
  };
}
"""

JS_CAROUSEL_SCROLL_RIGHT = """
() => {
  const el = document.querySelector('[style*="scroll-snap-type"]');
  if (!el) return 'carousel not found';
  el.scrollBy({ left: 200, behavior: 'smooth' });
  return 'scrolled right';
}
"""

JS_GET_CHILD_TRACK_TRANSFORM = """
() => {
  const main = document.querySelector('main[role="main"]');
  if (!main) return null;
  const tracks = main.querySelectorAll('[style*="will-change"]');
  const results = [];
  tracks.forEach(t => {
    results.push({ transform: t.style.transform, childCount: t.children.length });
  });
  return results;
}
"""

JS_GET_SIBLING_BAR = """
() => {
  const bars = document.querySelectorAll('[aria-hidden="true"]');
  const result = [];
  bars.forEach(b => {
    const s = b.style;
    if (s.height === '2px') {
      const rect = b.getBoundingClientRect();
      result.push({ height: s.height, width: rect.width, top: rect.top, visible: rect.width > 0 });
    }
  });
  return result;
}
"""


async def main():
    os.makedirs(OUT, exist_ok=True)
    console_errors = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(args=["--no-sandbox"])
        ctx = await browser.new_context(viewport={"width": 390, "height": 844})
        page = await ctx.new_page()

        # Capture console errors
        def handle_console(msg):
            if msg.type == "error":
                console_errors.append(msg.text)
        page.on("console", handle_console)

        await page.goto(BASE_URL, wait_until="networkidle")
        await page.wait_for_timeout(1500)

        # Install console error capture in page
        await page.evaluate(JS_INSTALL_CONSOLE_CAPTURE)

        # ── (f) console 無錯誤（先拍，之後再確認）──
        await page.screenshot(path=f"{OUT}/f_console_initial.png", full_page=False)
        print(f"[f] Initial screenshot done. Console errors so far: {console_errors}")

        # ── (a) 上下 scroll：頂/中/底 ──
        print("\n=== (a) Scroll top/mid/bottom ===")

        # 先確認 main scroll container
        main_info = await page.evaluate(JS_GET_MAIN_SCROLL_HEIGHT)
        print(f"  main info: {main_info}")

        # a1: scroll to top
        await page.evaluate(JS_SCROLL_MAIN, 0)
        await page.wait_for_timeout(300)
        await page.screenshot(path=f"{OUT}/a1_scroll_top.png")
        print("  [a1] top screenshot done")

        # a2: scroll to middle
        if main_info and main_info.get("scrollHeight"):
            mid = main_info["scrollHeight"] // 2
            await page.evaluate(JS_SCROLL_MAIN, mid)
            await page.wait_for_timeout(300)
        await page.screenshot(path=f"{OUT}/a2_scroll_mid.png")
        print("  [a2] mid screenshot done")

        # a3: scroll to bottom
        if main_info and main_info.get("scrollHeight"):
            await page.evaluate(JS_SCROLL_MAIN, main_info["scrollHeight"])
            await page.wait_for_timeout(300)
        await page.screenshot(path=f"{OUT}/a3_scroll_bottom.png")
        print("  [a3] bottom screenshot done")

        # scroll back to top for next tests
        await page.evaluate(JS_SCROLL_MAIN, 0)
        await page.wait_for_timeout(300)

        # ── (d) 中層橫線（SiblingBar）──
        print("\n=== (d) SiblingBar check ===")
        bars = await page.evaluate(JS_GET_SIBLING_BAR)
        print(f"  2px bars found: {bars}")
        await page.screenshot(path=f"{OUT}/d_sibling_bar.png")
        print("  [d] sibling bar screenshot done")

        # ── (e) 置中驗證 ──
        print("\n=== (e) Center alignment ===")
        await page.screenshot(path=f"{OUT}/e_center_align.png")
        print("  [e] center align screenshot done")

        # ── (b) carousel scroll + 下層對位 ──
        print("\n=== (b) Carousel scroll + child layer alignment ===")

        # b1: 初始狀態
        track_before = await page.evaluate(JS_GET_CHILD_TRACK_TRANSFORM)
        print(f"  track transform BEFORE scroll: {track_before}")
        await page.screenshot(path=f"{OUT}/b1_before_scroll.png")

        # b2: 右 scroll
        result = await page.evaluate(JS_CAROUSEL_SCROLL_RIGHT)
        print(f"  carousel scroll: {result}")
        await page.wait_for_timeout(800)
        track_after = await page.evaluate(JS_GET_CHILD_TRACK_TRANSFORM)
        print(f"  track transform AFTER scroll right: {track_after}")
        await page.screenshot(path=f"{OUT}/b2_after_scroll_right.png")

        # b3: 再左 scroll（回去）
        await page.evaluate("""
            () => {
              const el = document.querySelector('[style*="scroll-snap-type"]');
              if (el) el.scrollBy({ left: -200, behavior: 'smooth' });
            }
        """)
        await page.wait_for_timeout(800)
        track_return = await page.evaluate(JS_GET_CHILD_TRACK_TRANSFORM)
        print(f"  track transform AFTER scroll back: {track_return}")
        await page.screenshot(path=f"{OUT}/b3_after_scroll_back.png")
        print("  [b] carousel scroll screenshots done")

        # ── (c) 頭像 click ──
        print("\n=== (c) Avatar click test ===")
        # 找 primary household chip（focus 中層卡）
        chip = page.locator("main [style*='cursor: pointer']").first
        box = await chip.bounding_box()
        if box:
            # click 左側 → primary
            await page.mouse.click(box["x"] + box["width"] * 0.25, box["y"] + box["height"] * 0.5)
            await page.wait_for_timeout(300)
            await page.screenshot(path=f"{OUT}/c1_click_primary.png")
            print(f"  [c1] click primary at x={box['x'] + box['width']*0.25:.0f}")

            # dblclick → navigate to /member/:id
            await page.mouse.dblclick(box["x"] + box["width"] * 0.25, box["y"] + box["height"] * 0.5)
            await page.wait_for_timeout(500)
            url_hash = await page.evaluate("() => window.location.hash")
            print(f"  [c] after dblclick hash: {url_hash}")
            await page.screenshot(path=f"{OUT}/c2_dblclick_nav.png")

            # navigate back
            await page.go_back()
            await page.wait_for_timeout(500)
        else:
            print("  [c] chip not found")

        # ── (f) 最終 console errors ──
        print(f"\n=== (f) Console errors ===")
        print(f"  Captured during test: {console_errors}")
        await page.goto(BASE_URL, wait_until="networkidle")
        await page.wait_for_timeout(1000)
        await page.screenshot(path=f"{OUT}/f_final.png")

        # ── 寫 summary ──
        summary_lines = [
            "# 4h-fix-2 截圖驗收報告",
            "",
            f"## main scroll container",
            f"  {main_info}",
            "",
            f"## (d) SiblingBar (2px lines)",
            f"  {bars}",
            "",
            f"## (b) Child track transform",
            f"  BEFORE: {track_before}",
            f"  AFTER right: {track_after}",
            f"  AFTER back:  {track_return}",
            "",
            f"## (f) Console errors",
            f"  {console_errors if console_errors else 'NONE ✅'}",
            "",
        ]
        with open(f"{OUT}/summary.md", "w") as f:
            f.write("\n".join(summary_lines))
        print(f"\n✅ All screenshots saved to {OUT}")

        await browser.close()


asyncio.run(main())
