// Turns the original downloads in assets/source into web-sized images in src/assets/img,
// and traces the venue logos into single-colour SVGs in src/assets/logos.
// Run with `npm run images` after `python3 scripts/fetch-sources.py`.
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import potrace from "potrace";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = path.join(ROOT, "assets/source/images");
const EXTRACTED = path.join(ROOT, "assets/extracted");
const OUT = path.join(ROOT, "src/assets/img");
const LOGOS = path.join(ROOT, "src/assets/logos");

// name: [source file, widths]. Widths larger than the original are skipped.
const PHOTO = [1600, 960, 560];
const SMALL = [960, 560];
const IMAGES = {
  // Moretown
  "moretown-pano": ["c6e57a_b100cff153f9458d8237bbd7ffc7e90a.jpg", [2400, 1600, 960]],
  "moretown-pano-neon": ["c6e57a_42a08f349d33446ebb36d623f5d89257.jpg", [2400, 1600, 960]],
  "moretown-neon-burgers": ["c6e57a_a53a2b52127744c3a45c7379fe9338eb.jpg", PHOTO],
  "moretown-bar": ["c6e57a_8250c7d834cf44a0a5a85f799f602aef.jpg", PHOTO],
  "moretown-500s": ["c6e57a_05576a2bf3544c27a57de71b845de19b.jpg", PHOTO],
  "moretown-pool": ["c6e57a_e012457705ec43f8ab7713026ca292f5.jpg", PHOTO],
  "moretown-darts": ["c6e57a_9ed74bfd11a44503a20980538d13c507.jpg", PHOTO],
  "moretown-booths": ["c6e57a_f29f2a2f58904248b478207cc1155813.jpg", PHOTO],
  "moretown-200s": ["c6e57a_81d6febd841547d484df8f50f878e586.jpg", PHOTO],
  "moretown-poolballs": ["c6e57a_b7486441b4be4b1eb107897df5ed7ebb.jpg", PHOTO],
  "moretown-back": ["c6e57a_36b044ae0af24e53ab3579724f1aa7c4.jpg", PHOTO],
  "moretown-heineken": ["c6e57a_4a515b4de55d439bb03a1d703e973a41.jpg", PHOTO],
  // Duchess
  "duchess-exterior": ["ba1f1a_248cafe26f374560a61accd002bbd01b.jpg", PHOTO],
  "duchess-exterior-tall": ["ba1f1a_505a2ac396244a66ad828ecd37064f0e.jpg", PHOTO],
  "duchess-terrace": ["ba1f1a_28e2cd9bb2384705b22a869ff7b6e21f.jpg", [2400, 1600, 960]],
  "duchess-upstairs": ["ba1f1a_21fa250e9d0a4dcaadcdede92bf450fc.jpg", PHOTO],
  "duchess-topbar": ["ba1f1a_52bcc67f73184769b2d6764581c98c58.jpg", PHOTO],
  "duchess-venue-pano": ["ba1f1a_b61c6ead83804a72ad59db6d743e350a.jpg", [2400, 1600, 960]],
  "duchess-bar": ["ba1f1a_e3aa21e775ce4b3c973459200aafb526.jpg", SMALL],
  "duchess-mural": ["ba1f1a_f2490671cb4a483e8d444871bcd5f492.jpg", SMALL],
  "duchess-garden": ["ba1f1a_f1ebd9f63f644d398c84421e42f016a3.jpg", SMALL],
  "duchess-flowers": ["ba1f1a_d63e307a54d84aaf977fe183906d5c52.jpg", PHOTO],
  "duchess-backbar": ["ba1f1a_d4cc2e10c62a45948a69f7f745eef8a9.jpg", SMALL],
  "duchess-history": ["c6e57a_4a539652f49f404fb41e4d158a912ab8.jpg", SMALL],
  // Fitzrovia
  "fitzrovia-exterior": ["c6e57a_d45829f6a7f84b628fcce2f92c0301ff.jpg", PHOTO],
  "fitzrovia-night": ["ba1f1a_942858b06c9c4d9e8a5a76e0ed6c300b.jpg", SMALL],
  "fitzrovia-ceiling": ["ba1f1a_683051936e304116a55bb7769fea626e.jpg", SMALL],
  "fitzrovia-booths": ["ba1f1a_1ed55ae508b14568ad3b5fa96004191e.jpg", SMALL],
  "fitzrovia-bar": ["ba1f1a_740783e575384bb0ad67822fc42ae763.jpg", SMALL],
  "fitzrovia-frontbar": ["ba1f1a_914589fa74ef46af98e108aebef424ca.jpg", SMALL],
  "neon-cheesecake": ["c6e57a_8c75ff04c4c64861b2a5a853414d8ece.jpg", PHOTO],
  // Griffin
  "griffin-exterior": ["ba1f1a_f073bbb5cd254d5e8f6ecc944b5a07c6.jpg", PHOTO],
  "griffin-exterior-tall": ["ba1f1a_ec11c94439b649ff9722da2e87b0faba.jpg", PHOTO],
  "griffin-outside": ["ba1f1a_57c4d9781ef441cca344ffcba8ee7d23.jpg", PHOTO],
  "griffin-interior": ["ba1f1a_e631b10df0a14db0bf2673946d03a7dc.jpg", PHOTO],
  "griffin-screens": ["ba1f1a_69f2547c70134653aa5c671a8b1e7349.jpg", PHOTO],
  "griffin-banquettes": ["ba1f1a_4763680918d84d1ba39df7e4b4fa4f83.jpg", PHOTO],
  "griffin-history": ["c6e57a_012179dc8e6340d6ad6d44d3ddb1be62.jpg", SMALL],
  // Hammersmith
  "hammersmith-night": ["ba1f1a_56228237f8ce4e7d9912660133d8caee.png", PHOTO],
  "hammersmith-bar": ["ba1f1a_9cad51b4faf24139b06d4692392d02d0.png", PHOTO],
  "hammersmith-garden": ["ba1f1a_b332273fa93f411987d9bb5b55493b14.jpg", SMALL],
  "hammersmith-pergola": ["ba1f1a_a684c2bff74544568b85291cb531f834.jpg", SMALL],
  "hammersmith-castle": ["ba1f1a_9f4ded6e942a42a497eaa526742c23df.jpg", SMALL],
  "hammersmith-castle-2": ["ba1f1a_b006ee3d6ffa4fbdbced1ffe1d9b1dd3.jpg", SMALL],
  "hammersmith-darts": ["ba1f1a_fc68d485f3f44703bc35062cbee3af04.jpg", SMALL],
  "hammersmith-benches": ["ba1f1a_4adfe0a3397f48ce89f55c3b3625d211.jpg", SMALL],
  "hammersmith-jug": ["ba1f1a_2b3349fe74ea4e3bb0e8713caddaca8c.jpg", SMALL],
  // Food
  "food-spread": ["ba1f1a_633b6a09f3e242f79d15240209bda3e3.jpg", PHOTO],
  "food-roast": ["ba1f1a_41c0dc3d1bb24d22aa1bdb06f67d8736.jpg", SMALL],
  "food-fajita": ["ba1f1a_22b2784c5fe94ba282b6f87445a83804.jpg", PHOTO],
  "food-cheesecake": ["ba1f1a_0f720345250842289e857c1fc75facb1.jpg", SMALL],
  "food-wings": ["ba1f1a_71dce9e673624e6d8a1deaf044dbfd36.jpg", SMALL],
  // Rooms: Griffin
  "room-griffin-king": ["ba1f1a_173a737b9fa1453e82426575a34d2967.jpg", PHOTO],
  "room-griffin-ensuite": ["ba1f1a_3c398a0339c04dd79f2edfcb88034760.jpg", PHOTO],
  "room-griffin-triple": ["ba1f1a_4d66db156673439d90fa87ea30da5321.jpg", PHOTO],
  "room-griffin-cosy": ["ba1f1a_1f1adfbcb4ee4997ae484d176a9041bb.jpg", PHOTO],
  "room-griffin-superking": ["ba1f1a_0e64341b63a845b0882662a5bd966bef.jpg", PHOTO],
  "room-griffin-twin": ["ba1f1a_fe333e4595dc49dfb6532fc198a1503d.jpg", PHOTO],
  "room-griffin-double": ["ba1f1a_a8f209a0ae2d40b48e394fa1d7ffa633.jpg", PHOTO],
  "room-griffin-door": ["ba1f1a_09e26f6919ed481f92cb5d1c2c3fbc1a.jpg", PHOTO],
  // Rooms: Duchess
  "room-duchess-king": ["ba1f1a_622e7b7166f94db5be00b42c9805c17f.jpg", SMALL],
  "room-duchess-ensuite": ["ba1f1a_2b4e189df6e94f98988b0ff901ab57bc.jpg", SMALL],
  "room-duchess-king-2": ["ba1f1a_f88cd681fa364a2c8b62da3c66e46148.jpg", PHOTO],
  "room-duchess-3": ["ba1f1a_60f1ddf5466c4bfc97fd732309205858.jpg", PHOTO],
  "room-duchess-4": ["ba1f1a_669b91af89bb4edd962be892bceec2e9.jpg", SMALL],
  // Rooms: Fitzrovia
  "room-fitzrovia-superior": ["c6e57a_aec2f1df259c4214a8274e051c4e147d.jpg", PHOTO],
  "room-fitzrovia-superior-2": ["c6e57a_6613f77a820747db9084e12beaa4891f.jpg", PHOTO],
  "room-fitzrovia-double": ["c6e57a_a18a697bc8c64bf6a68e3d25293e4e9c.jpg", PHOTO],
  "room-fitzrovia-desk": ["c6e57a_6df40a5f08e8470fb8153b39771519d7.jpg", PHOTO],
  "room-fitzrovia-shower": ["c6e57a_99007f0160e74b939e0a3e890cf53771.jpg", PHOTO],
  "room-fitzrovia-wall": ["c6e57a_6d8304888afe4676a642cb38a6b527fc.jpg", PHOTO],
  "room-fitzrovia-one": ["c6e57a_14c5ed232fb4430bba374bfbb2ae2797.jpg", PHOTO],
  // Rooms: Hammersmith
  "room-hammersmith-twin": ["ba1f1a_8671c653971142c3907d2fa8bed774e2.jpg", SMALL],
  "room-hammersmith-double": ["ba1f1a_b488ce9e99eb4b4d8eb2807c1fffc788.jpg", SMALL],
  "room-hammersmith-shower": ["ba1f1a_13e85fd2e0a14387968d8c6669a5e641.jpg", SMALL],
  "room-hammersmith-glass": ["ba1f1a_40560d054de64bd0afed6af5ba56c501.jpg", SMALL],
  "room-hammersmith-king": ["ba1f1a_115486f1529a44edb0d2c8e9d462386d.jpg", SMALL],
  // Brand and people
  "rose-wall": ["c6e57a_e149c3d6219c47688a708e771635d291.jpg", [2000, 1200, 700]],
  "rosie-galligan": ["ba1f1a_1cddca7a913547589b16ae94aa45c04e.jpg", SMALL],
  "poster-halloween": ["ba1f1a_37993c5e15804ee39c80df2b8ef3bbbc.jpg", SMALL],
  "poster-kids-table": ["ba1f1a_6dd3254834c341b1917fc22de5f85418.jpg", SMALL],
  "poster-fizz": ["ba1f1a_7d9bb30df0194f71bbcb49036154f2a4.jpg", SMALL],
};

