// 景品画像を、景品一覧に出すのにちょうどいい大きさ・容量にして public/prizes/ に書き出す
//
// 使い方(stamp_rally_front で実行)
//   1. 元の写真を prize_originals/ に置く(このフォルダは .gitignore 済みで、公開もコミットもされない)
//   2. npm run compress-images
//   3. 表示されたパス(/prizes/○○.webp)を src/redesign/prizeData.js の image に書く
//
// やること
//   - 長い辺を 600px までに縮める(カードの幅は 170px ほどなので、高解像度の画面でもこれで足りる。小さい画像は大きくしない)
//   - WebP(品質 80)で保存する。1 枚 100KB 以下が目安で、超えたものは最後に知らせる
//   - 撮影日時・位置情報などの Exif は書き出さない(sharp は何も指定しなければ付けない。スマホの縦横の向きは先に画像に反映する)
//   - 透明な部分のある画像(PNG など)は、透明なまま残す
//
// 書き出す前に止めるとき(何も書き出さない)
//   - 書き出すと同じ名前になる写真がある(景品.jpg と 景品.png など。Windows では大文字・小文字も同じ名前になる)
//   - URL やコードの中で特別な意味を持つ記号(# ? % ' " ` \)が名前に入っている(パスとして使えないため。日本語はそのまま使える)
// 読めない写真は飛ばしてほかを書き出し、最後にまとめて知らせる
// 書き出し先にある、今回の写真から作ったのではない画像(元の写真を消した・名前を変えたときの古い画像など)は、消さずに知らせる
//
// ほかのフォルダにも使える: npm run compress-images -- <元のフォルダ> <書き出し先>
import { mkdir, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const MAX_SIDE = 600;
const QUALITY = 80;
const WARN_BYTES = 100 * 1024;
const EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.tif', '.tiff']);
const UNSAFE_CHARS = /[#?%'"`\\]/;

const frontDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = path.resolve(process.argv[2] ?? path.join(frontDir, 'prize_originals'));
const destDir = path.resolve(process.argv[3] ?? path.join(frontDir, 'public', 'prizes'));

const kb = (bytes) => `${Math.round(bytes / 1024).toLocaleString()}KB`;
const isImage = (name) => EXTENSIONS.has(path.extname(name).toLowerCase());
const webpName = (name) => `${path.parse(name).name}.webp`;

let names;
try {
  names = await readdir(srcDir);
} catch {
  console.error(`元の画像のフォルダがありません: ${srcDir}`);
  process.exit(1);
}
const files = names.filter(isImage).sort();
if (files.length === 0) {
  console.error(`画像がありません: ${srcDir}`);
  process.exit(1);
}

// 書き出す前に、名前の問題をまとめて調べる
const problems = [];
const byDest = new Map(); // 書き出す名前(小文字) → 元の写真の名前
for (const name of files) {
  if (UNSAFE_CHARS.test(name)) problems.push(`記号(# ? % ' " \` \\)を含むので名前を変えてください: ${name}`);
  const key = webpName(name).toLowerCase();
  byDest.set(key, [...(byDest.get(key) ?? []), name]);
}
for (const [key, srcs] of byDest) {
  if (srcs.length > 1) problems.push(`書き出すと同じ ${key} になるので、どれかの名前を変えてください: ${srcs.join(', ')}`);
}
if (problems.length > 0) {
  console.error(`何も書き出さずに止めました\n${problems.map((p) => `  - ${p}`).join('\n')}`);
  process.exit(1);
}

await mkdir(destDir, { recursive: true });

const tooBig = [];
const failed = [];
let total = 0;
for (const name of files) {
  const src = path.join(srcDir, name);
  const destName = webpName(name);
  try {
    const info = await sharp(src)
      .rotate() // Exif の向きを画像に反映する(Exif 自体は書き出さない)
      .resize(MAX_SIDE, MAX_SIDE, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: QUALITY, effort: 6 })
      .toFile(path.join(destDir, destName));
    const before = (await stat(src)).size;
    total += info.size;
    console.log(`${name}: ${kb(before)} → ${kb(info.size)} (${info.width}x${info.height})  image: '/prizes/${destName}'`);
    if (info.size > WARN_BYTES) tooBig.push(destName);
  } catch (err) {
    failed.push(`${name}(${err.message})`);
  }
}

console.log(`\n${files.length - failed.length} 枚・合計 ${kb(total)} を ${destDir} に書き出しました`);
if (tooBig.length > 0) {
  console.log(`100KB を超えたもの(細かい模様の写真など。気になれば QUALITY を下げる): ${tooBig.join(', ')}`);
}
const others = (await readdir(destDir)).filter((n) => isImage(n) && !byDest.has(n.toLowerCase()));
if (others.length > 0) {
  console.log(`今回の写真から作ったのではない画像(公開されたままになるので、使わないなら消してください): ${others.join(', ')}`);
}
if (failed.length > 0) {
  console.error(`読めなかったので飛ばしたもの: ${failed.join(', ')}`);
  process.exit(1);
}
