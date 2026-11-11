import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const source = new URL("../public/admin/icon.svg", import.meta.url);
const output = new URL("../public/admin/icons/", import.meta.url);
await mkdir(output, { recursive: true });

for (const size of [192, 512]) {
  await sharp(fileURLToPath(source)).resize(size, size).png().toFile(fileURLToPath(new URL(`icon-${size}.png`, output)));
}

// Keep the entire mark within the maskable icon's central safe circle.
const mark = await sharp(fileURLToPath(source)).resize(288, 288).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 3, background: "#fbf7ed" } })
  .composite([{ input: mark, gravity: "centre" }])
  .png()
  .toFile(fileURLToPath(new URL("icon-maskable-512.png", output)));
