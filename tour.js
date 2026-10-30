/* 首次使用指引（无依赖）
 * - window.SPMTour.start()  手动开始（设置 → 新手指南里的按钮、手册页的「带我逛一遍」都会调用它）
 * - 新用户第一次打开时，只会在底部弹一个小提示问要不要逛一遍，不会直接打断
 * - 老用户（已填 key、或已有笔记/复习记录）不会看到提示
 * - 只读 localStorage 里的 spm-notes-v2 判断是不是新用户，不改它；自己的记号是 spm-tour / spm-tour-n
 */
(function () {
  'use strict';
  var FLAG = 'spm-tour', COUNT = 'spm-tour-n', DATA = 'spm-notes-v2', GUIDE = 'guide.html';
  var $ = function (s) { return document.querySelector(s); };
  function ls(k, v) {
    try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {}
    return null;
  }

  /* ---------- 样式：只用 App 的主题变量，所以 10 个主题都自动适配 ---------- */
  function css() {
    if ($('#spt-css')) return;
    var s = document.createElement('style');
    s.id = 'spt-css';
    s.textContent =
      '#spt-shield{position:fixed;inset:0;z-index:9999;background:transparent}' +
      '#spt-hole{position:fixed;z-index:10000;border-radius:14px;pointer-events:none;box-shadow:0 0 0 9999px rgba(8,14,28,.64),0 0 0 2px rgba(255,255,255,.9) inset;transition:top .25s,left .25s,width .25s,height .25s}' +
      '#spt-hole.none{box-shadow:0 0 0 9999px rgba(8,14,28,.64);width:0!important;height:0!important}' +
      '#spt-card,#spt-ask{position:fixed;z-index:10001;box-sizing:border-box;background:var(--sheet,#fff);color:var(--ink,#17263f);border:1px solid var(--line,#d3dbe8);border-radius:16px;box-shadow:0 18px 50px -12px rgba(0,0,0,.5);padding:16px 16px 14px;font:400 15px/1.7 var(--sans,system-ui,sans-serif)}' +
      '#spt-card{width:min(340px,calc(100vw - 24px))}' +
      '#spt-card .n{font-size:12px;color:var(--muted,#5d6b7c);letter-spacing:.04em}' +
      '#spt-card h3{margin:2px 0 6px;font:700 18px/1.4 var(--kai,var(--sans,serif))}' +
      '#spt-card p{margin:0 0 12px}' +
      '#spt-card .dots{display:flex;gap:5px;margin:0 0 12px}' +
      '#spt-card .dots i{width:7px;height:7px;border-radius:50%;background:var(--line,#d3dbe8)}' +
      '#spt-card .dots i.on{background:var(--accent,#17263f)}' +
      '.spt-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.spt-row .sp{flex:1}' +
      '.spt-b{appearance:none;border:1px solid var(--line,#d3dbe8);background:var(--sheet2,#f1f4fb);color:inherit;border-radius:10px;min-height:34px;padding:4px 13px;font:inherit;font-size:14px;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center}' +
      '.spt-b.pri{background:var(--accent,#17263f);color:var(--accent-ink,#fff);border-color:var(--accent,#17263f);font-weight:700}' +
      '.spt-b.ghost{border-color:transparent;background:none;color:var(--muted,#5d6b7c)}' +
      '.spt-b:focus-visible{outline:3px solid var(--blue,#2f55d4);outline-offset:2px}' +
      '#spt-ask{left:50%;transform:translateX(-50%);bottom:calc(18px + env(safe-area-inset-bottom,0px));width:min(420px,calc(100vw - 24px));z-index:9990}' +
      '#spt-ask b{display:block;font-size:16px;margin-bottom:2px}#spt-ask p{margin:0 0 10px;color:var(--muted,#5d6b7c);font-size:14px}' +
      '@media (prefers-reduced-motion:reduce){#spt-hole{transition:none}}' +
      '@media print{#spt-shield,#spt-hole,#spt-card,#spt-ask{display:none!important}}';
    document.head.appendChild(s);
  }

  /* ---------- 步骤 ----------
   * sel 找不到 / 看不见时，不会报错：卡片改放屏幕中间，照样能读。
   * tab：这一步需要先切到哪个分页（直接点导航里的按钮，和用户自己点一样）
   */
  function steps() {
    var list = [
      { tab: 'today', sel: '#daysChip', t: '考试倒计时', d: '这里显示离笔试还有几天。笔试开始日默认是 2026-11-23，你考的日期不一样，可以到「设置」里改。' },
      { tab: 'today', sel: '#tabs', t: '七个分页', d: '今日、笔记、闪卡、刷题、模拟卷、问答、资料。手机上左右滑动能看到全部。每天先到「今日」，它会告诉你今天该读什么。' },
      { tab: 'notes', sel: '#subjects', t: '先选科目', d: '在「笔记」「闪卡」「刷题」这些页面，顶部这一排就是你考的科目，旁边的百分比是复习进度。内置的笔记和题库不用 key 就能看。' },
      { tab: 'notes', sel: '#btnSet', t: '设置：贴上你的 key', d: '想让 AI 生成笔记、出题、批改和回答，就要在这里贴一个免费的 Gemini key；也在这里选你考的科目、给每科打信心分。不急着弄，先看内置笔记也行。' },
      { tab: 'notes', sel: '#btnBell', t: '更新记录', d: '以后有新功能或新内容，这个铃铛会亮红点，点开能看到改了什么。' }
    ];
    if (visible($('#btnInstall'))) {
      list.push({ tab: 'notes', sel: '#btnInstall', t: '装成 App', d: '点这个把「SPM备考」装到桌面，之后一点图标就进来，打开过的内容没网也能看。从聊天软件点开链接时装不了，请先改用 Safari 或 Chrome 打开。' });
    }
    list.push({ tab: 'today', sel: null, t: '逛完了', d: '想看图文版，打开完整手册：里面有申请 key 的步骤、各分页怎么用、备用 AI、备份同步和常见问题。随时可以从「设置 → 新手指南」再回来。', end: true });
    return list;
  }

  function visible(el) {
    if (!el) return false;
    var r = el.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    var cs = getComputedStyle(el);
    return cs.visibility !== 'hidden' && cs.display !== 'none';
  }
  function curTab() { var b = $('#tabs .tab.active'); return b ? b.getAttribute('data-tab') : null; }
  function gotoTab(t) {
    if (!t || curTab() === t) return;
    var b = $('#tabs [data-tab="' + t + '"]');
    if (b) b.click();
  }

  /* ---------- 指引本体 ---------- */
  var st = null;

  function start() {
    if (st) return;
    css(); removeAsk();
    var list = steps();
    st = { i: 0, list: list, from: curTab(), prevFocus: document.activeElement };
    var shield = document.createElement('div'); shield.id = 'spt-shield';
    var hole = document.createElement('div'); hole.id = 'spt-hole'; hole.className = 'none';
    var card = document.createElement('div'); card.id = 'spt-card';
    card.setAttribute('role', 'dialog'); card.setAttribute('aria-modal', 'true'); card.setAttribute('aria-label', '新手指引');
    document.body.appendChild(shield); document.body.appendChild(hole); document.body.appendChild(card);
    st.shield = shield; st.hole = hole; st.card = card;
    card.addEventListener('click', onCardClick);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', place);
    window.addEventListener('orientationchange', place);
    show(0);
  }

  function show(i) {
    var s = st.list[i]; st.i = i;
    gotoTab(s.tab);
    window.scrollTo(0, 0);
    /* 切分页后 App 会重画，等一下再量位置 */
    setTimeout(function () {
      if (!st) return;
      var el = s.sel ? $(s.sel) : null;
      st.el = visible(el) ? el : null;
      var dots = '';
      for (var k = 0; k < st.list.length; k++) dots += '<i class="' + (k === i ? 'on' : '') + '"></i>';
      var last = i === st.list.length - 1;
      st.card.innerHTML =
        '<div class="n">' + (i + 1) + ' / ' + st.list.length + '</div>' +
        '<h3>' + s.t + '</h3><p>' + s.d + '</p>' +
        '<div class="dots" aria-hidden="true">' + dots + '</div>' +
        '<div class="spt-row">' +
        (last ? '' : '<button class="spt-b ghost" data-a="skip">跳过</button>') +
        '<span class="sp"></span>' +
        (i > 0 ? '<button class="spt-b" data-a="prev">上一步</button>' : '') +
        (last ? '<a class="spt-b" href="' + GUIDE + '" data-a="guide">📖 打开手册</a>' : '') +
        '<button class="spt-b pri" data-a="' + (last ? 'done' : 'next') + '">' + (last ? '完成' : '下一步') + '</button>' +
        '</div>';
      place();
      var pri = st.card.querySelector('.pri'); if (pri) pri.focus({ preventScroll: true });
    }, 90);
  }

  function place() {
    if (!st || !st.card) return;
    var card = st.card, hole = st.hole, el = st.el;
    var vw = window.innerWidth, vh = window.innerHeight, pad = 12;
    var cw = card.offsetWidth, ch = card.offsetHeight;
    if (!el || !visible(el)) {
      hole.className = 'none';
      card.style.left = Math.max(pad, (vw - cw) / 2) + 'px';
      card.style.top = Math.max(pad, (vh - ch) / 2) + 'px';
      return;
    }
    var r = el.getBoundingClientRect(), g = 6;
    hole.className = '';
    hole.style.left = (r.left - g) + 'px'; hole.style.top = (r.top - g) + 'px';
    hole.style.width = (r.width + g * 2) + 'px'; hole.style.height = (r.height + g * 2) + 'px';
    var below = r.bottom + g + 12, top;
    if (below + ch <= vh - pad) top = below;
    else if (r.top - g - 12 - ch >= pad) top = r.top - g - 12 - ch;
    else top = Math.max(pad, vh - ch - pad);
    var left = r.left + r.width / 2 - cw / 2;
    left = Math.min(Math.max(pad, left), vw - cw - pad);
    card.style.left = left + 'px'; card.style.top = top + 'px';
  }

  function onCardClick(e) {
    var b = e.target.closest('[data-a]'); if (!b) return;
    var a = b.getAttribute('data-a');
    if (a === 'next') show(st.i + 1);
    else if (a === 'prev') show(st.i - 1);
    else if (a === 'skip') end(false);
    else if (a === 'done') end(true);
    else if (a === 'guide') { ls(FLAG, 'done'); } /* 让链接正常跳转 */
  }
  function onKey(e) {
    if (!st) return;
    if (e.key === 'Escape') { e.preventDefault(); end(false); }
    else if (e.key === 'ArrowRight' && st.i < st.list.length - 1) { e.preventDefault(); show(st.i + 1); }
    else if (e.key === 'ArrowLeft' && st.i > 0) { e.preventDefault(); show(st.i - 1); }
  }

  function end(finished) {
    if (!st) return;
    var from = st.from, pf = st.prevFocus;
    ['shield', 'hole', 'card'].forEach(function (k) { if (st[k]) st[k].remove(); });
    document.removeEventListener('keydown', onKey, true);
    window.removeEventListener('resize', place);
    window.removeEventListener('orientationchange', place);
    st = null;
    ls(FLAG, finished ? 'done' : 'skip');
    if (from) gotoTab(from);
    try { if (pf && pf.focus) pf.focus({ preventScroll: true }); } catch (e) {}
  }

  /* ---------- 新用户的小提示 ---------- */
  function isNewUser() {
    var o = {};
    try { o = JSON.parse(ls(DATA) || '{}') || {}; } catch (e) {}
    var hasKey = !!(o.ai && (o.ai.key || (o.ai.alt && Object.keys(o.ai.alt).some(function (p) { return o.ai.alt[p] && o.ai.alt[p].key; }))));
    var n = function (x) { return x && typeof x === 'object' ? Object.keys(x).length : 0; };
    return !hasKey && !n(o.notes) && !n(o.done) && !(o.wrong && o.wrong.length) && !(o.exams && o.exams.length);
  }
  function removeAsk() { var a = $('#spt-ask'); if (a) a.remove(); }
  function ask() {
    if (ls(FLAG) || st || $('#spt-ask')) return;
    var n = parseInt(ls(COUNT) || '0', 10) || 0;
    if (n >= 3 || !isNewUser()) return;
    ls(COUNT, String(n + 1));
    css();
    var a = document.createElement('div'); a.id = 'spt-ask';
    a.setAttribute('role', 'region'); a.setAttribute('aria-label', '新手指引提示');
    a.innerHTML = '<b>👋 第一次用？</b><p>30 秒带你认识几个关键位置，也可以直接看图文手册。</p>' +
      '<div class="spt-row"><button class="spt-b ghost" data-a="no">不用了</button><span class="sp"></span>' +
      '<a class="spt-b" href="' + GUIDE + '" data-a="book">📖 看手册</a><button class="spt-b pri" data-a="go">带我逛逛</button></div>';
    a.addEventListener('click', function (e) {
      var b = e.target.closest('[data-a]'); if (!b) return;
      var k = b.getAttribute('data-a');
      if (k === 'no') { ls(FLAG, 'skip'); removeAsk(); }
      else if (k === 'go') { removeAsk(); start(); }
      else if (k === 'book') { ls(FLAG, 'done'); }
    });
    document.body.appendChild(a);
  }

  window.SPMTour = { start: start, end: function () { end(false); }, reset: function () { try { localStorage.removeItem(FLAG); localStorage.removeItem(COUNT); } catch (e) {} } };

  function boot() {
    var q = '';
    try { q = location.search; } catch (e) {}
    if (/[?&]tour=1\b/.test(q)) {
      try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) {}
      setTimeout(start, 700);
      return;
    }
    setTimeout(ask, 3200); /* 让开屏动画和第一屏先跑完 */
  }
  if (document.readyState === 'complete') boot(); else window.addEventListener('load', boot);
})();
