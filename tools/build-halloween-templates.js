// file: tools/build-halloween-templates.js
// Export generated header artwork around canonical, exact transparent slots.
const { chromium } = require("@playwright/test");
const { readFileSync, writeFileSync, existsSync } = require("node:fs");
const { resolve } = require("node:path");

async function build() {
  const { STANDARD_DOUBLE_COLUMN_STRIP_SLOTS } = await import("../scripts/strip-layout-utils.mjs");
  const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH || existsSync(chrome)
      ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || chrome }
      : {}),
  });
  try {
    const page = await browser.newPage();
    for (const theme of ["halloween", "cute-halloween"]) {
      const base = resolve(__dirname, "../assets/themes", theme);
      const header = "data:image/png;base64," + readFileSync(`${base}/graphics/${theme}-strip-header.png`).toString("base64");
      const output = await page.evaluate(async ({ theme, header, slots }) => {
        const img = new Image(); img.src = header; await img.decode();
        const strip = document.createElement("canvas"); strip.width = 600; strip.height = 1800;
        const ctx = strip.getContext("2d");
        ctx.fillStyle = theme === "halloween" ? "#100c09" : "#180d26";
        ctx.fillRect(0, 0, 600, 1800);
        ctx.drawImage(img, 0, 0, 600, 330);
        ctx.strokeStyle = theme === "halloween" ? "#e89130" : "#ee9adf";
        ctx.lineWidth = 3;
        slots.slice(0, 3).forEach(({ x, y, w, h }) => {
          ctx.strokeRect(x - 4, y - 4, w + 8, h + 8);
          ctx.clearRect(x, y, w, h);
        });
        const sheet = document.createElement("canvas"); sheet.width = 1200; sheet.height = 1800;
        const sheetCtx = sheet.getContext("2d");
        sheetCtx.drawImage(strip, 0, 0); sheetCtx.drawImage(strip, 600, 0);
        const thumb = document.createElement("canvas"); thumb.width = 213; thumb.height = 320;
        thumb.getContext("2d").drawImage(sheet, 0, 0, 213, 320);
        return { png: sheet.toDataURL("image/png"), thumb: thumb.toDataURL("image/webp", 0.85) };
      }, { theme, header, slots: STANDARD_DOUBLE_COLUMN_STRIP_SLOTS });
      const name = `${base}/templates/${theme}-graphic-double-column-strip`;
      writeFileSync(name + ".png", Buffer.from(output.png.split(",")[1], "base64"));
      writeFileSync(name + ".thumb.webp", Buffer.from(output.thumb.split(",")[1], "base64"));
      console.log(`Built ${theme}: 1200x1800; identical columns; canonical alpha windows`);
    }
  } finally {
    await browser.close();
  }
}

build().catch((error) => { console.error(error); process.exitCode = 1; });
