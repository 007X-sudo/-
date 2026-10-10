/**
 * 前端构建：压缩 CSS / JS，并给静态资源加上内容哈希，解决"改了代码但用户拿到旧缓存"的问题。
 *
 * 用法：
 *   npm install
 *   npm run build
 *
 * 会产生两个文件：
 *   styles.min.css  ← 由 styles.css 压缩而来
 *   app.min.js      ← 由 app.js 压缩而来
 * 并把 index.html / 404.html 里的引用改写成 styles.min.css?v=<哈希> / app.min.js?v=<哈希>。
 * 内容变了哈希才会变，所以浏览器能长期缓存这些文件，同时在改动后立刻拿到新版本。
 *
 * ⚠️ 改完 styles.css 或 app.js 之后一定要重新跑一次 `npm run build` 再提交，
 *    否则线上用的还是上一次压缩出来的旧文件。
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { transform } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFileSync(path.join(ROOT, file), 'utf8');
const write = (file, data) => writeFileSync(path.join(ROOT, file), data);
const shortHash = (text) => createHash('sha256').update(text).digest('hex').slice(0, 10);
// 用字节数而不是字符数衡量：中文一个字占 3 字节，按字符数算会低估体积。
const bytes = (text) => Buffer.byteLength(text, 'utf8');
const kb = (n) => (n / 1024).toFixed(1) + 'KB';

const TARGETS = [
  { src: 'styles.css', out: 'styles.min.css', loader: 'css', target: 'chrome80' },
  { src: 'app.js', out: 'app.min.js', loader: 'js', target: 'es2020' }
];

const versions = {};

for (const item of TARGETS) {
  const source = read(item.src);
  const result = await transform(source, {
    loader: item.loader,
    minify: true,
    target: item.target,
    charset: 'utf8', // 关键：不转义中文，否则每串中文都会变成 \uXXXX，文件反而变大
    legalComments: 'none'
  });
  const code = result.code.trimEnd() + '\n';
  write(item.out, code);
  versions[item.src] = shortHash(code);
  const before = bytes(source);
  const after = bytes(code);
  console.log(
    `${item.src.padEnd(12)} ${kb(before).padStart(8)}  ->  ${item.out.padEnd(15)} ${kb(after).padStart(8)}` +
    `   省 ${(100 - (after / before) * 100).toFixed(0)}%   v=${versions[item.src]}`
  );
}

// 把 HTML 里的引用改写成带版本号的压缩文件
for (const page of ['index.html', '404.html']) {
  const before = read(page);
  const after = before
    .replace(/(href=")styles(?:\.min)?\.css(?:\?v=[^"]*)?"/g, `$1styles.min.css?v=${versions['styles.css']}"`)
    .replace(/(src=")app(?:\.min)?\.js(?:\?v=[^"]*)?"/g, `$1app.min.js?v=${versions['app.js']}"`);
  if (after !== before) write(page, after);
  console.log(`${page} 引用已更新`);
}

console.log('\n完成。别忘了把 styles.min.css / app.min.js / *.html 一起提交。');
