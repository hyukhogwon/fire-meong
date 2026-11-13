import { chromium } from "@playwright/test";
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
const root = path.resolve("dist");
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    if (!url.pathname.startsWith("/camp/")) {
      res.writeHead(404).end();
      return;
    }
    const file = path.resolve(
      root,
      decodeURIComponent(url.pathname.slice(6)) || "index.html",
    );
    if (!file.startsWith(root + path.sep) && file !== root) {
      res.writeHead(403).end();
      return;
    }
    const types = {
      ".html": "text/html",
      ".js": "text/javascript",
      ".css": "text/css",
      ".mp3": "audio/mpeg",
    };
    res.setHeader("Content-Type", types[path.extname(file)] || "text/plain");
    res.end(await fs.readFile(file));
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((r) => server.listen(4183, "127.0.0.1", r));
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  headless: true,
  args: [
    "--enable-webgl",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
  });
  await page.goto("http://127.0.0.1:4183/camp/");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "🔥 불 피우기", exact: true }).click();
  await page.waitForFunction(() => !document.querySelector(".start-overlay"));
  if (errors.length) throw Error(errors.join("\n"));
  console.log("PASS: production app and both audio assets work under /camp/");
  const other = await page.context().newPage();
  await other.goto("about:blank");
  await other.bringToFront();
  console.log(
    "visibility after another tab:",
    await page.evaluate(() => document.visibilityState),
  );
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
