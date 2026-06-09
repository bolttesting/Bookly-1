import fs from "node:fs";
import sharp from "sharp";

const svg = fs.readFileSync("public/favicon.svg");

const targets = [
  { out: "public/favicon-48.png", size: 48 },
  { out: "public/apple-touch-icon.png", size: 180 },
];

for (const { out, size } of targets) {
  await sharp(svg, { density: 384 })
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(out);
  console.log(out, `${size}x${size}`);
}
