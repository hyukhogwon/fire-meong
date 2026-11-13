import fs from "node:fs";
await Promise.all(
  [
    [
      "https://cdn.freesound.org/previews/729/729396_12863902-hq.mp3",
      "public/audio/campfire.mp3",
    ],
    [
      "https://cdn.freesound.org/previews/333/333221_2098408-hq.mp3",
      "public/audio/crickets.mp3",
    ],
    [
      "https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/stars.6.json",
      "assets/stars.6.json",
    ],
    [
      "https://raw.githubusercontent.com/ofrohn/d3-celestial/master/LICENSE",
      "assets/STAR-LICENSE",
    ],
  ].map(async ([url, path]) => {
    const r = await fetch(url);
    if (!r.ok) throw Error(`${url}: ${r.status}`);
    fs.mkdirSync(path.slice(0, path.lastIndexOf("/")), { recursive: true });
    fs.writeFileSync(path, Buffer.from(await r.arrayBuffer()));
    console.log(path, fs.statSync(path).size);
  }),
);
const stars = JSON.parse(
  fs.readFileSync("assets/stars.6.json", "utf8"),
).features.filter((s) => s.properties.mag <= 6);
const flat = stars.flatMap((s) => {
  const [ra, dec] = s.geometry.coordinates;
  return [
    ((ra % 360) + 360) % 360,
    dec,
    s.properties.mag,
    parseFloat(s.properties.bv) || 0.6,
  ].map((n) => Math.round(n * 1000) / 1000);
});
fs.writeFileSync(
  "src/scene/sky-data.ts",
  "// d3-celestial, BSD-3-Clause, Copyright (c) 2015 Olaf Frohn. See assets/STAR-LICENSE\nexport const STARS: number[] = " +
    JSON.stringify(flat) +
    ";\n",
);
console.log("stars", stars.length);