// Transparent PNGs kept as WebP with alpha.
const CUTOUTS = {
  "rose-pink": ["c6e57a_268c4f16417743e1ba8a47893ac42c56.png", [600, 300]],
  "rose-yellow": ["c6e57a_02f58222a694433dbc7501381a0d29e7.png", [480, 240]],
  "badge-rooms": ["ba1f1a_0ec5e1674f154e76a721aee9fe22f844.png", [480, 240]],
  "award-star": ["ba1f1a_4c94c7246bc54f08a2b922a9d4a98674.png", [480]],
  "award-hf": ["ba1f1a_92961a65aab14a2c97e84e2c7dd627da.png", [360]],
};
const EXTRACTED_CUTOUTS = {
  "menu-roses": ["menu-roses-duchess.png", [1000, 600, 360]],
  "menu-roses-alt": ["menu-roses-moretown.png", [1000, 600, 360]],
};

const LOGO_SOURCES = {
  group: "ba1f1a_92d1b69b2c4c4461814c4bc64e51700a.png",
  moretown: "c6e57a_49335b2ec4a8493a89d20aeb52e49528.jpg",
  duchess: "ba1f1a_dcf9f7b2ea2c4ab39ba162b38301f64b.jpg",
  fitzrovia: "ba1f1a_19b4855ddd4e4a1d8f510c41ffe6c294.jpg",
  griffin: "ba1f1a_a1cdb19fd21f41ab9b9f711c4fe7e161.jpg",
  hammersmith: "ba1f1a_29bdf5b329d646058f5da296cf6ab9f3.jpg",
};

