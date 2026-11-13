import { chromium } from "@playwright/test";
import fs from "node:fs";
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  headless: true,
  args: [
    "--enable-webgl",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
await page.goto("http://127.0.0.1:5173");
await page.waitForLoadState("networkidle");
fs.mkdirSync("artifacts", { recursive: true });
await page.screenshot({ path: "artifacts/welcome.png" });
console.log("buttons", await page.getByRole("button").allTextContents());
await page.getByRole("button", { name: "🔥 불 피우기", exact: true }).click();
await page.waitForFunction(() => !document.querySelector(".start-overlay"), {
  timeout: 60000,
});
await page.screenshot({ path: "artifacts/camp.png" });
await page.getByRole("button", { name: "🪵 장작 넣기", exact: true }).click();
await page
  .getByRole("button", { name: "🍡 마시멜로 굽기", exact: true })
  .click();
await page.getByRole("button", { name: "🌠 소원 빌기", exact: true }).click();
await page
  .getByRole("textbox", { name: "소원", exact: true })
  .fill("오늘도 무사히, 내일도 평온하게.");
await page.getByRole("button", { name: "빌기", exact: true }).click();
await page.getByRole("button", { name: "🌈 오로라 가루", exact: true }).click();
await page.getByRole("button", { name: "초록", exact: true }).click();
await page.getByRole("button", { name: "파랑", exact: true }).click();
if (
  !(await page.getByRole("button", { name: "분홍", exact: true }).isDisabled())
)
  throw Error("third colour enabled");
await page.getByRole("button", { name: "넣기", exact: true }).click();
await page.screenshot({ path: "artifacts/effects.png" });
await page.getByRole("button", { name: "내 소원 보기", exact: true }).click();
await page
  .getByText("오늘도 무사히, 내일도 평온하게.", { exact: true })
  .waitFor();
await page.keyboard.press("Escape");
const before = await page.evaluate(() =>
  localStorage.getItem("fire-mung:identity"),
);
await page
  .getByRole("button", { name: "이름·모습 다시 뽑기", exact: true })
  .click();
const after = await page.evaluate(() =>
  localStorage.getItem("fire-mung:identity"),
);
if (before === after) throw Error("reroll failed");
await page.getByRole("slider", { name: "볼륨" }).fill("0.32");
await page.reload();
await page.waitForLoadState("networkidle");
if ((await page.getByRole("slider").inputValue()) !== "0.32")
  throw Error("volume not persisted");
if (!(await page.getByRole("button", { name: /장작 넣기.*후/ }).isDisabled()))
  throw Error("log cooldown lost");
if (!(await page.getByRole("button", { name: /소원 빌기.*후/ }).isDisabled()))
  throw Error("wish cooldown lost");
await page.setViewportSize({ width: 600, height: 900 });
await page.screenshot({ path: "artifacts/narrow.png" });
console.log("errors", errors);
if (errors.length) throw Error(errors.join("\n"));
console.log(
  "PASS: scene, start audio, log, toast, wishes, aurora selection, reroll, persistence, narrow layout",
);
await browser.close();
