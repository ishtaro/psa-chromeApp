// PSA 返却予定日ヘルパー用アイコン (16 / 48 / 128 px) を生成する。
// 依存ゼロ (Node 標準の zlib のみ) で PNG を書き出す。
// 実際のストア公開時はデザイナーが用意した PNG に差し替えること。

import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "icons");

// PSA イメージに沿った落ち着いた紺 + 白抜きカレンダーモチーフ。
const BG = [10, 42, 92, 255]; // #0A2A5C
const FG = [255, 255, 255, 255]; // white
const ACCENT = [232, 179, 42, 255]; // #E8B32A アクセント (右下の日付枠)

function fill(pixels, w, h, color) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      pixels[i] = color[0];
      pixels[i + 1] = color[1];
      pixels[i + 2] = color[2];
      pixels[i + 3] = color[3];
    }
  }
}

function rect(pixels, w, h, x0, y0, x1, y1, color, radius = 0) {
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      if (radius > 0) {
        // 4 隅の角丸判定
        const dx = x < x0 + radius ? x0 + radius - x : x >= x1 - radius ? x - (x1 - radius - 1) : 0;
        const dy = y < y0 + radius ? y0 + radius - y : y >= y1 - radius ? y - (y1 - radius - 1) : 0;
        if (dx * dx + dy * dy > radius * radius) continue;
      }
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      const i = (y * w + x) * 4;
      pixels[i] = color[0];
      pixels[i + 1] = color[1];
      pixels[i + 2] = color[2];
      pixels[i + 3] = color[3];
    }
  }
}

// 5x7 ドット文字 (P / S / A のみ)
const FONT = {
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
};

function drawChar(pixels, w, h, ch, x0, y0, scale, color) {
  const glyph = FONT[ch];
  if (!glyph) return;
  for (let ry = 0; ry < 7; ry++) {
    for (let rx = 0; rx < 5; rx++) {
      if (glyph[ry][rx] !== "1") continue;
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const x = x0 + rx * scale + dx;
          const y = y0 + ry * scale + dy;
          if (x < 0 || y < 0 || x >= w || y >= h) continue;
          const i = (y * w + x) * 4;
          pixels[i] = color[0];
          pixels[i + 1] = color[1];
          pixels[i + 2] = color[2];
          pixels[i + 3] = color[3];
        }
      }
    }
  }
}

function drawText(pixels, w, h, text, x0, y0, scale, color) {
  const gap = scale; // 1 ドット幅の隙間
  let x = x0;
  for (const ch of text) {
    drawChar(pixels, w, h, ch, x, y0, scale, color);
    x += 5 * scale + gap;
  }
}

function drawIcon(size) {
  const pixels = Buffer.alloc(size * size * 4);
  fill(pixels, size, size, [0, 0, 0, 0]); // 透明背景

  // 角丸背景 (紺)
  const pad = Math.max(1, Math.round(size * 0.05));
  const radius = Math.max(1, Math.round(size * 0.18));
  rect(pixels, size, size, pad, pad, size - pad, size - pad, BG, radius);

  // 中央に PSA テキスト
  const scale = Math.max(1, Math.floor(size / 18));
  const textWidth = 5 * scale * 3 + scale * 2; // 3 文字 + 2 gap
  const textHeight = 7 * scale;
  const tx = Math.round((size - textWidth) / 2);
  const ty = Math.round((size - textHeight) / 2) - Math.round(size * 0.06);
  drawText(pixels, size, size, "PSA", tx, ty, scale, FG);

  // 下部にアクセントバー (返却日を示唆する下線)
  const barY = ty + textHeight + Math.max(1, Math.round(size * 0.06));
  const barH = Math.max(1, Math.round(size * 0.06));
  const barX0 = tx;
  const barX1 = tx + textWidth;
  rect(pixels, size, size, barX0, barY, barX1, barY + barH, ACCENT);

  return pixels;
}

// --- PNG エンコード ---

function crc32(buf) {
  let c;
  const table = crc32.table || (crc32.table = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })());
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePng(width, height, pixels) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // color type: RGBA
  ihdr[10] = 0;  // compression
  ihdr[11] = 0;  // filter
  ihdr[12] = 0;  // interlace

  // フィルタバイト (0) + 各行 RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    pixels.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }

  const idat = deflateSync(raw);
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

for (const size of [16, 48, 128]) {
  const pixels = drawIcon(size);
  const png = encodePng(size, size, pixels);
  const path = join(OUT_DIR, `icon-${size}.png`);
  writeFileSync(path, png);
  console.log(`wrote ${path} (${png.length} bytes)`);
}
