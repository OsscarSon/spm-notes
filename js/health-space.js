// Health Space · 健康空间（v9.9.1）：总览 / 运动 / 护肤 / 饮食与饮水。见 docs/v9.9.1-health-space.md
// 原则：不建任何新的健康数据，也不碰云同步 / Undo / 课表结构。显示的内容全部来自现有数据（经 health-space-core.js 只读聚合）：
//   护肤 BT（btSave + rBt）、饮食与饮水 DI（diSave + rDi）、运动计划 SP（ssv / addSp + rSp）、本周训练时段（课表里 a:2，勾选写 DN，和课表页同一条路径）。
// 写完都会调用旧页面的渲染函数，旧页面（运动 / 美容 / 饮食）和云同步看到的数据与以前完全一致。
// 自己没有任何存储键。文案全部在 js/lang-health-space.js（en / zh / ms）。
(function () {
  'use strict';
  var SEC = document.getElementById('v-hs'), C = window.HealthSpaceCore;
  if (!SEC || !C) return;
  var TABS = ['dash', 'move', 'skin', 'food'];
  // DI 里存的餐别是中文原文（旧页面的格式），显示时再翻译
  var MEALS = [['早餐', 'mBreakfast'], ['午餐', 'mLunch'], ['晚餐', 'mDinner'], ['加餐', 'mSnack']];
  var S = { tab: 'dash', msg: '', vals: {}, meal: '', results: [], pick: null, searching: false, smsg: '', focusHead: false, fk: '' };
  var ctl = null;

  // ---------- 小工具 ----------
  function lang() { return window.LANG || 'en'; }
  function t(k, v) {
    var L = window.HS_I18N || {}, s = (L[lang()] || {})[k]; if (s == null) s = (L.en || {})[k]; if (s == null) s = k;
    if (v) Object.keys(v).forEach(function (n) { s = s.split('{' + n + '}').join(v[n]); });
    return s;
  }
  function h(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls.split(' ').map(function (c) { return 'health-space-' + c; }).join(' ');
    if (txt != null) e.textContent = txt; return e;
  }
  function btn(cls, txt, fn, label) { var b = h('button', cls, txt); b.type = 'button'; if (label) b.setAttribute('aria-label', label); b.onclick = fn; return b; }
  function ok(fn) { try { return fn(); } catch (e) { return undefined; } }
  function visible() { return document.body.getAttribute('data-view') === 'hs'; }
  function loc() { return lang() === 'zh' ? 'zh-CN' : lang() === 'ms' ? 'ms-MY' : 'en-GB'; }
  function tm(m) { return typeof tmin === 'function' ? tmin(m) : Math.floor(m / 60) + ':' + ('0' + (m % 60)).slice(-2); }
  function dlabel(dn) {
    var d = ok(function () { return dnDate(dn); }); if (!d) return '';
    try { return new Intl.DateTimeFormat(loc(), { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(d.y, d.m - 1, d.d)); } catch (e) { return ''; }
  }
  function wlabel(iso) {
    var p = iso.split('-'); try { return new Intl.DateTimeFormat(loc(), { weekday: 'narrow' }).format(new Date(+p[0], +p[1] - 1, +p[2])); } catch (e) { return ''; }
  }
  function fmtSec(x) {
    x = Math.round(x); var hh = Math.floor(x / 3600), mm = Math.floor(x % 3600 / 60), ss = x % 60;
    return hh ? hh + ':' + ('0' + mm).slice(-2) + ':' + ('0' + ss).slice(-2) : mm + ':' + ('0' + ss).slice(-2);
  }
  function mealName(zh) { for (var i = 0; i < MEALS.length; i++) if (MEALS[i][0] === zh) return t(MEALS[i][1]); return zh; }
  function defaultMeal() { var hr = new Date().getHours(); return hr < 10 ? '早餐' : hr < 15 ? '午餐' : hr < 21 ? '晚餐' : '加餐'; }
  function say(m) { S.msg = m || ''; }

  // ---------- 读取快照（只读）----------
  function snapshot() {
    var now = new Date(), s = { nowMin: now.getHours() * 60 + now.getMinutes(), todayDn: dayNum(now), days: [], sessions: [], sp: [] };
    ok(function () {
      var k = hDay(0), l = BT.log[k] || {};
      s.bt = { am: BT.am.slice(), pm: BT.pm.slice(), doneAm: (l.am || []).slice(), donePm: (l.pm || []).slice(), streak: btStreak() };
    });
    ok(function () {
      var d = DI.days[hDay(0)] || { w: 0, m: [] };
      s.water = { w: d.w || 0, goal: DI.water };
      s.food = { kcal: DI.kcal, meals: (d.m || []).map(function (m) { return { t: m.t, n: m.n, k: m.k }; }) };
    });
    ok(function () {
      for (var i = 6; i >= 0; i--) {
        var k = hDay(-i), dd = DI.days[k];
        s.days.push({ iso: k, skin: btDone(k), water: dd ? dd.w || 0 : 0, meals: dd && dd.m ? dd.m.length : 0, isToday: i === 0 });
      }
    });
    ok(function () { s.sp = SP.map(function (p) { return { n: p.n, w: p.w, m: (p.m || []).map(function (m) { return { k: m.k, c: m.c, g: m.g }; }) }; }); });
    ok(function () {
      var arr = (curW === thisW ? data : WK[thisW]) || [];
      arr.forEach(function (x) { if (x.a === 2) { var key = kk(x, thisW); s.sessions.push({ key: key, dn: dnOf(thisW, x.day), s: x.s, e: x.e, t: x.t, done: !!DN[key] }); } });
    });
    return s;
  }

  // ---------- 写入：只走现有路径 ----------
  function cupSet(w) { ok(function () { var d = dayDi(hDay(0)); d.w = Math.max(0, Math.min(30, w)); diSave(); rDi(); }); }
  function cupDelta(dl) { ok(function () { var d = dayDi(hDay(0)); cupSet(d.w + dl); }); }
  function toggleStep(p, i, on) {
    ok(function () {
      var k = hDay(0), l = BT.log[k] = BT.log[k] || {}, d = l[p] = l[p] || [], j = d.indexOf(i);
      if (on && j < 0) d.push(i); if (!on && j >= 0) d.splice(j, 1);
      btSave(); rBt();
    });
  }
  function addStep(p, name) {
    var v = String(name || '').trim().slice(0, 12); if (!v) return false;
    return !!ok(function () { BT[p].push(v); btSave(); rBt(); return true; });
  }
  function delStep(p, i) {
    ok(function () {
      BT[p].splice(i, 1);
      var l = BT.log[hDay(0)];            // 今天的打卡按位置顺延，不丢掉其余步骤的完成状态
      if (l && l[p]) l[p] = l[p].filter(function (j) { return j !== i; }).map(function (j) { return j > i ? j - 1 : j; });
      btSave(); rBt();
    });
  }
  function setGoalKcal(v) { ok(function () { DI.kcal = Math.max(500, Math.min(6000, +v || 2000)); diSave(); rDi(); }); }
  function setGoalWater(v) { ok(function () { DI.water = Math.max(1, Math.min(30, +v || 8)); diSave(); rDi(); }); }
  function addMeal(zhType, name, kcal) { return !!ok(function () { dayDi(hDay(0)).m.push({ t: zhType, n: name, k: kcal }); diSave(); rDi(); return true; }); }
  function delMeal(i) { ok(function () { dayDi(hDay(0)).m.splice(i, 1); diSave(); rDi(); }); }
  function addPlan(name) { var v = String(name || '').trim(); if (!v) return false; return !!ok(function () { addSp(v); return true; }); }
  function setFreq(i, w) { ok(function () { if (!SP[i]) return; SP[i].w = +w; ssv(); rSp(); }); }
  function delPlan(i) { ok(function () { SP.splice(i, 1); ssv(); rSp(); }); }
  function toggleSession(key, on) {
    ok(function () {
      if (on) DN[key] = 1; else delete DN[key];
      put2(K_DN, DN); if (typeof draw === 'function') draw(); if (typeof rf === 'function') rf(); refresh();
    });
  }
  function go(v) { if (typeof showView === 'function') showView(v); }
  function tab(k) { S.tab = k; S.msg = ''; S.focusHead = true; render(); }

  // ---------- 积木 ----------
  function heroImg(kind) { var im = h('img', 'hero-img'); im.src = 'assets/buddy/' + kind + '.svg'; im.alt = ''; im.width = 104; im.height = 104; im.decoding = 'async'; im.setAttribute('aria-hidden', 'true'); return im; }
  function hero(box, key, buddy) {
    var e = h('section', 'hero'), tx = h('div', 'hero-t'), hd = h('h1', 'h', t(key + 'Title'));
    hd.tabIndex = -1; tx.appendChild(h('div', 'eyebrow', t(key + 'Eyebrow'))); tx.appendChild(hd); tx.appendChild(h('p', 'sub', t(key + 'Sub')));
    e.appendChild(tx); e.appendChild(heroImg(buddy || 'idle')); box.appendChild(e);
  }
  function tabs(box) {
    var bar = h('div', 'tabs'); bar.setAttribute('role', 'tablist'); bar.setAttribute('aria-label', t('tabsLabel'));
    var icons = { dash: '🏠', move: '🏃', skin: '✨', food: '🥗' }, names = { dash: 'tabDash', move: 'tabMove', skin: 'tabSkin', food: 'tabFood' };
    TABS.forEach(function (k, idx) {
      var on = S.tab === k, b = h('button', 'tabb' + (on ? ' on' : ''), icons[k] + ' ' + t(names[k]));
      b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1; b.setAttribute('data-fk', 'tab:' + k);
      b.onclick = function () { if (!on) { S.fk = 'tab:' + k; S.tab = k; S.msg = ''; render(); } };
      b.onkeydown = function (ev) {
        var d = ev.key === 'ArrowRight' ? 1 : ev.key === 'ArrowLeft' ? -1 : 0; if (ev.key === 'Home') d = -9; if (ev.key === 'End') d = 9; if (!d) return;
        ev.preventDefault(); var ni = d === -9 ? 0 : d === 9 ? TABS.length - 1 : (idx + d + TABS.length) % TABS.length; S.fk = 'tab:' + TABS[ni]; S.tab = TABS[ni]; S.msg = ''; render();
      };
      bar.appendChild(b);
    });
    box.appendChild(bar);
  }
  function stat(tag, num, lbl, sub, fn, fk) {
    var e = h(fn ? 'button' : 'div', 'stat'); if (fn) { e.type = 'button'; e.onclick = fn; if (fk) e.setAttribute('data-fk', fk); }
    e.appendChild(h('span', 'tag', tag)); e.appendChild(h('b', 'num', num)); e.appendChild(h('span', 'lbl', lbl));
    if (sub) e.appendChild(h('small', 'sub2', sub)); return e;
  }
  function bar(p, label) {
    var b = h('div', 'bar'); b.setAttribute('role', 'progressbar'); b.setAttribute('aria-valuemin', '0'); b.setAttribute('aria-valuemax', '100'); b.setAttribute('aria-valuenow', String(p)); if (label) b.setAttribute('aria-label', label);
    var f = h('div', 'fill'); f.style.width = p + '%'; b.appendChild(f); return b;
  }
  function heading(txt, sub) { var d = h('div', 'head'); d.appendChild(h('h2', 'h2', txt)); if (sub) d.appendChild(h('p', 'sub', sub)); return d; }
  function empty(txt, cta, fn) { var e = h('div', 'empty'); e.appendChild(h('p', 'sub', txt)); if (cta) e.appendChild(btn('btn', cta, fn)); return e; }
  function row(emoji, title, meta) {
    var r = h('div', 'row'), tl = h('span', 'tile', emoji), b = h('div', 'row-t'); tl.setAttribute('aria-hidden', 'true');
    b.appendChild(h('b', 'row-n', title)); if (meta) b.appendChild(h('small', 'row-m', meta)); r.appendChild(tl); r.appendChild(b); return r;
  }
  function note(box) { box.appendChild(h('p', 'note', t('note'))); }
  function live(box) { var m = h('div', 'live', S.msg); m.setAttribute('role', 'status'); m.setAttribute('aria-live', 'polite'); box.appendChild(m); }
  function classic(box, view) { var r = h('div', 'foot'); r.appendChild(btn('link', t('classicLink'), function () { go(view); })); box.appendChild(r); }
  function input(fk, ph, label, extra) {
    var i = h('input', 'input'); i.type = (extra && extra.type) || 'text'; i.placeholder = ph; i.setAttribute('aria-label', label || ph); i.setAttribute('data-fk', fk);
    if (extra && extra.max) i.maxLength = extra.max; if (extra && extra.inputmode) i.setAttribute('inputmode', extra.inputmode);
    if (extra && extra.min != null) i.min = extra.min; if (S.vals[fk] != null) i.value = S.vals[fk];
    i.oninput = function () { S.vals[fk] = i.value; if (extra && extra.on) extra.on(i.value); };
    return i;
  }

  // ---------- 总览 ----------
  function upcomingRow(u, m) {
    if (u.kind === 'skin') {
      var r = row(u.group === 'am' ? '☀️' : '🌙', t(u.group === 'am' ? 'upSkinAm' : 'upSkinPm'), t(u.left === 1 ? 'stepsLeft1' : 'stepsLeftN', { n: u.left }));
      r.appendChild(btn('btn ghost sm', t('open'), function () { tab('skin'); })); return r;
    }
    if (u.kind === 'move') {
      var s = u.session, r2 = row('🏃', s.t.replace(/^🏃\s*/, ''), (u.today ? t('today') : dlabel(s.dn)) + ' · ' + tm(s.s));
      r2.appendChild(btn('btn ghost sm', t('open'), function () { tab('move'); })); return r2;
    }
    if (u.kind === 'water') {
      var r3 = row('💧', t('upWater'), t('cupsOf', { a: u.w, b: u.goal }));
      var p = btn('btn ghost sm', '+1', function () { S.fk = 'up:cup'; cupDelta(1); }, t('waterPlus')); p.setAttribute('data-fk', 'up:cup'); r3.appendChild(p); return r3;
    }
    var r4 = row('🍱', t('upFood'), t('upFoodSub')); r4.appendChild(btn('btn ghost sm', t('open'), function () { tab('food'); })); return r4;
  }
  function weekStrip(box, m) {
    var c = h('section', 'card'); c.appendChild(heading(t('weekTitle'), t('weekSub')));
    var g = h('div', 'weekg'); g.setAttribute('role', 'list');
    m.week.forEach(function (d) {
      var col = h('div', 'wcol' + (d.isToday ? ' today' : '')); col.setAttribute('role', 'listitem');
      var bits = [d.skin > 0 ? t('skinShort') : '', d.water > 0 ? t('waterShort', { n: d.water }) : '', d.meals > 0 ? t('mealsShort', { n: d.meals }) : ''].filter(Boolean);
      col.setAttribute('aria-label', dlabel(ok(function () { var p = d.iso.split('-'); return dayNum(new Date(+p[0], +p[1] - 1, +p[2])); })) + ': ' + (bits.length ? bits.join(', ') : t('nothingLogged')));
      col.appendChild(h('span', 'wd', wlabel(d.iso)));
      [['🧴', d.skin > 0], ['💧', d.water > 0], ['🍽️', d.meals > 0]].forEach(function (x) { var dot = h('span', 'dot' + (x[1] ? ' on' : ''), x[0]); dot.setAttribute('aria-hidden', 'true'); col.appendChild(dot); });
      g.appendChild(col);
    });
    c.appendChild(g); box.appendChild(c);
  }
  function dash(box, m) {
    hero(box, 'ov', m.allDone ? 'happy' : 'idle');
    var st = h('div', 'stats');
    st.appendChild(stat(t('today'), m.water.w + '/' + m.water.goal, t('statWater'), t('cups'), function () { tab('food'); }, 'st:water'));
    st.appendChild(stat(t('today'), m.skin.total ? m.skin.done + '/' + m.skin.total : t('dash'), t('statSkin'), m.skin.total ? t('steps') : t('noSteps'), function () { tab('skin'); }, 'st:skin'));
    st.appendChild(stat(t('thisWeek'), m.move.planned ? m.move.done + '/' + m.move.planned : t('dash'), t('statMove'), m.move.planned ? t('sessions') : (m.move.plans.length ? t('nPlans', { n: m.move.plans.length }) : t('noPlans')), function () { tab('move'); }, 'st:move'));
    box.appendChild(st);
    var cols = h('div', 'cols'), c = h('section', 'card'); c.appendChild(heading(t('upTitle'), t('upSub')));
    if (m.upcoming.length) m.upcoming.forEach(function (u) { c.appendChild(upcomingRow(u, m)); });
    else c.appendChild(empty(t('upDone')));
    cols.appendChild(c);
    var n2 = h('section', 'card soft'); n2.appendChild(heading(t('noteTitle'))); n2.appendChild(h('p', 'sub', t('noteText')));
    if (m.food.count) n2.appendChild(h('p', 'sub', t('foodToday', { k: m.food.kcal, g: m.food.goal })));
    cols.appendChild(n2); box.appendChild(cols);
    weekStrip(box, m); note(box);
  }

  // ---------- 运动 ----------
  function planCard(p) {
    var c = h('article', 'plan'), hd = h('div', 'plan-h'); hd.appendChild(h('b', 'plan-n', '🏅 ' + p.n));
    var lab = h('label', 'sel-w'), sel = document.createElement('select'); sel.className = 'health-space-select'; sel.setAttribute('data-fk', 'freq:' + p.i);
    lab.appendChild(h('span', 'vh', t('perWeekLabel', { n: p.n })));
    [1, 2, 3].forEach(function (k) { var o = document.createElement('option'); o.value = k; o.textContent = t('perWeek', { n: k }); sel.appendChild(o); });
    sel.value = p.w; sel.onchange = function () { S.fk = 'freq:' + p.i; setFreq(p.i, sel.value); }; lab.appendChild(sel); hd.appendChild(lab);
    var x = btn('icon', '×', function () { if (window.confirm(t('confirmDelPlan', { n: p.n }))) delPlan(p.i); }, t('delPlan', { n: p.n })); hd.appendChild(x); c.appendChild(hd);
    if (!p.metrics.length) c.appendChild(h('p', 'sub', t('noTargets')));
    p.metrics.forEach(function (m) {
      var r = h('div', 'metric'), txt = (m.k ? m.k + ' · ' : '') + (m.c ? t('now') + ' ' + m.c : '') + (m.g ? ' → ' + t('goal') + ' ' + m.g : '');
      r.appendChild(h('span', 'metric-t', txt));
      if (m.state === 'gap') r.appendChild(h('small', 'metric-s', t('toGo', { d: fmtSec(m.d), p: m.pct })));
      else if (m.state === 'met') r.appendChild(h('small', 'metric-s ok', t('metGoal')));
      c.appendChild(r);
    });
    return c;
  }
  function move(box, m) {
    var mv = m.move; hero(box, 'mv', mv.planned && mv.done === mv.planned ? 'happy' : 'idle');
    var st = h('div', 'stats');
    st.appendChild(stat(t('thisWeek'), mv.planned ? mv.done + '/' + mv.planned : t('dash'), t('statSessions'), mv.planned ? t('sessions') : t('noSessions')));
    st.appendChild(stat(t('tagPlans'), String(mv.plans.length || t('dash')), t('statPlans'), mv.plans.length ? '' : t('noPlans')));
    var nx = mv.next; st.appendChild(stat(t('next'), nx ? (nx.dn === mv.todayDn ? t('today') : dlabel(nx.dn)) : t('dash'), t('statNext'), nx ? tm(nx.s) + ' · ' + nx.t.replace(/^🏃\s*/, '') : t('noNext')));
    box.appendChild(st);
    var c = h('section', 'card'); c.appendChild(heading(t('sessTitle'), t('sessSub')));
    if (!mv.sessions.length) c.appendChild(empty(t('sessEmpty'), t('openPlanner'), function () { go('sp'); }));
    else mv.sessions.forEach(function (s) {
      var lb = h('label', 'chk'), cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = s.done; cb.setAttribute('data-fk', 'sess:' + s.key);
      cb.onchange = function () { S.fk = 'sess:' + s.key; toggleSession(s.key, cb.checked); };
      var tx = h('span', 'chk-t'); tx.appendChild(h('b', 'chk-n' + (s.done ? ' done' : ''), s.t.replace(/^🏃\s*/, ''))); tx.appendChild(h('small', 'row-m', (s.dn === mv.todayDn ? t('today') : dlabel(s.dn)) + ' · ' + tm(s.s) + '–' + tm(s.e)));
      lb.appendChild(cb); lb.appendChild(tx); c.appendChild(lb);
    });
    box.appendChild(c);
    var pc = h('section', 'card'); pc.appendChild(heading(t('plansTitle'), t('plansSub')));
    if (!mv.plans.length) pc.appendChild(empty(t('plansEmpty')));
    mv.plans.forEach(function (p) { pc.appendChild(planCard(p)); });
    var f = h('div', 'addrow'); var go1 = function () { var v = (S.vals.plan || '').trim(); S.fk = 'plan'; if (!v) { say(t('needPlanName')); render(); return; } S.vals.plan = ''; say(t('planAdded')); if (!addPlan(v)) { S.vals.plan = v; say(''); render(); } };
    var pi = input('plan', t('planPh'), t('planPh'), { max: 10 }); pi.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); go1(); } };
    f.appendChild(pi); f.appendChild(btn('btn', t('add'), go1)); pc.appendChild(f);
    pc.appendChild(h('p', 'sub', t('plansHint'))); box.appendChild(pc);
    live(box); classic(box, 'sp'); note(box);
  }

  // ---------- 护肤 ----------
  function skinCol(g, key, m) {
    var grp = m.skin[key], c = h('section', 'card'); c.appendChild(heading(t(key === 'am' ? 'morning' : 'evening'), t('skinProg', { a: grp.done, b: grp.total })));
    c.appendChild(bar(grp.pct, t(key === 'am' ? 'morning' : 'evening')));
    if (!grp.steps.length) c.appendChild(h('p', 'sub', t('noStepsGroup')));
    grp.steps.forEach(function (sp) {
      var r = h('div', 'step'), lb = h('label', 'chk'), cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = sp.done; cb.setAttribute('data-fk', 'step:' + key + ':' + sp.i);
      cb.onchange = function () { S.fk = 'step:' + key + ':' + sp.i; toggleStep(key, sp.i, cb.checked); };
      var tx = h('span', 'chk-t'); tx.appendChild(h('b', 'chk-n' + (sp.done ? ' done' : ''), sp.name)); tx.appendChild(h('small', 'row-m', t('stepN', { n: sp.i + 1 })));
      lb.appendChild(cb); lb.appendChild(tx); r.appendChild(lb);
      r.appendChild(btn('icon', '×', function () { S.fk = 'add:' + key; delStep(key, sp.i); }, t('delStep', { n: sp.name }))); c.appendChild(r);
    });
    var f = h('div', 'addrow'), go1 = function () { var v = (S.vals['add:' + key] || '').trim(); if (!v) return; S.vals['add:' + key] = ''; S.fk = 'add:' + key; if (!addStep(key, v)) { S.vals['add:' + key] = v; render(); } };
    var ii = input('add:' + key, t('stepPh'), t('stepPhFor', { g: t(key === 'am' ? 'morning' : 'evening') }), { max: 12 }); ii.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); go1(); } };
    f.appendChild(ii); f.appendChild(btn('btn', t('add'), go1)); c.appendChild(f); return c;
  }
  function skin(box, m) {
    hero(box, 'sk', m.skin.total && m.skin.done === m.skin.total ? 'happy' : 'idle');
    var st = h('div', 'stats');
    st.appendChild(stat(t('today'), m.skin.am.total ? m.skin.am.done + '/' + m.skin.am.total : t('dash'), t('morning'), t('steps')));
    st.appendChild(stat(t('today'), m.skin.pm.total ? m.skin.pm.done + '/' + m.skin.pm.total : t('dash'), t('evening'), t('steps')));
    st.appendChild(stat(t('rhythm'), m.skin.streak ? String(m.skin.streak) : t('dash'), t('statStreak'), m.skin.streak ? t('days') : t('noStreak')));
    box.appendChild(st);
    var cols = h('div', 'cols2'); cols.appendChild(skinCol(null, 'am', m)); cols.appendChild(skinCol(null, 'pm', m)); box.appendChild(cols);
    live(box); classic(box, 'bt'); note(box);
  }

  // ---------- 饮食与饮水 ----------
  function calc() { if (S.pick) { var g = +S.vals.grams || 100; S.vals.kcal = String(Math.round(S.pick.per * g / 100)); var k = SEC.querySelector('[data-fk="kcal"]'); if (k) k.value = S.vals.kcal; } }
  function search() {
    var q = (S.vals.food || '').trim(); if (!q) return;
    S.results = []; S.searching = true; S.smsg = t('searching'); render();
    if (ctl) ctl.abort(); ctl = new AbortController(); var my = ctl, tmo = setTimeout(function () { my.abort(); }, 8000);
    fetch('https://world.openfoodfacts.org/cgi/search.pl?search_simple=1&action=process&json=1&page_size=8&fields=product_name,brands,nutriments&search_terms=' + encodeURIComponent(q), { signal: my.signal })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        var list = []; (j.products || []).forEach(function (p) { var kc = p.nutriments && +p.nutriments['energy-kcal_100g']; if (!p.product_name || !(kc >= 0)) return; list.push({ name: String(p.product_name), kc: kc }); });
        S.results = list; S.smsg = list.length ? t('searchPick') : t('searchNone');
      })
      .catch(function () { S.smsg = t('searchFail'); })
      .then(function () { clearTimeout(tmo); S.searching = false; S.fk = 'food'; ok(refresh); });
  }
  function foodAdd() {
    var n = (S.vals.food || '').trim().slice(0, 30), k = Math.round(+S.vals.kcal);
    if (!n || !(k >= 0) || k > 5000) { say(t('needNameKcal')); S.fk = 'food'; render(); return; }
    var keep = { v: S.vals, r: S.results, p: S.pick, m: S.smsg };
    S.pick = null; S.results = []; S.smsg = ''; S.vals = { food: '', kcal: '', grams: '100' }; say(t('mealAdded')); S.fk = 'food';
    if (!addMeal(S.meal || defaultMeal(), n, k)) { S.vals = keep.v; S.results = keep.r; S.pick = keep.p; S.smsg = keep.m; say(''); render(); }
  }
  function food(box, m) {
    hero(box, 'fd', m.water.reached ? 'happy' : 'idle');
    var st = h('div', 'stats');
    st.appendChild(stat(t('today'), m.water.w + '/' + m.water.goal, t('statWater'), t('cups')));
    st.appendChild(stat(t('today'), String(m.food.count), t('statMeals'), m.food.count ? '' : t('noMeals')));
    st.appendChild(stat(t('today'), m.food.count ? m.food.kcal + '' : t('dash'), t('statKcal'), t('kcalOf', { g: m.food.goal })));
    box.appendChild(st);
    var cols = h('div', 'cols');
    // 水
    var w = h('section', 'card'); w.appendChild(heading(t('waterTitle'), t('waterSub'))); w.appendChild(bar(m.water.pct, t('statWater')));
    var cups = h('div', 'cups'); cups.setAttribute('role', 'group'); cups.setAttribute('aria-label', t('waterTitle'));
    for (var i = 1; i <= Math.min(30, Math.max(m.water.goal, m.water.w)); i++) (function (n) {
      var on = n <= m.water.w, b = h('button', 'cup' + (on ? ' on' : ''), on ? '💧' : '○'); b.type = 'button'; b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.setAttribute('aria-label', t('setCups', { n: n })); b.setAttribute('data-fk', 'cup:' + n);
      b.onclick = function () { S.fk = 'cup:' + n; cupSet(m.water.w === n ? n - 1 : n); }; cups.appendChild(b);
    })(i);
    w.appendChild(cups);
    var wa = h('div', 'actions'); var mi = btn('btn ghost', '−', function () { S.fk = 'w:minus'; cupDelta(-1); }, t('waterMinus')); mi.setAttribute('data-fk', 'w:minus');
    var pl = btn('btn', t('waterPlus'), function () { S.fk = 'w:plus'; cupDelta(1); }); pl.setAttribute('data-fk', 'w:plus'); wa.appendChild(mi); wa.appendChild(pl); w.appendChild(wa);
    cols.appendChild(w);
    // 今天吃了什么
    var f = h('section', 'card'); f.appendChild(heading(t('foodTitle'), t('foodSub'))); f.appendChild(bar(m.food.pct, t('statKcal')));
    if (m.food.over) f.appendChild(h('p', 'sub', t('overGentle')));
    if (!m.food.count) f.appendChild(h('p', 'sub', t('mealsEmpty')));
    m.food.meals.forEach(function (ml) {
      var r = h('div', 'step'), tx = h('div', 'row-t'); tx.appendChild(h('b', 'row-n', ml.n)); tx.appendChild(h('small', 'row-m', mealName(ml.t) + ' · ' + ml.k + ' kcal')); r.appendChild(tx);
      r.appendChild(btn('icon', '×', function () { S.fk = 'food'; delMeal(ml.i); }, t('delMeal', { n: ml.n }))); f.appendChild(r);
    });
    cols.appendChild(f); box.appendChild(cols);
    // 记录一餐
    var a = h('section', 'card'); a.appendChild(heading(t('logTitle'), t('logSub')));
    var chips = h('div', 'chips'); chips.setAttribute('role', 'group'); chips.setAttribute('aria-label', t('mealType'));
    var cur = S.meal || defaultMeal();
    MEALS.forEach(function (x) { var b = h('button', 'chip' + (cur === x[0] ? ' on' : ''), t(x[1])); b.type = 'button'; b.setAttribute('aria-pressed', cur === x[0] ? 'true' : 'false'); b.setAttribute('data-fk', 'meal:' + x[0]); b.onclick = function () { S.meal = x[0]; S.fk = 'meal:' + x[0]; render(); }; chips.appendChild(b); });
    a.appendChild(chips);
    var r1 = h('div', 'addrow'), fi = input('food', t('foodPh'), t('foodPh'), { max: 30 }); fi.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); search(); } };
    var sb = btn('btn ghost', t('search'), search); sb.disabled = S.searching; r1.appendChild(fi); r1.appendChild(sb); a.appendChild(r1);
    if (S.results.length) { var rs = h('div', 'chips'); S.results.forEach(function (p) { var b = h('button', 'chip', p.name.slice(0, 26) + ' · ' + Math.round(p.kc) + ' kcal/100g'); b.type = 'button'; b.onclick = function () { S.pick = { per: p.kc }; S.vals.food = p.name.slice(0, 30); S.vals.grams = '100'; calc(); S.fk = 'kcal'; render(); }; rs.appendChild(b); }); a.appendChild(rs); }
    if (S.smsg) { var sm = h('p', 'sub', S.smsg); sm.setAttribute('role', 'status'); a.appendChild(sm); }
    var r2 = h('div', 'addrow'); r2.appendChild(input('grams', t('gramsPh'), t('gramsPh'), { type: 'number', inputmode: 'numeric', min: 0, on: calc }));
    r2.appendChild(input('kcal', t('kcalPh'), t('kcalPh'), { type: 'number', inputmode: 'numeric', min: 0 })); r2.appendChild(btn('btn', t('add'), foodAdd)); a.appendChild(r2);
    a.appendChild(h('p', 'sub', t('offCredit'))); box.appendChild(a);
    // 目标
    var gl = h('section', 'card'); gl.appendChild(heading(t('goalsTitle'), t('goalsSub')));
    var gr = h('div', 'goalrow');
    [['gk', t('goalKcal'), 'kcal', m.food.goal, setGoalKcal, 500, 6000], ['gw', t('goalWater'), t('cups'), m.water.goal, setGoalWater, 1, 30]].forEach(function (g) {
      var lb = h('label', 'goal'), sp = h('span', 'goal-l', g[1]), i2 = document.createElement('input'); i2.className = 'health-space-input'; i2.type = 'number'; i2.inputMode = 'numeric'; i2.min = g[5]; i2.max = g[6]; i2.value = g[3]; i2.setAttribute('data-fk', g[0]);
      i2.onchange = function () { S.fk = g[0]; g[4](i2.value); }; lb.appendChild(sp); lb.appendChild(i2); lb.appendChild(h('small', 'row-m', g[2])); gr.appendChild(lb);
    });
    gl.appendChild(gr); box.appendChild(gl);
    live(box); classic(box, 'di'); note(box);
  }

  // ---------- 渲染 ----------
  function render() {
    var root = SEC.querySelector('.health-space-root');
    if (!root) { root = h('div', 'root'); SEC.appendChild(root); }
    var y = window.pageYOffset, fk = S.fk; S.fk = '';
    if (!fk) { var ae = document.activeElement; if (ae && root.contains(ae) && ae.getAttribute) fk = ae.getAttribute('data-fk') || ''; }
    var m = C.build(snapshot());
    root.textContent = '';
    if (!S.meal) S.meal = defaultMeal();
    tabs(root);
    if (S.tab === 'move') move(root, m); else if (S.tab === 'skin') skin(root, m); else if (S.tab === 'food') food(root, m); else dash(root, m);
    if (S.focusHead) { S.focusHead = false; var hh = root.querySelector('.health-space-h'); if (hh) hh.focus({ preventScroll: true }); }
    else if (fk) Array.prototype.some.call(root.querySelectorAll('[data-fk]'), function (e) { if (e.getAttribute('data-fk') === fk && !e.disabled) { e.focus({ preventScroll: true }); return true; } return false; });
    if (y) window.scrollTo(0, y);
  }
  function refresh() { if (visible()) render(); }

  // ---------- 接入现有页面：只“包装”，不改原函数 ----------
  ['rBt', 'rDi', 'rSp'].forEach(function (n) {
    var o = window[n]; if (typeof o !== 'function') return;
    window[n] = function () { var r = o.apply(this, arguments); ok(refresh); return r; };
  });
  var _sv = window.showView;
  if (typeof _sv === 'function') window.showView = function (v) { var r = _sv.apply(this, arguments); if (v === 'hs') { S.msg = ''; S.focusHead = true; S.meal = ''; render(); } return r; };
  window.HealthSpace = { refresh: refresh, go: tab, _state: function () { return JSON.parse(JSON.stringify(S)); } };
})();
