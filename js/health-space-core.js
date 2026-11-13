// Health Space · 纯函数聚合层（v9.9.1）。不碰 DOM / 本机存储 / 全局变量，Node 里也能跑。
// 输入是 health-space.js 从现有数据（BT / DI / SP / 本周课表里 a:2 的运动时段）拍下的只读快照；输出是界面要显示的数字和列表。
// 口径：只统计真实记录。没有数据就是“没有”，不编造总数、连续天数或成就。
(function (root) {
  'use strict';
  function n(v, d) { v = +v; return isFinite(v) ? v : (d || 0); }
  // 与 sport.js 的 sec() 同口径：m:ss 当 分:秒，h:mm:ss 当 时:分:秒，保证和旧运动页的“还差多少”一致。
  function parseT(v) {
    if (!v) return NaN;
    var p = String(v).split(':').map(Number);
    if (p.some(isNaN)) return NaN;
    return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p.length === 2 ? p[0] * 60 + p[1] : NaN;
  }
  function metric(m) {
    var c = parseT(m && m.c), g = parseT(m && m.g), o = { k: String((m && m.k) || ''), c: String((m && m.c) || ''), g: String((m && m.g) || ''), state: 'none', d: 0, pct: 0 };
    if (isNaN(c) || isNaN(g) || !(c > 0)) return o;
    var d = c - g; o.d = Math.max(0, d); o.pct = d > 0 ? Math.round(d / c * 1000) / 10 : 0; o.state = d > 0 ? 'gap' : 'met';
    return o;
  }
  function pct(a, b) { return b > 0 ? Math.max(0, Math.min(100, Math.round(a / b * 100))) : 0; }

  function skinGroup(names, doneIdx) {
    names = names || []; doneIdx = doneIdx || [];
    var steps = names.map(function (name, i) { return { i: i, name: String(name), done: doneIdx.indexOf(i) >= 0 }; });
    var done = steps.filter(function (s) { return s.done; }).length;
    return { steps: steps, total: steps.length, done: done, pct: pct(done, steps.length) };
  }

  function build(s) {
    s = s || {};
    var out = {};
    // ---- 饮水 ----
    var w = Math.max(0, n(s.water && s.water.w)), goal = Math.max(1, n(s.water && s.water.goal, 8));
    out.water = { w: w, goal: goal, pct: pct(w, goal), reached: w >= goal };

    // ---- 护肤 ----
    var bt = s.bt || {}, am = skinGroup(bt.am, bt.doneAm), pm = skinGroup(bt.pm, bt.donePm);
    out.skin = { am: am, pm: pm, total: am.total + pm.total, done: am.done + pm.done, pct: pct(am.done + pm.done, am.total + pm.total), streak: Math.max(0, n(bt.streak)) };

    // ---- 饮食 ----
    var di = s.food || {}, meals = (di.meals || []).map(function (m, i) { return { i: i, t: String(m.t || ''), n: String(m.n || ''), k: Math.max(0, n(m.k)) }; });
    var kcal = meals.reduce(function (a, m) { return a + m.k; }, 0), kgoal = Math.max(1, n(di.kcal, 2000));
    out.food = { kcal: kcal, goal: kgoal, pct: pct(kcal, kgoal), over: kcal > kgoal, meals: meals, count: meals.length };

    // ---- 最近 7 天（只用有记录的事实）----
    out.week = (s.days || []).map(function (d) {
      return { iso: d.iso, skin: n(d.skin), water: n(d.water), meals: n(d.meals), isToday: !!d.isToday };
    });

    // ---- 运动：计划（SP）+ 本周训练时段（课表里 a:2）----
    var plans = (s.sp || []).map(function (p, i) { return { i: i, n: String(p.n || ''), w: Math.max(1, Math.min(3, n(p.w, 2))), metrics: (p.m || []).map(metric).filter(function (m) { return m.k || m.c || m.g; }) }; });
    var todayDn = n(s.todayDn);
    var sessions = (s.sessions || []).map(function (x) { return { key: String(x.key), dn: n(x.dn), s: n(x.s), e: n(x.e), t: String(x.t || ''), done: !!x.done }; })
      .sort(function (a, b) { return a.dn - b.dn || a.s - b.s || (a.t < b.t ? -1 : a.t > b.t ? 1 : 0); });
    var next = null;
    for (var i = 0; i < sessions.length; i++) if (!sessions[i].done && sessions[i].dn >= todayDn) { next = sessions[i]; break; }
    out.move = { plans: plans, sessions: sessions, planned: sessions.length, done: sessions.filter(function (x) { return x.done; }).length, next: next, todayDn: todayDn };

    // ---- 总览“接下来”：只列真的还没做的事 ----
    var up = [], nowMin = n(s.nowMin);
    if (out.skin.total > 0 && out.skin.done < out.skin.total) {
      var g = (am.done < am.total && (nowMin < 15 * 60 || pm.done >= pm.total)) ? 'am' : 'pm';
      var grp = g === 'am' ? am : pm;
      if (grp.done < grp.total) up.push({ kind: 'skin', group: g, left: grp.total - grp.done });
    }
    if (next) up.push({ kind: 'move', session: next, today: next.dn === todayDn });
    if (!out.water.reached) up.push({ kind: 'water', w: w, goal: goal });
    if (out.food.count === 0) up.push({ kind: 'food' });
    out.upcoming = up.slice(0, 4);
    out.allDone = up.length === 0;
    return out;
  }
  root.HealthSpaceCore = { build: build, parseT: parseT, metric: metric };
})(typeof window !== 'undefined' ? window : this);
