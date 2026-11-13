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
const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.addInitScript(() => {
  const Native = window.AudioContext;
  window.__plays = [];
  window.AudioContext = class extends Native {
    constructor(...args) {
      super(...args);
      window.__audioContext = this;
      const create = this.createBufferSource.bind(this);
      this.createBufferSource = () => {
        const source = create(),
          start = source.start.bind(source);
        source.start = (at, ...rest) => {
          window.__plays.push({ at, duration: source.buffer?.duration });
          return start(at, ...rest);
        };
        return source;
      };
    }
  };
});
await page.goto("http://127.0.0.1:4173");
await page.getByRole("button", { name: "🔥 불 피우기", exact: true }).click();
await page.waitForFunction(() => !document.querySelector(".start-overlay"));
console.log(
  "initial audio",
  await page.evaluate(() => ({
    state: window.__audioContext.state,
    plays: window.__plays,
  })),
);
await page
  .getByRole("button", { name: "🍡 마시멜로 굽기", exact: true })
  .click();
await page.getByRole("button", { name: "🌈 오로라 가루", exact: true }).click();
await page.getByRole("button", { name: "초록", exact: true }).click();
await page.getByRole("button", { name: "넣기", exact: true }).click();
// Open another page. Headless Chromium may keep document.visibilityState visible.
// This checks continuous audio scheduling and wall-clock effect expiry.
const other = await browser.newPage();
await other.goto("about:blank");
await other.bringToFront();
for (let i = 0; i < 5; i++) {
  await new Promise((r) => setTimeout(r, 55000));
  console.log(
    "elapsed",
    55 * (i + 1),
    await page.evaluate(() => ({
      state: window.__audioContext.state,
      audioTime: window.__audioContext.currentTime,
      plays: window.__plays.length,
    })),
  );
}
await page.bringToFront();
await page.waitForTimeout(1200);
if (
  await page
    .getByRole("button", { name: "🍡 마시멜로 굽기", exact: true })
    .isDisabled()
)
  throw Error("toast did not expire");
if (
  await page
    .getByRole("button", { name: "🌈 오로라 가루", exact: true })
    .isDisabled()
)
  throw Error("aurora did not expire");
const result = await page.evaluate(() => ({
  state: window.__audioContext.state,
  time: window.__audioContext.currentTime,
  plays: window.__plays,
}));
if (result.state !== "running" || result.plays.length < 6)
  throw Error("audio loop did not continue");
if (
  new Set(result.plays.map((p) => `${p.at}:${p.duration}`)).size !==
  result.plays.length
)
  throw Error("Duplicate loop scheduling");
if (errors.length) throw Error(errors.join("\n"));
console.log(
  "PASS: >4 minutes, both audio loops rescheduled, wall-clock effect expiry",
  JSON.stringify(result),
);
await browser.close();
