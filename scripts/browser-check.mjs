import { chromium, expect } from "@playwright/test";
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
const trigger = page.locator(".activity-trigger");
const panel = page.getByRole("group", { name: "캠프파이어 활동" });
await expect(panel).toBeHidden();
await trigger.focus();
await page.keyboard.press("Enter");
await expect(trigger).toHaveAttribute("aria-expanded", "true");
await page.keyboard.press("Escape");
await expect(panel).toBeHidden();
await expect(trigger).toBeFocused();
await trigger.click();
await page.mouse.click(10, 150);
await expect(panel).toBeHidden();
await trigger.click();
await page.getByRole("button", { name: "☔ 비 내리기", exact: true }).click();
await expect(panel).toBeHidden();
await trigger.click();
await expect(
  page.getByRole("button", { name: "☀️ 비 그치기" }),
).toHaveAttribute("aria-pressed", "true");
await page.getByRole("button", { name: "☀️ 비 그치기" }).click();

await page.getByRole("button", { name: "캠프 활동", exact: true }).click();
await page.getByRole("button", { name: "🪵 장작 넣기", exact: true }).click();
await page.getByRole("button", { name: "캠프 활동", exact: true }).click();
await page
  .getByRole("button", { name: "🍡 마시멜로 굽기", exact: true })
  .click();
await page.getByRole("button", { name: "캠프 활동", exact: true }).click();
await page.getByRole("button", { name: "🌠 소원 빌기", exact: true }).click();
await page
  .getByRole("textbox", { name: "소원", exact: true })
  .fill("오늘도 무사히, 내일도 평온하게.");
await page.getByRole("button", { name: "빌기", exact: true }).click();
await page.getByRole("button", { name: "캠프 활동", exact: true }).click();
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
const mute = page.getByRole("button", { name: "음소거", exact: true });
await mute.click();
await expect(mute).toHaveAttribute("aria-pressed", "true");
await expect(page.getByRole("slider", { name: "볼륨" })).toHaveValue("0");
await mute.click();
await expect(mute).toHaveAttribute("aria-pressed", "false");
await expect(page.getByRole("slider", { name: "볼륨" })).toHaveValue("0.32");
await mute.click();
await page.getByRole("slider", { name: "볼륨" }).fill("0.48");
await expect(mute).toHaveAttribute("aria-pressed", "false");
await mute.click();
await mute.click();
await expect(page.getByRole("slider", { name: "볼륨" })).toHaveValue("0.48");
await page.getByRole("slider", { name: "볼륨" }).fill("0.32");

await page.reload();
await page.waitForLoadState("networkidle");
if ((await page.getByRole("slider").inputValue()) !== "0.32")
  throw Error("volume not persisted");
await page.getByRole("button", { name: "캠프 활동", exact: true }).click();
if (!(await page.getByRole("button", { name: /장작 넣기.*후/ }).isDisabled()))
  throw Error("log cooldown lost");
if (!(await page.getByRole("button", { name: /소원 빌기.*후/ }).isDisabled()))
  throw Error("wish cooldown lost");
await page.keyboard.press("Escape");
for (const viewport of [
  { width: 844, height: 390 },
  { width: 667, height: 375 },
  { width: 390, height: 844 },
]) {
  await page.setViewportSize(viewport);
  await trigger.click();
  const box = await panel.boundingBox();
  if (
    !box ||
    box.x < 0 ||
    box.y < 0 ||
    box.x + box.width > viewport.width ||
    box.y + box.height > viewport.height
  )
    throw Error("Activity panel is outside the viewport");
  const volume = await page.locator(".volume").boundingBox();
  if (box.y < volume.y + volume.height)
    throw Error("Activity panel overlaps volume control");
  const rain = page.getByRole("button", { name: "☔ 비 내리기" });
  await rain.scrollIntoViewIfNeeded();
  await expect(rain).toBeInViewport();
  await page.screenshot({ path: `artifacts/activities-${viewport.width}.png` });
  await rain.click();
  await expect(panel).toBeHidden();
  await trigger.click();
  await page.getByRole("button", { name: "☀️ 비 그치기" }).click();
}
await page.setViewportSize({ width: 600, height: 900 });
await page.screenshot({ path: "artifacts/narrow.png" });
console.log("errors", errors);
if (errors.length) throw Error(errors.join("\n"));
console.log(
  "PASS: scene, start audio, log, toast, wishes, aurora selection, reroll, persistence, narrow layout",
);
await browser.close();
