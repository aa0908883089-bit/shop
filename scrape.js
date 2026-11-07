const { chromium } = require("playwright");
const fs = require("fs");

const TARGETS = [
  { name: "全部", url: "https://a2018031319125075986.szwego.com/static/index.html#/shop_detail/A2018031319125075986" },
  { name: "鞋子", url: "https://a2018031319125075986.szwego.com/static/index.html#/shop_detail/A你的鞋子ID" },
  { name: "外套", url: "https://a2018031319125075986.szwego.com/static/index.html#/shop_detail/A你的外套ID" },
];
const CAP = 60;
const SCROLLS = 14;
const EXCLUDE = ["i1705081374_4269", "default_theme_addCart"];
const BAD = ["教程", "快速查找", "新手", "視頻", "影片", "置頂", "掛車", "招商", "必看"];

function clean(s) {
  const o = s;
  s = s.replace(/https?:\/\/\S+/g, "")
    .replace(/(微信|Line|LINE|line)[:：\s]*[@\w.-]*/g, "")
    .replace(/Tk搜|原單精品供應商|一件起批|點擊網址|帶圖來你要的我都有/g, "")
    .replace(/\s+/g, " ").trim();
  return (s.length >= 4 ? s : o).slice(0, 60);
}

(async () => {
  const browser = await chromium.launch();
  const all = new Map();
  const links = new Set();

  for (const t of TARGETS) {
    const page = await browser.newPage({
      viewport: { width: 430, height: 900 }, locale: "zh-TW",
      userAgent: "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Mobile Safari/537.36",
    });
    try {
      await page.goto(t.url, { waitUntil: "networkidle", timeout: 60000 });
      await page.waitForTimeout(2500);
      for (let i = 0; i < SCROLLS; i++) { await page.mouse.wheel(0, 2800); await page.waitForTimeout(1000); }
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
          const a = img.closest("a[href]");
          out.push({ t: title || "", i: m[1], h: a ? a.getAttribute("href") : "" });
        });
        return out;
      });

      let n = 0;
      for (const it of items) {
        if (n >= CAP) break;
        if (EXCLUDE.some((e) => it.i.includes(e))) continue;
        const title = clean(it.t);
        if (BAD.some((b) => title.includes(b))) { console.log("剔除：" + title); continue; }
        if (all.has(it.i)) continue;
        all.set(it.i, { t: title, i: it.i, c: t.name, h: it.h || "" });
        if (it.h) links.add(it.h);
        n++;
      }
      console.log(`[${t.name}] 收 ${n} 筆`);
    } catch (e) {
      console.log(`[${t.name}] 失敗：${e.message}`);
    } finally { await page.close(); }
  }

  await browser.close();
  console.log("=== 商品連結樣本（前 5 個）===");
  [...links].slice(0, 5).forEach((x) => console.log(x));
  console.log("=== 連結總數：" + links.size + " ===");

  const next = [...all.values()];
  if (!next.length) { console.log("0 筆，保留舊資料"); return; }
  fs.writeFileSync("data.json", JSON.stringify(next));
  console.log(`完成 ${next.length} 筆`);
})();
