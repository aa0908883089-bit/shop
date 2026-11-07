const { chromium } = require("playwright");
const fs = require("fs");

// ↓↓↓ 要抓的專輯放這裡，一行一個 ↓↓↓
const TARGETS = [
  { name: "全部", url: "https://a2018031319125075986.szwego.com/static/index.html#/shop_detail/A2018031319125075986" },
];
const CAP = 300;
const SCROLLS = 14;

(async () => {
  const browser = await chromium.launch();
  const all = new Map();
  for (const t of TARGETS) {
    const page = await browser.newPage({
      viewport: { width: 430, height: 900 },
      locale: "zh-TW",
      userAgent: "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Mobile Safari/537.36",
    });
    try {
      await page.goto(t.url, { waitUntil: "networkidle", timeout: 60000 });
      await page.waitForTimeout(2500);
      for (let i = 0; i < SCROLLS; i++) {
        await page.mouse.wheel(0, 2800);
        await page.waitForTimeout(1000);
      }
      await page.waitForTimeout(1200);
      const items = await page.evaluate(() => {
        const out = [];
        document.querySelectorAll("img").forEach((img) => {
          const s = img.getAttribute("src") || "";
          const m = s.match(/xcimg\.szwego\.com\/((?:img|imgHD)\/[^?]+)/);
          if (!m) return;
          let el = img.parentElement, title = "";
          for (let d = 0; d < 4 && el; d++) {
            const line = (el.innerText || "").trim().split("\n")[0].trim();
            if (line.length > 3) { title = line; break; }
            el = el.parentElement;
          }
          if (!title) return;
          out.push({ t: title, i: m[1] });
        });
        return out;
      });
      for (const it of items.slice(0, CAP)) if (!all.has(it.i)) all.set(it.i, { ...it, c: t.name });
      console.log(`[${t.name}] ${items.length} 筆`);
    } catch (e) {
      console.log(`[${t.name}] 失敗：${e.message}`);
    } finally {
      await page.close();
    }
  }
  await browser.close();
  const next = [...all.values()];
  if (next.length === 0) { console.log("0 筆，保留舊資料"); return; }
  fs.writeFileSync("data.json", JSON.stringify(next));
  console.log(`完成 ${next.length} 筆`);
})();
