// One-off script: generates PWA/app icons from the Metrocinemas star mark,
// composited on a solid navy background so the icons read on a home screen
// (and work as "maskable" — enough padding that the star survives an
// adaptive-icon safe-area crop).
//
// Usage: node scripts/gen-icons.mjs
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const logoPath = path.join(root, "public", "logo.png");

const NAVY = "#09142e";

// The source logo.png is a wide wordmark (gold star + white "metro cinemas"
// text). Only the star reads at icon sizes, so we crop just the star mark
// out of the top-left of the wordmark before compositing.
const STAR_CROP = { left: 0, top: 0, width: 36, height: 57 };

async function makeIcon(size, outPath, { padPct = 0.28 } = {}) {
  // padPct = fraction of the square reserved as margin on each side, so the
  // star sits within the maskable "safe zone" (~center 80% for adaptive icons,
  // we go a bit more conservative).
  const contentSize = Math.round(size * (1 - padPct * 2));

  const star = await sharp(logoPath)
    .extract(STAR_CROP)
    .resize({
      width: contentSize,
      height: contentSize,
      fit: "inside",
      withoutEnlargement: false,
    })
    .toBuffer();

  const starMeta = await sharp(star).metadata();
  const left = Math.round((size - (starMeta.width ?? contentSize)) / 2);
  const top = Math.round((size - (starMeta.height ?? contentSize)) / 2);

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: NAVY,
    },
  })
    .composite([{ input: star, left, top }])
    .png()
    .toFile(outPath);

  console.log(`  wrote ${path.relative(root, outPath)} (${size}x${size})`);
}

async function main() {
  console.log("Generating Metrocinemas app icons from public/logo.png ...");

  await makeIcon(192, path.join(root, "public", "icon-192.png"));
  await makeIcon(512, path.join(root, "public", "icon-512.png"));
  await makeIcon(180, path.join(root, "public", "apple-icon.png"), { padPct: 0.18 });
  await makeIcon(32, path.join(root, "public", "favicon-32.png"), { padPct: 0.12 });

  // Next.js file-convention icons (browser tab favicon + iOS install icon).
  await makeIcon(48, path.join(root, "src", "app", "icon.png"), { padPct: 0.12 });
  await makeIcon(180, path.join(root, "src", "app", "apple-icon.png"), { padPct: 0.18 });

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
