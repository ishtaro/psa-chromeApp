// Chrome Web Store 提出用 zip を生成する。
// 依存ゼロ実装 (Node 標準の zlib / fs) で、開発用ファイルを除外する。
// 出力: dist/psa-return-eta-vX.Y.Z.zip

import { readFileSync, writeFileSync, statSync, readdirSync, mkdirSync } from "node:fs";
import { deflateRawSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, sep } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");

const manifest = JSON.parse(readFileSync(join(ROOT, "manifest.json"), "utf8"));
const version = manifest.version;

// 拡張の実行に必要な最小限のみを含める。
const INCLUDE = [
  "manifest.json",
  "icons",
  "src",
];

// フォルダ配下に紛れ込むゴミを除外。
const EXCLUDE = [
  /\.DS_Store$/i,
  /Thumbs\.db$/i,
  /\.map$/i,
  /~$/,
];

function walk(root, cb) {
  const stack = [root];
  while (stack.length) {
    const cur = stack.pop();
    const st = statSync(cur);
    if (st.isDirectory()) {
      for (const name of readdirSync(cur)) stack.push(join(cur, name));
    } else if (st.isFile()) {
      cb(cur);
    }
  }
}

function shouldSkip(rel) {
  return EXCLUDE.some((re) => re.test(rel));
}

function collect() {
  const files = [];
  for (const entry of INCLUDE) {
    const p = join(ROOT, entry);
    const st = statSync(p);
    if (st.isFile()) {
      files.push(p);
    } else {
      walk(p, (f) => {
        const rel = relative(ROOT, f);
        if (!shouldSkip(rel)) files.push(f);
      });
    }
  }
  return files;
}

// --- 純粋な Node で ZIP を書き出す (deflate + local file + central directory) ---

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function dosTime(date) {
  const t =
    ((date.getHours() & 0x1f) << 11) |
    ((date.getMinutes() & 0x3f) << 5) |
    ((Math.floor(date.getSeconds() / 2)) & 0x1f);
  const d =
    (((date.getFullYear() - 1980) & 0x7f) << 9) |
    (((date.getMonth() + 1) & 0x0f) << 5) |
    (date.getDate() & 0x1f);
  return { t, d };
}

function buildZip(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const now = new Date();
  const { t, d } = dosTime(now);

  for (const { name, data } of entries) {
    const nameBuf = Buffer.from(name.split(sep).join("/"), "utf8");
    const compressed = deflateRawSync(data, { level: 9 });
    const crc = crc32(data);

    const lfh = Buffer.alloc(30);
    lfh.writeUInt32LE(0x04034b50, 0);
    lfh.writeUInt16LE(20, 4);          // version needed
    lfh.writeUInt16LE(0x0800, 6);      // general purpose (UTF-8)
    lfh.writeUInt16LE(8, 8);           // compression method: deflate
    lfh.writeUInt16LE(t, 10);
    lfh.writeUInt16LE(d, 12);
    lfh.writeUInt32LE(crc, 14);
    lfh.writeUInt32LE(compressed.length, 18);
    lfh.writeUInt32LE(data.length, 22);
    lfh.writeUInt16LE(nameBuf.length, 26);
    lfh.writeUInt16LE(0, 28);          // extra length

    localParts.push(lfh, nameBuf, compressed);

    const cdh = Buffer.alloc(46);
    cdh.writeUInt32LE(0x02014b50, 0);
    cdh.writeUInt16LE(20, 4);          // version made by
    cdh.writeUInt16LE(20, 6);          // version needed
    cdh.writeUInt16LE(0x0800, 8);
    cdh.writeUInt16LE(8, 10);
    cdh.writeUInt16LE(t, 12);
    cdh.writeUInt16LE(d, 14);
    cdh.writeUInt32LE(crc, 16);
    cdh.writeUInt32LE(compressed.length, 20);
    cdh.writeUInt32LE(data.length, 24);
    cdh.writeUInt16LE(nameBuf.length, 28);
    cdh.writeUInt16LE(0, 30);
    cdh.writeUInt16LE(0, 32);
    cdh.writeUInt16LE(0, 34);
    cdh.writeUInt16LE(0, 36);
    cdh.writeUInt32LE(0, 38);          // external attrs
    cdh.writeUInt32LE(offset, 42);

    centralParts.push(cdh, nameBuf);
    offset += lfh.length + nameBuf.length + compressed.length;
  }

  const local = Buffer.concat(localParts);
  const central = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(central.length, 12);
  eocd.writeUInt32LE(local.length, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([local, central, eocd]);
}

const files = collect();
const entries = files
  .map((f) => ({ name: relative(ROOT, f), data: readFileSync(f) }))
  .sort((a, b) => a.name.localeCompare(b.name));

mkdirSync(DIST, { recursive: true });
const outPath = join(DIST, `psa-return-eta-v${version}.zip`);
writeFileSync(outPath, buildZip(entries));
console.log(`wrote ${relative(ROOT, outPath)} (${entries.length} files)`);
for (const e of entries) console.log(`  ${e.name}`);
