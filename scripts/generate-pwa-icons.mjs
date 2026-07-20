import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const icons = path.join(root, "icons");
const jobs = [
  { source: "store-pilot-icon.svg", output: "store-pilot-192.png", size: 192 },
  { source: "store-pilot-icon.svg", output: "store-pilot-512.png", size: 512 },
  { source: "store-pilot-icon.svg", output: "store-pilot-apple-180.png", size: 180 },
  { source: "store-pilot-maskable.svg", output: "store-pilot-maskable-512.png", size: 512 }
];

await fs.mkdir(icons, { recursive: true });
for (const job of jobs) {
  const source = path.join(icons, job.source);
  const output = path.join(icons, job.output);
  await sharp(source, { density: 288 })
    .resize(job.size, job.size, { fit: "fill" })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(output);
  console.log(`Generated ${path.relative(root, output)} (${job.size}x${job.size})`);
}
