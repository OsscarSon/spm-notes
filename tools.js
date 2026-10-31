/* tools.js — 问答页的「AI 工具卡片」和「思考轨迹」
 * 原理：AI 在回答里写 ```solve / ```quiz / ```cards / ```timer / ```mermaid / ```go 代码块，
 * 程序在本地把它们变成可以操作的卡片 (和原来的 ```plot / ```calc / ```svg / ```image 是同一套机制)。
 * 所有卡片都在浏览器本地运行，不额外消耗 AI 额度。
 * 依赖 index.html 里已有的全局：S、save、toast、go、compileFn、parseJSON (都做了保护，缺了也不会报错)。
 * 想加新工具：在下面 REG 里多登记一项 { label, rule, render(body) } 就行，别忘了把名字加进 index.html 的 md() 正则。 */
(function () {
  'use strict';
  if (window.Tools) return;

  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const H = s => { s = String(s); let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
  const say = t => { try { if (typeof toast === 'function') toast(t); } catch (e) {} };
  const num = v => { if (Math.abs(v) < 1e-9) v = 0; return String(+v.toPrecision(4)).replace('-', '−'); };

  /* ---------- 样式 ---------- */
  const st = document.createElement('style');
  st.textContent = `
.tl-card{box-sizing:border-box;max-width:100%;overflow-wrap:anywhere;border:1px solid var(--line,#d3dbe8);border-radius:10px;padding:10px 12px;margin:8px 0;background:var(--sheet2,#f1f4fb);font-size:14px;line-height:1.55}
.tl-card .tl-h{font-weight:700;margin-bottom:6px}
.tl-card .tl-h small{font-weight:400;color:var(--muted,#5d6b7c);margin-left:6px}
.tl-row{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.tl-btn{border:1px solid var(--line,#d3dbe8);background:var(--sheet,#fff);color:var(--ink,#17263f);border-radius:8px;padding:6px 11px;font:inherit;font-size:13px;cursor:pointer}
.tl-btn:active{transform:scale(.97)}
.tl-btn.pri{background:var(--accent,#17263f);color:var(--accent-ink,#fff);border-color:var(--accent,#17263f)}
.tl-btn[disabled]{opacity:.55;cursor:default}
.tl-opt{display:block;width:100%;text-align:left;margin:4px 0}
.tl-opt.ok{background:var(--ok-soft,#d9f0e4);border-color:var(--ok,#1b7f55)}
.tl-opt.bad{background:var(--bad-soft,#fadcd9);border-color:var(--bad,#c23b32)}
.tl-why{margin:4px 0 8px;padding:6px 8px;border-radius:8px;background:var(--sheet,#fff);font-size:13px}
.tl-time{font-size:34px;font-weight:700;letter-spacing:1px;font-variant-numeric:tabular-nums}
.tl-bar{height:6px;border-radius:3px;background:var(--line,#d3dbe8);overflow:hidden;margin:6px 0 8px}
.tl-bar i{display:block;height:100%;width:0;background:var(--blue,#2f55d4);transition:width .4s}
.tl-trace{margin:0 0 6px;font-size:12px;color:var(--muted,#5d6b7c)}
.tl-trace summary{cursor:pointer;list-style:none;display:inline-block;padding:2px 8px;border-radius:999px;border:1px solid var(--line,#d3dbe8)}
.tl-trace summary::-webkit-details-marker{display:none}
.tl-trace ol{margin:6px 0 0;padding:0;list-style:none}
.tl-trace li{display:flex;gap:8px;padding:2px 0}
.tl-trace .at{min-width:44px;opacity:.7;font-variant-numeric:tabular-nums}
.tl-live{white-space:pre-line;margin-top:6px}
.tl-mmbox{overflow-x:auto}.tl-mm svg{max-width:100%;height:auto}
.tl-ok{color:var(--ok,#1b7f55)} .tl-bad{color:var(--bad,#c23b32)}
`;
  document.head.appendChild(st);

  const card = (kind, id, title, sub, inner, cls) =>
    `<div class="tl-card tl-${kind} ${cls || ''}" data-id="${id}"><div class="tl-h">${title}${sub ? `<small>${sub}</small>` : ''}</div>${inner}</div>`;
  const parseArr = body => {
    let v;
    try { v = typeof parseJSON === 'function' ? parseJSON(body, '[', 1) : JSON.parse(body.slice(body.indexOf('['), body.lastIndexOf(']') + 1)); } catch (e) { v = null; }
    if (!Array.isArray(v)) { try { const o = typeof parseJSON === 'function' ? parseJSON(body, '{') : JSON.parse(body); v = o && typeof o === 'object' ? [o] : null; } catch (e) { v = null; } }
    return Array.isArray(v) ? v : null;
  };
  const failCard = (kind, msg) => `<div class="tl-card tl-${kind} fine muted">${E(msg)}</div>`;

  /* ---------- 工具：解方程 (本地数值 + 二次方程判别式) ---------- */
  function solveOne(raw, lo, hi) {
    const e = raw.replace(/[−–]/g, '-').replace(/×/g, '*').replace(/÷/g, '/').replace(/²/g, '^2').replace(/³/g, '^3');
    const p = e.split('=');
    if (p.length > 2 || typeof compileFn !== 'function') return null;
    const fl = compileFn(p[0]), fr = compileFn(p[1] == null ? '0' : p[1] || '0');
    if (!fl || !fr) return null;
    const f = x => fl(x) - fr(x);
    let r;
    try { r = { f0: f(0), f1: f(1), fm: f(-1), f2: f(2), f3: f(-3) }; } catch (x) { return null; }
    const a = (r.f1 + r.fm - 2 * r.f0) / 2, b = (r.f1 - r.fm) / 2, c = r.f0;
    const isQ = Math.abs(a) > 1e-9 && [r.f1, r.fm, r.f0, r.f2, r.f3].every(Number.isFinite) &&
      Math.abs(r.f2 - (4 * a + 2 * b + c)) < 1e-7 * (1 + Math.abs(r.f2)) && Math.abs(r.f3 - (9 * a - 3 * b + c)) < 1e-7 * (1 + Math.abs(r.f3));
    if (isQ) {
      const D = b * b - 4 * a * c;
      const roots = D > 1e-12 ? [(-b - Math.sqrt(D)) / (2 * a), (-b + Math.sqrt(D)) / (2 * a)].sort((x, y) => x - y) : Math.abs(D) <= 1e-12 ? [-b / (2 * a)] : [];
      return { eq: raw, q: { a, b, c, D }, roots };
    }
    const roots = [], N = 6000;
    let px = lo, py; try { py = f(px); } catch (x) { py = NaN; }
    for (let i = 1; i <= N; i++) {
      const x = lo + (hi - lo) * i / N; let y; try { y = f(x); } catch (z) { y = NaN; }
      if (Number.isFinite(py) && Number.isFinite(y)) {
        if (py === 0) roots.push(px);
        else if (py * y < 0 && Math.abs(py) < 1e6 && Math.abs(y) < 1e6) {
          let u = px, v = x, fu = py;
          for (let k = 0; k < 60; k++) { const m = (u + v) / 2, fm = f(m); if (fu * fm <= 0) v = m; else { u = m; fu = fm; } }
          roots.push((u + v) / 2);
        }
      }
      px = x; py = y;
    }
    const out = []; roots.forEach(v => { if (!out.some(w => Math.abs(w - v) < 1e-6)) out.push(v); });
    return { eq: raw, roots: out.slice(0, 8), range: [lo, hi] };
  }
  function renderSolve(body, id) {
    let lo = -50, hi = 50; const eqs = [];
    String(body).split(/\r?\n/).map(s => s.replace(/#.*$/, '').trim()).filter(Boolean).forEach(ln => {
      const m = ln.match(/^x\s*[:=]\s*(-?[\d.]+)\s*(?:\.\.|to|~|,)\s*(-?[\d.]+)$/i);
      if (m && +m[1] < +m[2]) { lo = +m[1]; hi = +m[2]; } else eqs.push(ln);
    });
    const rows = eqs.slice(0, 4).map(e => { try { return solveOne(e, lo, hi); } catch (x) { return null; } });
    if (!rows.some(Boolean)) return failCard('solve', '（这个方程程序看不懂，没法自动求解）');
    const html = rows.map((r, i) => {
      if (!r) return `<div class="fine muted"><code>${E(eqs[i])}</code>：程序看不懂这个方程</div>`;
      let t = `<div><code>${E(r.eq)}</code></div>`;
      if (r.q) {
        const q = r.q;
        t += `<div class="fine">a = ${num(q.a)}，b = ${num(q.b)}，c = ${num(q.c)}；判别式 Δ = b² − 4ac = ${num(q.D)} ${q.D > 1e-12 ? '> 0（两个不同的实数根）' : Math.abs(q.D) <= 1e-12 ? '= 0（两个相等的实数根）' : '< 0（没有实数根）'}</div>`;
      }
      t += r.roots.length
        ? `<div><b>${r.roots.map(v => 'x = ' + num(v)).join('　或　')}</b></div>`
        : `<div class="fine muted">${r.q ? '没有实数根。' : `在 ${num(r.range[0])} 到 ${num(r.range[1])} 之间没有找到实数根。`}</div>`;
      return `<div style="margin-bottom:6px">${t}</div>`;
    }).join('');
    return card('solve', id, '🧩 解方程', '程序自己算的，可以和上面的解答对一对', html);
  }

  /* ---------- 工具：专注计时器 (全局保存状态，聊天重新渲染也不会丢) ---------- */
  const TM = {}; let tick = null, actx = null;
  const mmss = s => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  const tmLeft = t => t.run ? Math.max(0, Math.round((t.end - Date.now()) / 1000)) : t.left;
  function beep() {
    try {
      if (!actx) return; if (actx.state === 'suspended') actx.resume();
      [0, 0.28, 0.56].forEach(d => { const o = actx.createOscillator(), g = actx.createGain(); o.frequency.value = 880; g.gain.value = 0.12; o.connect(g); g.connect(actx.destination); o.start(actx.currentTime + d); o.stop(actx.currentTime + d + 0.18); });
    } catch (e) {}
  }
  function tmFinish(t) {
    t.run = false; t.done = true; t.left = 0; beep();
    try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch (e) {}
    say('⏱ ' + t.label + ' 时间到，休息一下吧');
    try { if ('Notification' in window && Notification.permission === 'granted') new Notification('⏱ ' + t.label + ' 时间到', { body: '休息一下吧' }); } catch (e) {}
  }
  function tmPaint() {
    Object.values(TM).forEach(t => { if (t.run && tmLeft(t) <= 0) tmFinish(t); });
    document.querySelectorAll('.tl-timer').forEach(el => {
      const t = TM[el.dataset.id]; if (!t) return;
      const left = tmLeft(t);
      el.querySelector('.tl-time').textContent = mmss(left);
      el.querySelector('.tl-bar i').style.width = (t.total ? (100 * (t.total - left) / t.total) : 0) + '%';
      const b = el.querySelector('[data-a="go"]');
      b.textContent = t.run ? '⏸ 暂停' : t.done ? '🔁 再来一次' : (left < t.total ? '▶ 继续' : '▶ 开始');
    });
    if (!Object.values(TM).some(t => t.run) && tick) { clearInterval(tick); tick = null; }
  }
  function renderTimer(body, id) {
    let min = 25, label = '专注';
    String(body).split(/\r?\n/).forEach(ln => {
      let m;
      if ((m = ln.match(/^\s*(?:minutes?|分钟|时间)\s*[:：=]\s*(\d{1,3})/i))) min = Math.min(180, Math.max(1, +m[1]));
      else if ((m = ln.match(/^\s*(?:label|名称|标题)\s*[:：=]\s*(.+)$/i))) label = m[1].trim().slice(0, 40);
    });
    const t = TM[id] || (TM[id] = { total: min * 60, left: min * 60, end: 0, run: false, done: false, label });
    return card('timer', id, '⏱ ' + E(label), min + ' 分钟',
      `<div class="tl-time">${mmss(tmLeft(t))}</div><div class="tl-bar"><i style="width:${t.total ? (100 * (t.total - tmLeft(t)) / t.total) : 0}%"></i></div>
       <div class="tl-row"><button class="tl-btn pri" data-tl="tm" data-a="go">${t.run ? '⏸ 暂停' : t.done ? '🔁 再来一次' : (tmLeft(t) < t.total ? '▶ 继续' : '▶ 开始')}</button><button class="tl-btn" data-tl="tm" data-a="reset">重置</button></div>
       <div class="fine muted" style="margin-top:6px">小计时器，时间到会响铃提醒；切到别的页面也会继续走。</div>`, 'tl-timer');
  }

  /* ---------- 工具：小测验 ---------- */
  const QD = {}, QZ = {};
  const strip = s => String(s == null ? '' : s).replace(/^\s*[A-Da-d][.)．、:：]\s*/, '');
  function quizInner(id) {
    const items = QD[id], ans = QZ[id] || (QZ[id] = {}); let done = 0, right = 0;
    const html = items.map((q, qi) => {
      const pick = ans[qi], has = pick !== undefined; if (has) { done++; if (pick === q.ans) right++; }
      return `<div style="margin-bottom:8px"><div><b>第 ${qi + 1} 题</b>　${E(q.q)}</div>${q.opts.map((o, oi) =>
        `<button class="tl-btn tl-opt ${has ? (oi === q.ans ? 'ok' : oi === pick ? 'bad' : '') : ''}" data-tl="qz" data-qi="${qi}" data-oi="${oi}" ${has ? 'disabled' : ''}>${'ABCD'[oi]}. ${E(o)}${has && oi === q.ans ? ' ✓' : has && oi === pick ? ' ✗' : ''}</button>`).join('')}
        ${has && q.why ? `<div class="tl-why">💡 ${E(q.why)}</div>` : ''}</div>`;
    }).join('');
    return html + (done === items.length ? `<div class="tl-h">得分：<span class="${right === items.length ? 'tl-ok' : ''}">${right} / ${items.length}</span></div>` : '');
  }
  function renderQuiz(body, id) {
    const arr = parseArr(body);
    const items = (arr || []).slice(0, 5).map(x => {
      if (!x || !x.q || !Array.isArray(x.opts) || x.opts.length < 2) return null;
      let a = x.ans; if (typeof a === 'string') a = /^[A-Da-d]$/.test(a.trim()) ? 'abcd'.indexOf(a.trim().toLowerCase()) : parseInt(a, 10);
      const opts = x.opts.slice(0, 4).map(strip); if (!(a >= 0 && a < opts.length)) return null;
      return { q: String(x.q), opts, ans: a, why: x.why ? String(x.why) : '' };
    }).filter(Boolean);
    if (!items.length) return failCard('quiz', '（这个小测验的格式没读懂）');
    QD[id] = items;
    return card('quiz', id, '❓ 小测验', '点选项马上看对错', quizInner(id));
  }

  /* ---------- 工具：闪卡预览 + 一键加入 ---------- */
  const CD = {};
  const cdAdded = (cards, sid) => { try { return cards.every(c => S.cards.some(x => x.s === sid && x.q === c.q)); } catch (e) { return false; } };
  function renderCards(body, id) {
    let arr = parseArr(body);
    if (!arr) arr = String(body).split(/\r?\n/).map(l => l.split('|')).filter(p => p.length >= 2).map(p => ({ q: p[0], a: p.slice(1).join('|') }));
    const cards = arr.filter(x => x && x.q && x.a).slice(0, 8).map(x => ({ q: String(x.q).trim(), a: String(x.a).trim() }));
    if (!cards.length) return failCard('cards', '（这组闪卡没读懂）');
    CD[id] = cards;
    const sid = typeof S !== 'undefined' ? S.sub : '', added = cdAdded(cards, sid);
    return card('cards', id, '🗂 闪卡', cards.length + ' 张',
      cards.map((c, i) => `<details style="margin:4px 0"><summary>${i + 1}. ${E(c.q)}</summary><div class="tl-why">${E(c.a)}</div></details>`).join('') +
      `<div class="tl-row" style="margin-top:6px"><button class="tl-btn pri" data-tl="cd" ${added ? 'disabled' : ''}>${added ? '✓ 已加入闪卡' : '➕ 全部加入闪卡'}</button></div>`);
  }

  /* ---------- 工具：跳转按钮 ---------- */
  const TABN = { today: '今日', notes: '笔记', flash: '闪卡', drill: '刷题', exam: '模拟卷', res: '资料' };
  function renderGo(body, id) {
    const btns = String(body).split(/\r?\n/).map(l => l.trim()).filter(Boolean).slice(0, 4).map(l => {
      const p = l.split('|'), tab = p[0].trim().toLowerCase().replace(/^tab\s*[:：]\s*/, ''); if (!TABN[tab]) return '';
      return `<button class="tl-btn pri" data-tl="go" data-tab="${tab}">${E((p[1] || '').trim() || '去' + TABN[tab])} →</button>`;
    }).join('');
    return btns ? card('go', id, '🧭 快捷入口', '', `<div class="tl-row">${btns}</div>`) : failCard('go', '');
  }

  /* ---------- 工具：Mermaid 流程图 / 时间线 / 概念图 ---------- */
  const MMC = {}; let mmP = null, mmTheme = null, mmN = 0;
  const isDark = () => { try { const v = getComputedStyle(document.documentElement).getPropertyValue('--sheet').trim(); const m = v.match(/^#([0-9a-f]{6})$/i); if (m) { const n = parseInt(m[1], 16); return ((n >> 16) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11) < 128; } } catch (e) {} return false; };
  function mmLoad() {
    if (window.mermaid) return Promise.resolve(window.mermaid);
    if (mmP) return mmP;
    mmP = new Promise((ok, no) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/mermaid@10.9.3/dist/mermaid.min.js';
      s.onload = () => window.mermaid ? ok(window.mermaid) : no(new Error('mermaid'));
      s.onerror = () => { mmP = null; no(new Error('load')); };
      document.head.appendChild(s);
    });
    return mmP;
  }
  function renderMermaid(body, id) {
    const src = String(body).trim(), key = (isDark() ? 'd' : 'l') + H(src);
    return `<div class="tl-card tl-mermaid tl-mm" data-id="${id}" data-src="${E(src)}"${MMC[key] ? ' data-d="1"' : ''}><div class="tl-h">🔀 图解</div><div class="tl-mmbox">${MMC[key] || '<div class="fine muted">画图中…</div>'}</div></div>`;
  }
  async function mmHydrate(el) {
    el.dataset.d = '1';
    const src = el.dataset.src || '', box = el.querySelector('.tl-mmbox') || el;
    try {
      const mm = await mmLoad(), dark = isDark();
      if (mmTheme !== dark) { mm.initialize({ startOnLoad: false, securityLevel: 'strict', theme: dark ? 'dark' : 'neutral' }); mmTheme = dark; }
      const key = (dark ? 'd' : 'l') + H(src);
      if (!MMC[key]) MMC[key] = (await mm.render('tlmm' + (++mmN), src)).svg;
      box.innerHTML = MMC[key];
    } catch (e) {
      document.querySelectorAll('[id^="dtlmm"]').forEach(n => n.remove());
      box.innerHTML = `<div class="fine muted">这张图没画成功（图的语法有误，或网络连不上）。</div><details><summary class="fine">看文字版</summary><pre style="white-space:pre-wrap">${E(src)}</pre></details>`;
    }
  }
  function hydrate() { document.querySelectorAll('.tl-mm:not([data-d])').forEach(mmHydrate); }
  let raf = 0;
  new MutationObserver(() => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; hydrate(); }); }).observe(document.documentElement, { childList: true, subtree: true });

  /* ---------- 点击事件 (整页只绑一次) ---------- */
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-tl]'); if (!b) return;
    const el = b.closest('.tl-card'), id = el && el.dataset.id, k = b.dataset.tl;
    if (k === 'tm') {
      const t = TM[id]; if (!t) return;
      if (b.dataset.a === 'reset') { t.run = false; t.done = false; t.left = t.total; }
      else if (t.run) { t.left = tmLeft(t); t.run = false; }
      else {
        if (t.done) { t.done = false; t.left = t.total; }
        t.end = Date.now() + t.left * 1000; t.run = true;
        try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); actx.resume && actx.resume(); } catch (x) {}
        try { if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission(); } catch (x) {}
        if (!tick) tick = setInterval(tmPaint, 500);
      }
      tmPaint();
    } else if (k === 'qz') {
      const qi = +b.dataset.qi, oi = +b.dataset.oi; if (!QD[id]) return;
      (QZ[id] = QZ[id] || {})[qi] = oi;
      const h = el.querySelector('.tl-h'); while (h.nextSibling) h.nextSibling.remove(); h.insertAdjacentHTML('afterend', quizInner(id));
    } else if (k === 'cd') {
      try {
        const cards = CD[id] || [], sid = S.sub; let n = 0;
        cards.forEach((c, i) => { if (!S.cards.some(x => x.s === sid && x.q === c.q)) { S.cards.push({ id: 't' + Date.now() + i, s: sid, q: c.q, a: c.a, qz: '', az: '' }); n++; } });
        save(); try { fq = []; } catch (x) {}
        b.disabled = true; b.textContent = '✓ 已加入闪卡'; say('已加入 ' + n + ' 张闪卡');
      } catch (x) { say('加入失败，请再试一次'); }
    } else if (k === 'go') {
      try { go(b.dataset.tab); } catch (x) {}
    }
  });

  /* ---------- 登记表 ---------- */
  const REG = {
    solve: { label: ['🧩', '解方程（本地计算）'], render: renderSolve },
    timer: { label: ['⏱', '放了计时器'], render: renderTimer },
    cards: { label: ['🗂', '生成闪卡预览'], render: renderCards },
    quiz: { label: ['❓', '出了小测验'], render: renderQuiz },
    go: { label: ['🧭', '加了快捷入口'], render: renderGo },
    mermaid: { label: ['🔀', '画了图解'], render: renderMermaid }
  };
  const OLD = { plot: ['📈', '画函数图像'], svg: ['🖍', '画示意图'], image: ['🖼', '配插图（点按钮才生成）'], calc: ['🧮', '计算核对（本地重算）'] };
  const RULE = '\n【工具卡片】除了上面的作图和计算核对，你还可以用下面的代码块，让回答里直接出现能点的卡片。每次回答最多用 2 个，没必要就不用；文字讲解照常写 (卡片只是补充)，不要向学生提到「代码块」「工具」这些词：\n' +
    '```solve：解方程，每行一个，例如 x^2-4x+3=0 (可选一行 x: -10..10 设定范围)。程序会自己算出根和判别式，让学生对照你的解答。\n' +
    '```quiz：小测验，JSON 数组，例如 [{"q":"题目","opts":["选项一","选项二","选项三","选项四"],"ans":1,"why":"一句话解析"}]；ans 是正确选项的序号 (从 0 开始)，最多 3 题。学生说「考考我」「出几道题」时优先用。\n' +
    '```cards：闪卡，JSON 数组 [{"q":"问题","a":"简短答案"}]，最多 6 张，学生可以一键加入闪卡。\n' +
    '```timer：计时器，写两行 minutes: 25 和 label: 名称。学生说要专注、计时、番茄钟时用。\n' +
    '```mermaid：流程、步骤、时间线、概念关系图，写 Mermaid 语法 (flowchart TD / timeline / mindmap)；节点文字一律用英文双引号包住，例如 A["细胞分裂"] --> B["两个子细胞"]。\n' +
    '```go：快捷按钮，每行「页面|按钮文字」，页面只能是 today、notes、flash、drill、exam、res，例如 drill|去做刷题。';

  /* ---------- 思考轨迹 ---------- */
  let cur = null;
  function paintLive(tr) {
    tr = tr || cur; const el = document.getElementById('chLive'); if (!el || !tr) return;
    el.textContent = tr._s.map(x => x[0] + ' ' + x[1] + '  +' + (x[2] / 1000).toFixed(1) + 's').join('\n');
  }
  function newTrace() {
    const t0 = Date.now(), s = [];
    const o = {
      _s: s,
      step(ic, t) { s.push([ic, String(t).slice(0, 220), Date.now() - t0]); paintLive(o); },
      phase(k) { const m = { retry: ['⚠️', '服务或网络忙，自动重试'], switch: ['🔁', '额度或服务出问题，自动换了模型'], cont: ['✂️', '回答太长被截断，自动续写'] }[k]; if (m) o.step(m[0], m[1]); },
      out() { cur = null; return { s: s.slice(0, 14), ms: Date.now() - t0 }; }
    };
    cur = o; return o;
  }
  function traceHTML(t) {
    if (!t || !t.s || !t.s.length) return '';
    return `<details class="tl-trace"><summary>🧭 思考轨迹 · ${t.s.length} 步 · ${(t.ms / 1000).toFixed(1)}s</summary><ol>${t.s.map(x => `<li><span class="at">+${(x[2] / 1000).toFixed(1)}s</span><span>${E(x[0])} ${E(x[1])}</span></li>`).join('')}</ol></details>`;
  }
  function scan(text) {
    const seen = {}, out = [];
    String(text).replace(/```(svg|plot|image|calc|solve|timer|cards|quiz|go|mermaid)[ \t]*\r?\n/gi, (m, k) => { k = k.toLowerCase(); seen[k] = (seen[k] || 0) + 1; return m; });
    for (const k in seen) { const l = (REG[k] && REG[k].label) || OLD[k]; out.push([l[0], l[1] + (seen[k] > 1 ? ' ×' + seen[k] : '')]); }
    return out;
  }

  window.Tools = {
    has: k => !!REG[k],
    fig: (k, body) => { try { return REG[k].render(String(body || ''), H(k + body)); } catch (e) { return failCard(k, '（这个卡片没生成成功）'); } },
    rule: () => RULE, scan, newTrace, traceHTML, paintLive
  };

  hydrate();
  /* 如果问答页已经画好了（脚本比页面晚加载），补画一次，让卡片显示出来 */
  try { if (typeof S !== 'undefined' && S.tab === 'chat' && typeof rChat === 'function' && !chatBusy) rChat(); } catch (e) {}
})();
