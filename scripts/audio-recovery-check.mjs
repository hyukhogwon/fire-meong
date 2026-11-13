import { chromium } from "@playwright/test";
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  headless: true,
  args: [
    "--enable-webgl",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const page = await browser.newPage();
await page.addInitScript(() => {
  const Native = window.AudioContext;
  window.AudioContext = class extends Native {
    constructor(...args) {
      super(...args);
      window.__audioContext = this;
    }
  };
});
await page.goto("http://127.0.0.1:5173");
await page.getByRole("button", { name: "🔥 불 피우기", exact: true }).click();
await page.waitForFunction(() => !document.querySelector(".start-overlay"));
await page.evaluate(async () => {
  const c = window.__audioContext;
  c.resume = () => new Promise(() => {});
  await c.suspend();
});
try {
  await page
    .getByRole("button", { name: "🔥 소리 다시 켜기", exact: true })
    .waitFor({ timeout: 3000 });
  console.log("PASS: interrupted audio immediately exposes recovery");
} finally {
  await browser.close();
}
