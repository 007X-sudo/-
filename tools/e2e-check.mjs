/**
 * 端到端自检：用真实浏览器（Edge/Chrome 无头模式）跑一遍站点，检查
 *   1. 页面有没有 JS 报错、有没有 404 资源；
 *   2. 所有 <img> 是否都带 width/height、是否懒加载、首屏大图是否 eager；
 *   3. 搜索框输入中文短语能否给出结果；
 *   4. 点击、切换板块时标题是否跟着变；
 *   5. 懒加载板块（竞赛地图等）能否直接深链接打开。
 *
 * 用法：
 *   npm run build
 *   python -m http.server 4180          # 另开一个终端
 *   node tools/e2e-check.mjs            # 默认检查 http://localhost:4180/
 *
 * 可用环境变量：URL_BASE（默认 http://localhost:4180/）、BROWSER（浏览器可执行文件路径）
 * 依赖 Node 18+（内置 fetch / WebSocket），不需要 puppeteer。
 */

import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const CANDIDATES = [
  process.env.BROWSER,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
].filter(Boolean);
const BROWSER = CANDIDATES.find(existsSync);
if (!BROWSER) {
  console.error('找不到 Edge/Chrome，可用 BROWSER=路径 node tools/e2e-check.mjs 指定');
  process.exit(1);
}

const PORT = 9333;
const URL_BASE = process.env.URL_BASE || 'http://localhost:4180/';
const profile = mkdtempSync(path.join(tmpdir(), 'e2e-'));
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const child = spawn(BROWSER, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--disable-extensions',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  '--window-size=1440,900', URL_BASE
], { stdio: 'ignore' });

async function findTarget() {
  for (let i = 0; i < 40; i += 1) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = list.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) return page;
    } catch (error) { /* 浏览器还没起来 */ }
    await sleep(300);
  }
  throw new Error('连接不到浏览器调试端口');
}

const page = await findTarget();
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

let seq = 0;
const pending = new Map();
const problems = [];
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  if (msg.method === 'Runtime.exceptionThrown') problems.push('未捕获异常: ' + msg.params.exceptionDetails.text);
  if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') problems.push('控制台错误: ' + msg.params.entry.text + ' @ ' + (msg.params.entry.url || ''));
  if (msg.method === 'Network.responseReceived' && msg.params.response.status >= 400) problems.push('HTTP ' + msg.params.response.status + ' : ' + msg.params.response.url);
};

const send = (method, params = {}) => new Promise(res => { const n = ++seq; pending.set(n, res); ws.send(JSON.stringify({ id: n, method, params })); });

async function evaluate(expression) {
  const res = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (res.result?.exceptionDetails) throw new Error(JSON.stringify(res.result.exceptionDetails));
  return res.result?.result?.value;
}

await send('Runtime.enable');
await send('Log.enable');
await send('Network.enable');
await sleep(2500); // 等首屏渲染 + 后台预取

const report = {
  标题: await evaluate('document.title'),
  图片总数: await evaluate('document.querySelectorAll("img").length'),
  缺少宽高的图片: await evaluate('[...document.querySelectorAll("img")].filter(i => !i.getAttribute("width") || !i.getAttribute("height")).map(i => i.getAttribute("src"))'),
  懒加载图片数: await evaluate('document.querySelectorAll(\'img[loading="lazy"]\').length'),
  首屏立即加载的图片: await evaluate('[...document.querySelectorAll(\'img[loading="eager"]\')].map(i => i.getAttribute("src"))'),
  加载失败的图片: await evaluate('[...document.querySelectorAll("img")].filter(i => i.complete && i.naturalWidth === 0).map(i => i.getAttribute("src"))'),
  搜索框标签名: await evaluate('document.querySelector(".search-box").tagName')
};

// 搜索交互
await evaluate('(() => { const b = document.querySelector("#globalSearch"); b.value = "宿舍床品多大"; b.dispatchEvent(new Event("input", { bubbles: true })); })()');
await sleep(600);
report.搜索面板展开 = await evaluate('document.querySelector("#searchResults").classList.contains("open")');
report.搜索结果 = await evaluate('[...document.querySelectorAll("#searchResults .search-result strong")].map(s => s.textContent.replace(/\\s+/g, " ").trim())');

// 点击第一条结果
await evaluate('document.querySelector("#searchResults .search-result").click()');
await sleep(900);
report.点击后路由 = await evaluate('location.hash');
report.点击后标题 = await evaluate('document.title');

// 懒加载板块
await evaluate('location.hash = "#compete"');
await sleep(2200);
report.竞赛页标题 = await evaluate('document.title');
report.竞赛条目数 = await evaluate('document.querySelectorAll("#page-compete .competition-card, #page-compete article, #page-compete .card").length');

// 另一个懒加载板块
await evaluate('location.hash = "#antiScam"');
await sleep(1600);
report.防骗页标题 = await evaluate('document.querySelector("#pageTitle").textContent');
report.防骗页文本长度 = await evaluate('document.querySelector("#page-antiScam").textContent.trim().length');

console.log(JSON.stringify(report, null, 1));
console.log('');
console.log(problems.length ? '发现 ' + problems.length + ' 个问题：\n  ' + problems.join('\n  ') : '页面无报错、无 404 ✓');

ws.close();
child.kill();
try { rmSync(profile, { recursive: true, force: true }); } catch (error) { /* ignore */ }
process.exit(problems.length ? 1 : 0);
