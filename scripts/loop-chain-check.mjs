import { chromium } from "@playwright/test";
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  headless: true,
});
try {
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:5173");
  const result = await page.evaluate(async () => {
    const { LoopLayer } = await import("/src/audio/loop-layer.ts");
    const ctx = new AudioContext();
    await ctx.resume();
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 7, ctx.sampleRate);
    const layer = new LoopLayer(ctx, buffer, ctx.destination);
    layer.start(ctx.currentTime + 0.15);
    await new Promise((r) => setTimeout(r, 8000));
    const starts = [...layer.playStarts];
    layer.stop();
    await ctx.close();
    return starts;
  });
  console.log("native scheduled starts:", result);
  if (result.length !== 3) throw Error("Unexpected number of loop plays");
  console.log(
    "PASS: native loop schedules exactly one successor per ended source",
  );
} finally {
  await browser.close();
}