async function variants(name, file, widths, { alpha = false } = {}) {
  const input = sharp(file).rotate();
  const meta = await sharp(file).rotate().metadata();
  const srcWidth = meta.autoOrient?.width ?? meta.width;
  const sizes = [...new Set(widths.map((w) => Math.min(w, srcWidth)))].sort((a, b) => b - a);
  const made = [];
  for (const w of sizes) {
    const out = path.join(OUT, `${name}-${w}.webp`);
    let pipe = input.clone().resize({ width: w, withoutEnlargement: true });
    if (!alpha) pipe = pipe.flatten({ background: "#ffffff" });
    const info = await pipe.toColourspace("srgb").webp({ quality: alpha ? 82 : 74, alphaQuality: 90 }).toFile(out);
    made.push({ w: info.width, h: info.height });
  }
  return { name, sizes: made };
}

async function traceLogo(name, file) {
  // Flatten onto white, make it grey, and threshold so potrace sees solid black letters.
  const png = await sharp(file)
    .flatten({ background: "#ffffff" })
    .toColourspace("srgb")
    .resize({ width: 2400, withoutEnlargement: true })
    .greyscale()
    .threshold(150)
    .png()
    .toBuffer();
  const svg = await new Promise((resolve, reject) =>
    potrace.trace(png, { color: "currentColor", turdSize: 8, optTolerance: 0.4 }, (err, out) =>
      err ? reject(err) : resolve(out)
    )
  );
  // Crop the viewBox to the inked area so logos sit tight in layouts.
  const { info } = await sharp(png).negate().trim().toBuffer({ resolveWithObject: true });
  const x = -info.trimOffsetLeft, y = -info.trimOffsetTop;
  const tidy = svg
    .replace(/<svg[^>]*>/, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${info.width} ${info.height}" role="img">`)
    .replace(/\s+stroke="none"/g, "")
    .replace(/fill-rule="evenodd"/, 'fill-rule="evenodd"');
  await fs.writeFile(path.join(LOGOS, `${name}.svg`), tidy);
  return { name, aspect: +(info.width / info.height).toFixed(3) };
}

await fs.mkdir(OUT, { recursive: true });
await fs.mkdir(LOGOS, { recursive: true });

const index = {};
for (const [name, [file, widths]] of Object.entries(IMAGES)) {
  const r = await variants(name, path.join(SRC, file), widths);
  index[name] = r.sizes;
  console.log(name, r.sizes.map((s) => `${s.w}x${s.h}`).join(" "));
}
for (const [name, [file, widths]] of Object.entries(CUTOUTS)) {
  index[name] = (await variants(name, path.join(SRC, file), widths, { alpha: true })).sizes;
}
for (const [name, [file, widths]] of Object.entries(EXTRACTED_CUTOUTS)) {
  index[name] = (await variants(name, path.join(EXTRACTED, file), widths, { alpha: true })).sizes;
}
const logos = {};
for (const [name, file] of Object.entries(LOGO_SOURCES)) {
  const r = await traceLogo(name, path.join(SRC, file));
  logos[name] = r.aspect;
  console.log("logo", name, r.aspect);
}
await fs.writeFile(path.join(ROOT, "src/_data/images.json"), JSON.stringify(index, null, 1));
await fs.writeFile(path.join(ROOT, "src/_data/logos.json"), JSON.stringify(logos, null, 1));
