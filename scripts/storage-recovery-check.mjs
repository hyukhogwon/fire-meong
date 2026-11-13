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
try {
  for (const mode of ["corrupt", "blocked"]) {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript((mode) => {
      if (mode === "blocked")
        Object.defineProperty(window, "localStorage", {
          get() {
            throw new DOMException("Blocked", "SecurityError");
          },
        });
      else {
        localStorage.setItem("fire-mung:identity", "{");
        localStorage.setItem(
          "fire-mung:wishes",
          JSON.stringify([{ text: "invalid", at: 1e20 }]),
        );
        localStorage.setItem("fire-mung:volume", "NaN");
      }
    }, mode);
    await page.goto("http://127.0.0.1:4173");
    await page
      .getByRole("button", { name: "내 소원 보기", exact: true })
      .click();
    await page.getByText("아직 빈 소원이 없어요.", { exact: true }).waitFor();
    await page.keyboard.press("Escape");
    await page
      .getByRole("button", { name: "이름·모습 다시 뽑기", exact: true })
      .click();
    await page.getByRole("slider").fill("0.4");
    if (errors.length) throw Error(errors.join("\n"));
    console.log("PASS:", mode, "storage renders and stays usable");
    await page.close();
  }
} finally {
  await browser.close();
}
