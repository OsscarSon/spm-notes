// 发布前自检：所有 js 语法、index.html 引用的脚本都存在、sw.js 预缓存清单和 js/ 目录一致、图标都在。
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
let bad = 0; const fail = m => { console.error('✗ ' + m); bad++; };
const files = [...readdirSync('js').map(f => 'js/' + f), ...readdirSync('api').map(f => 'api/' + f), 'sw.js'].filter(f => f.endsWith('.js'));
for (const f of files) { try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); } catch (e) { fail('语法错误：' + f + '\n' + String(e.stderr).split('\n').slice(0, 4).join('\n')); } }
const html = readFileSync('index.html', 'utf8');
const refs = [...html.matchAll(/<script[^>]+src="(js\/[^"]+)"/g)].map(m => m[1]);
for (const r of refs) if (!existsSync(r)) fail('index.html 引用了不存在的文件：' + r);
const sw = readFileSync('sw.js', 'utf8');
for (const r of refs) { const n = r.replace('js/', '').replace('.js', ''); if (!sw.includes("'" + n + "'")) fail('sw.js 预缓存清单缺少：' + r); }
for (const i of ['icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png', 'manifest.json']) if (!existsSync(i)) fail('缺少 ' + i);
// 样式表也必须在 sw.js 预缓存里
for (const m of html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="(css\/[^"]+)"/g)) { if (!existsSync(m[1])) fail('index.html 引用了不存在的样式：' + m[1]); else if (!sw.includes("'" + m[1] + "'")) fail('sw.js 预缓存清单缺少：' + m[1]); }
// Goals（Phase 1）边界：只能读写 goals-* 键，唯一允许读取的旧键是 mochi-st；不得碰云同步 / Undo / 日历写入；三种语言键必须一致
if (existsSync('js/goals.js')) {
  const g = readFileSync('js/goals.js', 'utf8');
  for (const m of g.matchAll(/['"`](mochi-[A-Za-z0-9:_-]*)/g)) if (m[1] !== 'mochi-st' && m[1] !== 'mochi-goals') fail('goals.js 访问了不允许的旧键：' + m[1]);
  for (const w of ['Undo.', 'cloud.', 'put2(', 'saveWeek', 'data.push', 'WK[', 'fxSave', 'rpSave', 'hwSave', 'sync.js']) if (g.includes(w)) fail('goals.js 不应使用：' + w);
  const ks = (l) => { const sandbox = { window: {} }; new Function('window', readFileSync('js/lang-goals.js', 'utf8'))(sandbox.window); return Object.keys(sandbox.window.GOALS_I18N[l]).sort().join(','); };
  const en = ks('en'); for (const l of ['zh', 'ms']) if (ks(l) !== en) fail('lang-goals.js：' + l + ' 与 en 的键不一致');
  for (const m of g.matchAll(/\bt\('([A-Za-z_0-9]+)'/g)) if (!m[1].endsWith('_') && !en.split(',').includes(m[1])) fail('goals.js 用了没有翻译的键：' + m[1]);
}
// Goals（Phase 2）边界：goals-plan.js 是目标唯一的“日程写入口”，但只能：读 Sched、写 WK（经 saveWeek）、走 Undo、写 goals-links；
// 不得碰云同步 / 日历插件 / 固定课程 / 重复活动 / 作业 / Study 排程，也不能出现 mochi-* 键字面量；文案键三语一致。
if (existsSync('js/goals-plan.js')) {
  const p = readFileSync('js/goals-plan.js', 'utf8');
  for (const m of p.matchAll(/['"`](mochi-[A-Za-z0-9:_-]*)/g)) fail('goals-plan.js 不应出现旧键字面量：' + m[1]);
  for (const w of ['cloud.', 'put2(', 'fxSave', 'rpSave', 'hwSave', 'K_FX', 'K_RP', 'K_HW', 'syscal', 'CapacitorCalendar', 'sync.js', 'FX.', 'RP.', 'HW.', 'ST.topics']) if (p.includes(w)) fail('goals-plan.js 不应使用：' + w);
  if (!p.includes('Undo.snap()') || !p.includes('Undo.toast(')) fail('goals-plan.js 写入日程前必须走 Undo.snap() / Undo.toast()');
  const sandbox = {}; new Function('window', readFileSync('js/lang-goals.js', 'utf8'))(sandbox);
  const L = sandbox.GOALS_I18N.en;
  for (const m of p.matchAll(/\bt\('([A-Za-z_0-9]+)'/g)) if (!m[1].endsWith('_') && !(m[1] in L)) fail('goals-plan.js 用了没有翻译的键：' + m[1]);
  for (const m of p.matchAll(/'((?:plan|opt|sug|stat|reason|note|step|exist|err|basis|pace)[A-Za-z_]+)'/g)) if (!m[1].endsWith('_') && !(m[1] in L) && !/^(planBtn|planDone)$/.test(m[1])) fail('goals-plan.js 里的字符串像翻译键但词典里没有：' + m[1]);
}

// 本机 OCR（Tesseract.js）边界：ocr.js 只做“图片 → 候选课程”，不碰任何存储 / 云端 / 日程；库固定版本、只从 jsDelivr 按需加载；写入全在 ai.js（核对后才写）。
if (existsSync('js/ocr.js')) {
  const o = readFileSync('js/ocr.js', 'utf8');
  for (const w of ['localStorage', 'cloud.', 'fetch(', 'XMLHttpRequest', 'sendBeacon', 'FX.', 'fxSave', 'saveWeek', 'Undo.', 'WK[']) if (o.includes(w)) fail('ocr.js 不应使用：' + w);
  if (!/cdn\.jsdelivr\.net\/npm\/tesseract\.js@\d+\.\d+\.\d+\//.test(o)) fail('ocr.js 里的 Tesseract.js 必须固定到具体版本（@x.y.z）');
  if (/tesseract\.js@(latest|\^|~)/.test(o)) fail('ocr.js 不能用 latest / 范围版本');
  if ((o.match(/https?:\/\//g) || []).filter(u => !/jsdelivr\.net/.test(u)).length > 0 && /https?:\/\/(?!cdn\.jsdelivr\.net)[a-z]/.test(o.replace(/\/\/.*$/gm, ''))) fail('ocr.js 里出现了 jsDelivr 以外的网址');
}

// Goals 同步边界（v9.5/9.6）：只有目标本体 goals-g:* 和排程关联表 goals-links 能进云同步；设备 id / 偏好都必须留在本机
{
  const sy = readFileSync('js/sync.js', 'utf8') + readFileSync('js/hook.js', 'utf8');
  for (const k of ['goals-meta', 'goals-prefs', 'goals-plan-prefs']) if (sy.includes(k)) fail('sync.js / hook.js 不应出现本机专用的键：' + k);
  if (!sy.includes("'goals-g:'")) fail('sync.js / hook.js 里找不到目标本体 goals-g: 的同步规则');
  if (!sy.includes("'goals-links'") || !sy.includes('mergeLinks')) fail('sync.js 里找不到 goals-links 的同步 / 合并规则（关联表必须按条合并，不能整块覆盖）');
}

// Study Space（v9.7）边界：core 是纯函数（不碰 DOM / 存储 / 写入）；界面层只能通过现有函数写数据，自己只用 studyspace-prefs 一个键；不碰云同步 / Undo / 课表 / Goals 写入；三种语言的键一致
if (existsSync('js/study-space-core.js') && existsSync('js/study-space.js')) {
  const c = readFileSync('js/study-space-core.js', 'utf8'), u = readFileSync('js/study-space.js', 'utf8');
  for (const w of ['document', 'localStorage', 'sessionStorage', 'sv(', 'hwSave', 'srsRate', 'put2(', 'cloud', 'Undo', 'fetch(']) if (c.includes(w)) fail('study-space-core.js 必须是纯函数，不应使用：' + w);
  for (const m of u.matchAll(/['"`](mochi-[A-Za-z0-9:_-]*|goals-[A-Za-z0-9:_-]*)/g)) fail('study-space.js 不应出现数据键字面量：' + m[1]);
  for (const m of u.matchAll(/localStorage\.(?:get|set|remove)Item\(\s*([^),]+)/g)) if (m[1].trim() !== 'PK') fail('study-space.js 只允许用 studyspace-prefs（常量 PK）读写本机存储：' + m[1]);
  if (!/var PK = 'studyspace-prefs'/.test(u)) fail("study-space.js 的偏好键必须是 'studyspace-prefs'（非 mochi-* 键，不参与云同步）");
  for (const w of ['cloud.', 'put2(', 'saveWeek', 'fxSave', 'rpSave', 'Undo.', 'syscal', 'CapacitorCalendar', 'saveGoal', 'deleteGoal', 'GoalsPlan.commit', 'clearUpcoming', 'followMoved', 'data.push', 'localStorage.clear']) if (u.includes(w)) fail('study-space.js 不应使用：' + w);
  const sb = { window: {} }; new Function('window', readFileSync('js/lang-study-space.js', 'utf8'))(sb.window);
  const D = sb.window.SS_I18N, ks = l => Object.keys(D[l]).sort().join(',');
  for (const l of ['zh', 'ms']) if (ks(l) !== ks('en')) fail('lang-study-space.js：' + l + ' 与 en 的键不一致');
  const used = new Set([...u.matchAll(/\bt\('([A-Za-z0-9_]+)'/g)].map(m => m[1]));
  for (const m of u.matchAll(/\btp\('([A-Za-z0-9_]+)'/g)) { used.add(m[1] + '1'); used.add(m[1] + 'N'); }
  for (const m of u.matchAll(/'(g(?:Active|Draft|Paused|Done)|rate(?:Forgot|Fuzzy|Good))'/g)) used.add(m[1]);
  for (const k of used) if (!(k in D.en)) fail('study-space.js 用了没有翻译的键：' + k);
  for (const l of ['en', 'zh', 'ms']) for (const k of Object.keys(D[l])) if (!D[l][k]) fail('lang-study-space.js：' + l + '.' + k + ' 是空的');
  const css = readFileSync('css/study-space.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of css.matchAll(/(?:^|\})\s*([^{}@]+)\{/g)) for (const sel of m[1].split(',')) { const x = sel.trim(); if (x && !/^(#v-ss|\.study-space-)/.test(x) && !/^\d+%$/.test(x)) fail('study-space.css 里有没加命名空间的选择器：' + x); }
}
// Work / Life Space（v9.8.8）：聚合层必须是纯函数；界面层不许建自己的数据、不许直接读写本机存储；三语键一致；CSS 全部带命名空间
if (existsSync('js/spaces-core.js') && existsSync('js/spaces.js')) {
  const c = readFileSync('js/spaces-core.js', 'utf8'), u = readFileSync('js/spaces.js', 'utf8');
  for (const w of ['document', 'localStorage', 'sessionStorage', 'put2(', 'cloud', 'Undo', 'fetch(']) if (c.includes(w)) fail('spaces-core.js 必须是纯函数，不应使用：' + w);
  for (const m of u.matchAll(/['"`](mochi-[A-Za-z0-9:_-]*|goals-[A-Za-z0-9:_-]*)/g)) fail('spaces.js 不应出现数据键字面量：' + m[1]);
  for (const w of ['localStorage', 'sessionStorage', 'cloud.', 'put2(', 'saveWeek', 'fxSave', 'rpSave', 'Undo.', 'syscal', 'saveGoal', 'deleteGoal', 'GoalsPlan.commit', 'data.push', 'fetch(']) if (u.includes(w)) fail('spaces.js 不应使用：' + w);
  const sb = { window: {} }; new Function('window', readFileSync('js/lang-spaces.js', 'utf8'))(sb.window);
  const D = sb.window.SPACES_I18N, ks = l => Object.keys(D[l]).sort().join(',');
  for (const l of ['zh', 'ms']) if (ks(l) !== ks('en')) fail('lang-spaces.js：' + l + ' 与 en 的键不一致');
  for (const m of u.matchAll(/\bt\('([A-Za-z0-9_]+)'/g)) if (!(m[1] in D.en)) fail('spaces.js 用了没有翻译的键：' + m[1]);
  for (const l of ['en', 'zh', 'ms']) for (const k of Object.keys(D[l])) if (!D[l][k]) fail('lang-spaces.js：' + l + '.' + k + ' 是空的');
  const css = readFileSync('css/spaces.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of css.matchAll(/(?:^|\})\s*([^{}@]+)\{/g)) for (const sel of m[1].split(',')) { const x = sel.trim(); if (x && !/^(#v-wk|#v-lf|\.spc-)/.test(x)) fail('spaces.css 里有没加命名空间的选择器：' + x); }
}
// Health Space（v9.9.1）：聚合层必须是纯函数；界面层不许有自己的数据键 / 本机存储，写入只走现有函数（btSave / diSave / ssv / addSp / 课表勾选 DN）；不碰云同步 / Undo / 课表结构 / Goals；三语键一致；CSS 全部带命名空间
if (existsSync('js/health-space-core.js') && existsSync('js/health-space.js')) {
  const c = readFileSync('js/health-space-core.js', 'utf8'), u = readFileSync('js/health-space.js', 'utf8');
  for (const w of ['document', 'localStorage', 'sessionStorage', 'put2(', 'cloud', 'Undo', 'fetch(']) if (c.includes(w)) fail('health-space-core.js 必须是纯函数，不应使用：' + w);
  for (const m of u.matchAll(/['"`](mochi-[A-Za-z0-9:_-]*|goals-[A-Za-z0-9:_-]*)/g)) fail('health-space.js 不应出现数据键字面量：' + m[1]);
  for (const w of ['localStorage', 'sessionStorage', 'cloud.', 'saveWeek', 'fxSave', 'rpSave', 'Undo.', 'syscal', 'CapacitorCalendar', 'saveGoal', 'deleteGoal', 'GoalsPlan.commit', 'data.push', 'WK[thisW].push']) if (u.includes(w)) fail('health-space.js 不应使用：' + w);
  for (const m of u.matchAll(/\bput2\(\s*([^),]+)/g)) if (m[1].trim() !== 'K_DN') fail('health-space.js 只允许用 put2(K_DN, DN) 写课表勾选（其余写入必须走 btSave / diSave / ssv）：put2(' + m[1] + ')');
  for (const m of u.matchAll(/fetch\(\s*'([^']+)/g)) if (!/^https:\/\/world\.openfoodfacts\.org\/cgi\/search\.pl\?/.test(m[1])) fail('health-space.js 只允许请求 Open Food Facts：' + m[1]);
  const sb = { window: {} }; new Function('window', readFileSync('js/lang-health-space.js', 'utf8'))(sb.window);
  const D = sb.window.HS_I18N, ks = l => Object.keys(D[l]).sort().join(',');
  for (const l of ['zh', 'ms']) if (ks(l) !== ks('en')) fail('lang-health-space.js：' + l + ' 与 en 的键不一致');
  const used = new Set([...u.matchAll(/\bt\('([A-Za-z0-9_]+)'/g)].map(m => m[1]));
  for (const p of ['ov', 'mv', 'sk', 'fd']) for (const x of ['Title', 'Sub', 'Eyebrow']) used.add(p + x);
  for (const m of u.matchAll(/'(tab(?:Dash|Move|Skin|Food)|m(?:Breakfast|Lunch|Dinner|Snack)|stepsLeft[1N]|upSkin(?:Am|Pm))'/g)) used.add(m[1]);
  for (const k of used) if (!(k in D.en)) fail('health-space.js 用了没有翻译的键：' + k);
  for (const l of ['en', 'zh', 'ms']) for (const k of Object.keys(D[l])) if (!D[l][k]) fail('lang-health-space.js：' + l + '.' + k + ' 是空的');
  const css = readFileSync('css/health-space.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of css.matchAll(/(?:^|\})\s*([^{}@]+)\{/g)) for (const sel of m[1].split(',')) { const x = sel.trim(); if (x && !/^(#v-hs|\.health-space-)/.test(x)) fail('health-space.css 里有没加命名空间的选择器：' + x); }
}
// 版本号：js/version.js、package.json、sw.js 的缓存名必须一致；菜单等地方不许再写死版本号
{
  const pv = JSON.parse(readFileSync('package.json', 'utf8')).version;
  const vj = (/MOCHI_VERSION\s*=\s*['"]([^'"]+)['"]/.exec(readFileSync('js/version.js', 'utf8')) || [])[1];
  const sv = (/const VER = 'mochi-v([0-9-]+)'/.exec(sw) || [])[1];
  if (vj !== pv) fail('js/version.js 的版本（' + vj + '）和 package.json（' + pv + '）不一致');
  if (sv !== pv.replace(/\./g, '-')) fail('sw.js 的缓存名（mochi-v' + sv + '）和 package.json（' + pv + '）不一致');
  for (const f of readdirSync('js')) if (f !== 'version.js' && f.endsWith('.js') && /Mochi Schedule · v\d|MOCHI_VERSION\s*=/.test(readFileSync('js/' + f, 'utf8'))) fail(f + ' 里写死了版本号，请读 window.MOCHI_VERSION');
}
if (/style="/.test(html)) fail('index.html 里还有内联 style');
console.log(bad ? `\n${bad} 个问题` : `✓ 通过（检查了 ${files.length} 个脚本、${refs.length} 个页面引用）`);
process.exit(bad ? 1 : 0);
