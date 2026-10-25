/* 读书音乐：全部用 WebAudio 现场合成（雨声、雷雨、海浪、篝火、风、咖啡馆、风扇、白/粉红/棕噪音、夜晚虫鸣、Lo-fi 钢琴、像素小镇钢琴），不需要任何音频文件。
   还有 12 个一键场景和「专注计时」（番茄钟，换阶段有钟声，休息时音量自动调小）。
   自成一体：只读写 localStorage 键 spm-music，只添加自己的按钮和面板，不读不改网站的其他数据。 */
(function () {
  "use strict";
  try {
    var KEY = "spm-music";
    var DEF = { master: 0.8, rain: 0.55, thunder: 0, sea: 0, fire: 0, wind: 0, cafe: 0, fan: 0, white: 0, pink: 0, brown: 0, cricket: 0, music: "lofi", mv: 0.55, drops: 1, pf: 25 };
    var st = {};
    try { st = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) {}
    Object.keys(DEF).forEach(function (k) { if (st[k] === undefined) st[k] = DEF[k]; });
    function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }

    var AC = window.AudioContext || window.webkitAudioContext;
    var ctx, master, comp, musicBus, verbIn, beds = {}, noiseB = {}, timer = null, playing = false, nextT = 0, step = 0, bar = 0, ambTick = null, sleepT = null, sleepEnd = 0, pomo = null;

    /* ───────── 音频引擎 ───────── */
    function noise(kind) {
      if (noiseB[kind]) return noiseB[kind];
      var len = ctx.sampleRate * 4, b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0), i;
      if (kind === "white") for (i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      else if (kind === "pink") { var b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0; for (i = 0; i < len; i++) { var w = Math.random() * 2 - 1; b0 = .99886 * b0 + w * .0555179; b1 = .99332 * b1 + w * .0750759; b2 = .969 * b2 + w * .153852; b3 = .8665 * b3 + w * .3104856; b4 = .55 * b4 + w * .5329522; b5 = -.7616 * b5 - w * .016898; d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * .5362) * .11; b6 = w * .115926; } }
      else { var l = 0; for (i = 0; i < len; i++) { var x = Math.random() * 2 - 1; l = (l + .02 * x) / 1.02; d[i] = l * 3.5; } }
      return (noiseB[kind] = b);
    }
    function src(kind) { var s = ctx.createBufferSource(); s.buffer = noise(kind); s.loop = true; s.start(0, Math.random() * 3); return s; }
    function filt(type, f, q) { var n = ctx.createBiquadFilter(); n.type = type; n.frequency.value = f; if (q) n.Q.value = q; return n; }
    function gain(v) { var g = ctx.createGain(); g.gain.value = v; return g; }
    function lfo(rate, depth, target) { var o = ctx.createOscillator(), g = gain(depth); o.frequency.value = rate; o.connect(g); g.connect(target); o.start(); }

    function init() {
      if (ctx) return true;
      if (!AC) return false;
      ctx = new AC();
      comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3;
      master = gain(0); master.connect(comp); comp.connect(ctx.destination);
      // 混响
      var rl = ctx.sampleRate * 2.4, ir = ctx.createBuffer(2, rl, ctx.sampleRate);
      for (var c = 0; c < 2; c++) { var d = ir.getChannelData(c); for (var i = 0; i < rl; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / rl, 2.6); }
      var cv = ctx.createConvolver(); cv.buffer = ir; verbIn = gain(1); var wet = gain(.38); verbIn.connect(cv); cv.connect(wet); wet.connect(master);
      musicBus = gain(0); var lp = filt("lowpass", 3600); musicBus.connect(lp); lp.connect(master); lp.connect(verbIn);
      // 底噪床
      beds.rain = gain(0); var r1 = src("pink"), rh = filt("highpass", 700), rl2 = filt("lowpass", 8500); r1.connect(rh); rh.connect(rl2); rl2.connect(beds.rain); beds.rain.connect(master);
      var r2 = src("white"), rb = filt("bandpass", 4200, .6), rg = gain(.18); r2.connect(rb); rb.connect(rg); rg.connect(beds.rain);
      beds.sea = gain(0); var sm = gain(.55), s1 = src("brown"), sl = filt("lowpass", 650); s1.connect(sl); sl.connect(sm); sm.connect(beds.sea); lfo(.085, .42, sm.gain); beds.sea.connect(master);
      var s2 = src("pink"), sh = filt("bandpass", 1800, .5), sg = gain(.06); s2.connect(sh); sh.connect(sg); sg.connect(sm);
      beds.wind = gain(0); var w1 = src("pink"), wb = filt("bandpass", 520, .8); w1.connect(wb); wb.connect(beds.wind); lfo(.06, 260, wb.frequency); beds.wind.connect(master);
      beds.fire = gain(0); var f1 = src("brown"), fl = filt("lowpass", 800); f1.connect(fl); fl.connect(beds.fire); beds.fire.connect(master);
      beds.thunder = gain(0); beds.thunder.connect(master); beds.thunder.connect(verbIn);
      // 场所声与噪音：咖啡馆（人群低语，音量缓慢起伏；杯碟声由 ambient() 随机触发）、风扇 / 冷气、白 / 粉红 / 棕噪音、夜晚虫鸣（chirp() 触发）
      beds.cafe = gain(0); var c1 = src("pink"), cb1 = filt("bandpass", 420, .8), cg1 = gain(.5), c2 = src("pink"), cb2 = filt("bandpass", 1100, 1.2), cg2 = gain(.3), cvv = gain(.3);
      c1.connect(cb1); cb1.connect(cg1); cg1.connect(beds.cafe); c2.connect(cb2); cb2.connect(cg2); cg2.connect(beds.cafe);
      lfo(.11, .22, cg1.gain); lfo(.23, .14, cg2.gain); lfo(.37, 320, cb2.frequency);
      beds.cafe.connect(master); beds.cafe.connect(cvv); cvv.connect(verbIn);
      beds.fan = gain(0); var n1 = src("brown"), nl = filt("lowpass", 480), ng = gain(.9), fo = ctx.createOscillator(), fg = gain(.03);
      fo.type = "sine"; fo.frequency.value = 100; n1.connect(nl); nl.connect(ng); ng.connect(beds.fan); fo.connect(fg); fg.connect(beds.fan); fo.start(); lfo(.06, .012, fg.gain); beds.fan.connect(master);
      beds.white = gain(0); var wn = src("white"), wl = filt("lowpass", 9000), wg = gain(.2); wn.connect(wl); wl.connect(wg); wg.connect(beds.white); beds.white.connect(master);
      beds.pink = gain(0); var pn = src("pink"), pl = filt("lowpass", 7000), pg = gain(.6); pn.connect(pl); pl.connect(pg); pg.connect(beds.pink); beds.pink.connect(master);
      beds.brown = gain(0); var bn = src("brown"), bl = filt("lowpass", 1800), bg = gain(.8); bn.connect(bl); bl.connect(bg); bg.connect(beds.brown); beds.brown.connect(master);
      beds.cricket = gain(0); beds.cricket.connect(master);
      applyVol(true);
      return true;
    }
    function duck() { return pomo && pomo.phase === "rest" ? .45 : 1; } // 番茄钟休息时，整体音量调小
    function ramp(p, v, t) { try { p.cancelScheduledValues(ctx.currentTime); p.setTargetAtTime(v, ctx.currentTime, t || .25); } catch (e) { p.value = v; } }
    function applyVol(now) {
      if (!ctx) return;
      var t = now ? .01 : .25;
      ramp(beds.rain.gain, st.rain * .9, t); ramp(beds.sea.gain, st.sea * .9, t); ramp(beds.wind.gain, st.wind * .7, t); ramp(beds.fire.gain, st.fire * .6, t);
      ramp(beds.thunder.gain, 1, t); ramp(musicBus.gain, st.music === "off" ? 0 : st.mv * .9, t);
      ramp(beds.cafe.gain, st.cafe * .9, t); ramp(beds.fan.gain, st.fan * .9, t); ramp(beds.white.gain, st.white * .9, t); ramp(beds.pink.gain, st.pink * .9, t); ramp(beds.brown.gain, st.brown * .9, t); ramp(beds.cricket.gain, st.cricket * .9, t);
      if (playing) ramp(master.gain, st.master * duck(), .3);
    }
    function blip(when, kind) { // 雨滴 / 柴火爆裂
      var s = ctx.createBufferSource(); s.buffer = noise("white");
      var g = ctx.createGain(), f = filt(kind === "fire" ? "highpass" : "bandpass", kind === "fire" ? 1500 + Math.random() * 2500 : 2500 + Math.random() * 4500, kind === "fire" ? .7 : 9);
      var a = kind === "fire" ? .25 * st.fire * (Math.random() * .8 + .2) : .16 * st.rain * (Math.random() * .7 + .3), dur = kind === "fire" ? .02 + Math.random() * .03 : .012;
      g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(a, when + .003); g.gain.exponentialRampToValueAtTime(.0001, when + dur + .02);
      s.connect(f); f.connect(g); g.connect(master); s.start(when, Math.random() * 3, dur + .05);
    }
    function thunder(when) {
      var s = src("brown"), f = filt("lowpass", 160), g = ctx.createGain(), v = Math.min(1, st.thunder) * 1.6;
      f.frequency.setValueAtTime(260, when); f.frequency.exponentialRampToValueAtTime(70, when + 5);
      g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(v, when + 1.1); g.gain.exponentialRampToValueAtTime(.001, when + 6.5);
      s.connect(f); f.connect(g); g.connect(beds.thunder); setTimeout(function () { try { s.stop(); } catch (e) {} }, 7000);
    }
    function clink(when) { // 咖啡馆：偶尔的杯碟碰撞声
      var f = 1800 + Math.random() * 1600, a = .05 + Math.random() * .05;
      [[f, 1, a], [f * 2.76, 1, a * .6]].forEach(function (x, i) {
        var o = ctx.createOscillator(), g = ctx.createGain(), w = when + i * .03;
        o.type = i ? "sine" : "triangle"; o.frequency.value = x[0];
        g.gain.setValueAtTime(0, w); g.gain.linearRampToValueAtTime(x[2], w + .002); g.gain.exponentialRampToValueAtTime(.0001, w + .2);
        o.connect(g); g.connect(beds.cafe); o.start(w); o.stop(w + .25);
      });
    }
    function chirp(when, f) { // 夜晚虫鸣：3 到 5 声短促的高音
      var k = 3 + Math.floor(Math.random() * 3), j;
      for (j = 0; j < k; j++) {
        var o = ctx.createOscillator(), g = ctx.createGain(), w = when + j * .07;
        o.type = "sine"; o.frequency.value = f;
        g.gain.setValueAtTime(0, w); g.gain.linearRampToValueAtTime(.06, w + .004); g.gain.exponentialRampToValueAtTime(.0001, w + .04);
        o.connect(g); g.connect(beds.cricket); o.start(w); o.stop(w + .06);
      }
    }
    var nextThunder = 0;
    function ambient() { // 每 200ms 看一次，随机放雨滴 / 爆裂声 / 雷
      if (!playing || !ctx) return;
      var t = ctx.currentTime;
      if (st.drops && st.rain > .02 && Math.random() < .5 * st.rain) blip(t + Math.random() * .2, "rain");
      if (st.fire > .02 && Math.random() < .55 * st.fire) blip(t + Math.random() * .2, "fire");
      if (st.cafe > .02 && Math.random() < .03) clink(t + Math.random() * .2);
      if (st.cricket > .02) { if (Math.random() < .12) chirp(t + Math.random() * .15, 4150 + Math.random() * 350); if (Math.random() < .09) chirp(t + Math.random() * .15, 4550 + Math.random() * 350); }
      if (st.thunder > .02) { if (!nextThunder) nextThunder = t + 8 + Math.random() * 14; if (t > nextThunder) { thunder(t + .05); nextThunder = t + 16 + Math.random() * 30; } }
    }

    /* ───────── 音乐（现场作曲） ───────── */
    function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
    var PROG = [
      [[48, 55, 59, 64], [45, 52, 55, 60], [50, 57, 60, 65], [43, 50, 53, 59]], // Cmaj7 Am7 Dm7 G7
      [[53, 57, 60, 64], [52, 55, 59, 62], [50, 57, 60, 65], [48, 55, 59, 64]], // Fmaj7 Em7 Dm7 Cmaj7
      [[45, 52, 55, 60], [53, 57, 60, 64], [48, 55, 59, 64], [43, 50, 53, 59]]  // Am7 Fmaj7 Cmaj7 G7
    ];
    var PENTA = [60, 62, 64, 67, 69, 72, 74, 76, 79];
    function epiano(m, t, dur, vel, bus) {
      var o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), f = filt("lowpass", 2400);
      o.type = "sine"; o2.type = "triangle"; o.frequency.value = hz(m); o2.frequency.value = hz(m) * 2.003;
      var g2 = gain(.18); o2.connect(g2); g2.connect(g); o.connect(g); g.connect(f); f.connect(bus || musicBus);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + .006); g.gain.exponentialRampToValueAtTime(vel * .35, t + .25); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      o.start(t); o2.start(t); o.stop(t + dur + .1); o2.stop(t + dur + .1);
    }
    function bell(m, t, dur, vel) { // 像素小镇：柔和钢琴 + 长尾音
      var o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o2.type = "sine"; o.frequency.value = hz(m); o2.frequency.value = hz(m) * 2;
      var g2 = gain(.12); o2.connect(g2); g2.connect(g); o.connect(g); g.connect(musicBus);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + .012); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      o.start(t); o2.start(t); o.stop(t + dur + .1); o2.stop(t + dur + .1);
    }
    function kick(t) { var o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + .12); g.gain.setValueAtTime(.32, t); g.gain.exponentialRampToValueAtTime(.001, t + .22); o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + .25); }
    function hit(t, f, a, d, type) { var s = ctx.createBufferSource(); s.buffer = noise("white"); var fl = filt(type || "highpass", f, type ? 1.2 : 0), g = ctx.createGain(); g.gain.setValueAtTime(a, t); g.gain.exponentialRampToValueAtTime(.0001, t + d); s.connect(fl); fl.connect(g); g.connect(musicBus); s.start(t, Math.random() * 3, d + .05); }
    var curProg = PROG[0];
    function schedLofi(t, s, bpm) {
      var beat = 60 / bpm, e = beat / 2, sw = (s % 2) ? e * .16 : 0, tt = t + sw, ch = curProg[bar % 4];
      if (s === 0) { var tp = Math.random(); ch.forEach(function (m, i) { epiano(m + (i ? 12 : 0), tt + i * .018, 2.6, .075, null); }); epiano(ch[0] - 12, tt, 1.9, .12); }
      if (s === 3 && Math.random() < .7) ch.slice(1).forEach(function (m, i) { epiano(m + 12, tt + i * .02, 1.2, .045); });
      if (s === 4 && Math.random() < .6) epiano(ch[0] - 12 + 7, tt, 1.2, .09);
      if (s % 2 === 0 && Math.random() < .35) { var n = PENTA[Math.floor(Math.random() * PENTA.length)]; epiano(n, tt, 1.5, .06); }
      else if (s % 2 === 1 && Math.random() < .2) epiano(PENTA[Math.floor(Math.random() * PENTA.length)], tt, 1.1, .04);
      if (s === 0 || s === 5) kick(tt);
      if (s === 2 || s === 6) hit(tt, 1800, .09, .12, "bandpass");
      hit(tt, 7500, s % 2 ? .012 : .02, .04);
    }
    function schedPixel(t, s) {
      if (s % 2 === 0 && Math.random() < .42) { var n = PENTA[Math.floor(Math.random() * 6)] - (Math.random() < .3 ? 12 : 0); bell(n, t, 3.6, .1); }
      if (s === 0 && bar % 2 === 0) { var ch = curProg[(bar >> 1) % 4]; bell(ch[0], t, 6, .09); bell(ch[2] + 12, t + .05, 5, .06); }
    }
    function sched() {
      if (!playing || !ctx) return;
      var pix = st.music === "pixel", bpm = pix ? 52 : 74, e = 60 / bpm / 2;
      if (nextT < ctx.currentTime) nextT = ctx.currentTime + .05;
      while (nextT < ctx.currentTime + .5) {
        if (st.music !== "off") { if (pix) schedPixel(nextT, step); else schedLofi(nextT, step, bpm); }
        nextT += e; step++;
        if (step >= 8) { step = 0; bar++; if (bar % 4 === 0) curProg = PROG[Math.floor(Math.random() * PROG.length)]; }
      }
    }

    /* ───────── 播放控制 ───────── */
    function play() {
      if (!init()) { toastMsg("这个浏览器不支持音频"); return; }
      var go = function () {
        playing = true; applyVol(); ramp(master.gain, st.master * duck(), .6);
        if (!timer) timer = setInterval(sched, 120); if (!ambTick) ambTick = setInterval(ambient, 200);
        ui(); media();
      };
      var r = ctx.resume(); if (r && r.then) r.then(go, go); else go();
    }
    function pause() {
      if (!ctx) return; playing = false; ramp(master.gain, 0, .35);
      clearInterval(timer); timer = null; clearInterval(ambTick); ambTick = null; nextThunder = 0;
      setTimeout(function () { if (!playing && !pomo && ctx && ctx.state === "running") ctx.suspend(); }, 1500);
      setSleep(0); ui();
    }
    function toggle() { playing ? pause() : play(); }
    function setSleep(min) {
      clearTimeout(sleepT); sleepT = null; sleepEnd = 0;
      if (min > 0) { sleepEnd = Date.now() + min * 60000; sleepT = setTimeout(function () { pause(); }, min * 60000); }
      ui();
    }
    function media() {
      try {
        if (!("mediaSession" in navigator)) return;
        navigator.mediaSession.metadata = new MediaMetadata({ title: "读书音乐", artist: "SPM 考前助手" });
        navigator.mediaSession.setActionHandler("play", play); navigator.mediaSession.setActionHandler("pause", pause);
      } catch (e) {}
    }
    function toastMsg(t) { try { if (typeof toast === "function") toast(t); } catch (e) {} }

    /* ───────── 专注计时（番茄钟） ───────── */
    function chime(toRest) { // 轻轻的钟声：专注开始 = 上行三个音，休息 = 下行两个音；直接接到压缩器，所以音乐暂停时也听得到
      if (!ctx) return;
      try { if (ctx.state !== "running") ctx.resume(); } catch (e) {}
      var ns = toRest ? [84, 76] : [72, 79, 84], t0 = ctx.currentTime + .03;
      ns.forEach(function (m, i) {
        var o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), g2 = gain(.2), w = t0 + i * .3;
        o.type = "sine"; o2.type = "sine"; o.frequency.value = hz(m); o2.frequency.value = hz(m) * 2.01;
        o.connect(g); o2.connect(g2); g2.connect(g); g.connect(comp);
        g.gain.setValueAtTime(0, w); g.gain.linearRampToValueAtTime(.2, w + .01); g.gain.exponentialRampToValueAtTime(.0001, w + 1.8);
        o.start(w); o2.start(w); o.stop(w + 1.9); o2.stop(w + 1.9);
      });
    }
    function pomoRest() { return +st.pf === 50 ? 10 : 5; }
    function pomoUI() {
      var box = panel.querySelector("#mzPomo"); if (!box) return;
      var pill = $("#mzPill"), tm = $("#mzPTime"), sb = $("#mzPSub"), go = $("#mzPGo");
      if (pomo) {
        var s = Math.max(0, Math.round((pomo.end - Date.now()) / 1000)), txt = pad2(Math.floor(s / 60)) + ":" + pad2(s % 60), f = pomo.phase === "focus";
        tm.textContent = txt; sb.textContent = (f ? "专注中，加油" : "休息中，环境音已调小") + " · 已完成 " + pomo.n + " 轮";
        go.textContent = "结束"; go.classList.add("stop"); box.classList.add("run"); box.classList.toggle("rest", !f);
        pill.textContent = (f ? "🍅 " : "☕ ") + txt; pill.classList.add("on");
      } else {
        tm.textContent = pad2(+st.pf) + ":00"; sb.textContent = "专注 " + st.pf + " 分 → 休息 " + pomoRest() + " 分，循环";
        go.textContent = "开始"; go.classList.remove("stop"); box.classList.remove("run", "rest"); pill.classList.remove("on");
      }
      panel.querySelectorAll("[data-f]").forEach(function (e) { e.classList.toggle("on", +e.dataset.f === +st.pf); });
    }
    function pomoStart() {
      if (!init()) { toastMsg("这个浏览器不支持音频"); return; }
      try { ctx.resume(); } catch (e) {}
      pomo = { phase: "focus", end: Date.now() + (+st.pf) * 60000, n: 0 };
      chime(false);
      var any = ALLK.some(function (k) { return st[k] > .02; }) || st.music !== "off";
      if (!playing && any) play(); else applyVol();
      pomoUI();
    }
    function pomoStop() {
      pomo = null; applyVol(); pomoUI();
      setTimeout(function () { if (!playing && !pomo && ctx && ctx.state === "running") ctx.suspend(); }, 1500);
    }
    setInterval(function () {
      if (!pomo) return;
      if (Date.now() >= pomo.end) {
        var toRest = pomo.phase === "focus", rm = pomoRest();
        pomo = { phase: toRest ? "rest" : "focus", end: Date.now() + (toRest ? rm : +st.pf) * 60000, n: pomo.n + (toRest ? 1 : 0) };
        chime(toRest); applyVol(); toastMsg(toRest ? "专注完成，休息 " + rm + " 分钟 ☕" : "休息结束，开始下一轮专注 🍅");
      }
      pomoUI();
    }, 1000);

    /* ───────── 界面 ───────── */
    var css = document.createElement("style");
    css.textContent = [
      "#btnMusic{position:relative;flex:none;white-space:nowrap;padding-left:10px;padding-right:10px}",
      "#btnMusic.on::after{content:'';position:absolute;top:3px;right:3px;width:8px;height:8px;border-radius:50%;background:#3ccf91;box-shadow:0 0 0 0 rgba(60,207,145,.6);animation:mzPulse 1.8s infinite}",
      "@keyframes mzPulse{70%{box-shadow:0 0 0 7px rgba(60,207,145,0)}100%{box-shadow:0 0 0 0 rgba(60,207,145,0)}}",
      "#mzPanel{position:fixed;z-index:3000;right:12px;top:62px;width:min(348px,calc(100vw - 24px));max-height:calc(100vh - 78px);max-height:calc(100dvh - 78px);overflow:auto;border-radius:18px;background:var(--sheet,#fff);color:var(--ink,#17263f);border:1px solid var(--line,#d3dbe8);box-shadow:0 24px 60px -18px rgba(10,20,40,.5);display:none;-webkit-overflow-scrolling:touch}",
      "#mzPanel.open{display:block;animation:mzIn .18s ease-out}@keyframes mzIn{from{opacity:0;transform:translateY(-6px)}}",
      "#mzPanel *{box-sizing:border-box}",
      ".mz-scene{position:relative;height:150px;overflow:hidden;border-radius:18px 18px 0 0;background:linear-gradient(180deg,#25344f,#3b4d70);color:#eef3ff}",
      ".mz-scene.day{background:linear-gradient(180deg,#8fb4e8,#cfe2f7);color:#17263f}",
      ".mz-rain{position:absolute;inset:0;opacity:0;transition:opacity .6s;background-image:linear-gradient(105deg,transparent 46%,rgba(200,220,255,.55) 50%,transparent 54%);background-size:14px 40px;animation:mzRain .55s linear infinite}",
      ".mz-rain.b{background-size:23px 61px;animation-duration:.8s;opacity:0}",
      ".mz-scene.rain .mz-rain{opacity:calc(.25 + var(--r,0) * .5)}.mz-scene.rain .mz-rain.b{opacity:calc(.15 + var(--r,0) * .4)}",
      "@keyframes mzRain{to{background-position:-14px 40px}}",
            ".mz-title{position:absolute;left:14px;top:20px;font-weight:700;font-size:15px;letter-spacing:.3px}.mz-title small{display:block;font-weight:500;opacity:.75;font-size:12px}",
      ".mz-x{position:absolute;right:8px;top:8px;width:30px;height:30px;border-radius:50%;border:0;background:rgba(255,255,255,.16);color:inherit;font-size:15px;cursor:pointer}",
      ".mz-dog{position:absolute;right:18px;bottom:0;width:150px;height:121px;overflow:visible;color:#fff}.mz-scene.day .mz-dog{color:#17263f}",
      ".mz-dog *{vector-effect:non-scaling-stroke}",
      ".mz-dog .ln{fill:none;stroke:currentColor;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}",
      ".mz-dog .fl{fill:currentColor}.mz-dog .cup{fill:#ff8fb1;stroke:currentColor;stroke-width:2.5}",
      ".mz-dog .happy{display:none}.mz-dog.pl .happy{display:inline}.mz-dog.pl .open{display:none}",
      ".mz-dog .body{transform-origin:80px 118px;animation:mzBreath 3.6s ease-in-out infinite}",
      ".mz-dog .head{transform-origin:80px 74px}.mz-dog.pl .head{animation:mzNod .81s ease-in-out infinite}",
      ".mz-dog .tail{transform-origin:100px 108px}.mz-dog.pl .tail{animation:mzWag .5s ease-in-out infinite}",
      ".mz-dog .open{animation:mzBlink 4.6s infinite;transform-origin:80px 52px}",
      "@keyframes mzBreath{50%{transform:scaleY(1.025)}}@keyframes mzNod{50%{transform:rotate(4deg) translateY(2px)}}@keyframes mzWag{50%{transform:rotate(-22deg)}}@keyframes mzBlink{0%,94%,100%{transform:scaleY(1)}97%{transform:scaleY(.1)}}",
      ".mz-note{position:absolute;font-size:16px;opacity:0;color:inherit}.mz-scene.pl .mz-note{animation:mzNote 3s ease-in infinite}",
      ".mz-note:nth-of-type(1){left:48%;bottom:80px}.mz-note:nth-of-type(2){left:58%;bottom:90px;animation-delay:1s!important}.mz-note:nth-of-type(3){left:40%;bottom:84px;animation-delay:2s!important}",
      "@keyframes mzNote{0%{opacity:0;transform:translateY(0)}20%{opacity:.9}100%{opacity:0;transform:translateY(-46px) rotate(14deg)}}",
      ".mz-zzz{position:absolute;right:30px;bottom:92px;font:700 13px sans-serif;opacity:.7;animation:mzZ 2.4s ease-in-out infinite}.mz-scene.pl .mz-zzz{display:none}@keyframes mzZ{50%{transform:translateY(-6px);opacity:.3}}",
      ".mz-body{padding:12px 14px 16px;display:grid;gap:12px}",
      ".mz-main{display:flex;align-items:center;gap:12px}",
      "#mzPlay{flex:none;width:56px;height:56px;border-radius:50%;border:0;cursor:pointer;font-size:24px;background:var(--accent,#17263f);color:var(--sheet,#fff);box-shadow:0 8px 18px -8px rgba(0,0,0,.5);transition:transform .12s}#mzPlay:active{transform:scale(.93)}",
      ".mz-now{min-width:0;font-weight:700}.mz-now small{display:block;font-weight:500;color:var(--muted,#5d6b7c);font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
      ".mz-h{font-size:12px;font-weight:700;color:var(--muted,#5d6b7c);margin:0 0 6px;letter-spacing:.4px}",
      ".mz-chips{display:flex;flex-wrap:wrap;gap:6px}",
      ".mz-chip{border:1px solid var(--line,#d3dbe8);background:var(--sheet2,#f1f4fb);color:var(--ink,#17263f);border-radius:999px;padding:5px 11px;font:inherit;font-size:13px;cursor:pointer}.mz-chip.on{background:var(--accent,#17263f);color:var(--sheet,#fff);border-color:transparent}",
      ".mz-row{display:grid;grid-template-columns:62px 1fr 34px;align-items:center;gap:8px;font-size:13.5px}.mz-row output{font-size:12px;color:var(--muted,#5d6b7c);text-align:right}",
      ".mz-row input[type=range]{width:100%;accent-color:#8f7bff;height:22px;margin:0}",
      ".mz-foot{font-size:12px;color:var(--muted,#5d6b7c);display:flex;justify-content:space-between;gap:8px;align-items:center}",
      ".mz-scene{background:#26354f}.mz-bg{position:absolute;inset:0;width:100%;height:100%;display:block}",
      ".mz-scene>*:not(.mz-bg){z-index:2}.mz-rain{z-index:1!important}",
      ".mz-title{text-shadow:0 1px 6px rgba(0,0,0,.45);z-index:3}",
      ".mz-eq{display:inline-flex;gap:2px;align-items:flex-end;height:12px;margin-left:6px;vertical-align:-1px}.mz-eq b{width:3px;height:3px;border-radius:2px;background:#ffd66b;display:block}.mz-scene.pl .mz-eq b{animation:mzEq .9s ease-in-out infinite}.mz-eq b:nth-child(2){animation-delay:.2s!important}.mz-eq b:nth-child(3){animation-delay:.45s!important}.mz-eq b:nth-child(4){animation-delay:.1s!important}@keyframes mzEq{50%{height:12px}}",
      ".mz-bg .stars circle{animation:mzTw 3.2s ease-in-out infinite}@keyframes mzTw{50%{opacity:.25}}",
      ".mz-bg .gl{opacity:.28;animation:mzGl 2.6s ease-in-out infinite}.mz-scene.pl .gl{animation-duration:1.2s}@keyframes mzGl{50%{opacity:.6}}",
      ".mz-bg .clouds{opacity:0;transition:opacity .8s}.mz-bg .clouds ellipse{fill:#6a7da3}.mz-scene.rain .clouds,.mz-scene.thunder .clouds{opacity:calc(.35 + var(--r,0) * .5)}.mz-scene.thunder .clouds{opacity:.95}.mz-scene.thunder .clouds ellipse{fill:#4b5a7c}",
      ".mz-bg .cl{animation:mzDrift 14s ease-in-out infinite alternate}.mz-bg .cl.c2{animation-duration:18s;animation-direction:alternate-reverse}@keyframes mzDrift{to{transform:translateX(26px)}}",
      ".mz-scene.rain .moonshade,.mz-scene.thunder .moonshade{opacity:1}.mz-bg .moonshade{transition:fill .8s}.mz-scene.rain .stars,.mz-scene.thunder .stars{opacity:.25}.mz-bg .stars{transition:opacity .8s}",
      ".mz-bg .rips,.mz-bg .fire,.mz-bg .glowfire,.mz-bg .sea,.mz-bg .wind,.mz-bg .bolt,.mz-bg .flash{opacity:0;transition:opacity .7s}.mz-bg .bolt,.mz-bg .flash{transition:none}",
      ".mz-scene.rain .rips{opacity:.9}.mz-bg .rips ellipse{transform-box:fill-box;transform-origin:center;animation:mzRip 2.2s ease-out infinite;opacity:0}@keyframes mzRip{0%{transform:scale(.2);opacity:.8}100%{transform:scale(1.6);opacity:0}}",
      ".mz-scene.fire .fire,.mz-scene.fire .glowfire{opacity:1}.mz-bg .glowfire{animation:mzGlowP 2.2s ease-in-out infinite}@keyframes mzGlowP{50%{transform:scale(1.08)}}.mz-bg .glowfire{transform-origin:62px 128px}",
      ".mz-bg .fire path{transform-box:fill-box;transform-origin:50% 100%}.mz-bg .f1{animation:mzFl 1.1s ease-in-out infinite}.mz-bg .f2{animation:mzFl 0.8s ease-in-out infinite .2s}.mz-bg .f3{animation:mzFl .95s ease-in-out infinite .4s}.mz-bg .f4{animation:mzFl .7s ease-in-out infinite .1s}@keyframes mzFl{0%,100%{transform:scale(1,1) skewX(0)}30%{transform:scale(.92,1.1) skewX(4deg)}65%{transform:scale(1.05,.92) skewX(-4deg)}}",
      ".mz-bg .sp{animation:mzSp 1.8s ease-out infinite}.mz-bg .sp.s2{animation-delay:.6s}.mz-bg .sp.s3{animation-delay:1.1s}@keyframes mzSp{0%{transform:translate(0,0);opacity:1}100%{transform:translate(8px,-46px);opacity:0}}",
      ".mz-scene.sea .sea{opacity:1}.mz-bg .w1{animation:mzWv 5s linear infinite}.mz-bg .w2{animation:mzWv 8s linear infinite reverse}@keyframes mzWv{to{transform:translateX(-116px)}}",
      ".mz-scene.wind .wind{opacity:1}.mz-bg .wind path{fill:none;stroke:#fff;stroke-opacity:.32;stroke-width:1.6;stroke-linecap:round;stroke-dasharray:46 90;animation:mzDash 3.6s linear infinite}.mz-bg .wind path.b{animation-duration:5s;stroke-opacity:.22}@keyframes mzDash{to{stroke-dashoffset:-272}}",
      ".mz-bg .lf{animation:mzLf 7s linear infinite}.mz-bg .lf.l2{animation-duration:9s;animation-delay:-3s}.mz-bg .lf.l3{animation-duration:6s;animation-delay:-5s}@keyframes mzLf{0%{transform:translate(-14px,0) rotate(0)}25%{transform:translate(90px,-9px) rotate(90deg)}50%{transform:translate(180px,6px) rotate(180deg)}75%{transform:translate(262px,-8px) rotate(270deg)}100%{transform:translate(364px,2px) rotate(360deg)}}",
      ".mz-scene.thunder .bolt{animation:mzBolt 7s infinite}.mz-scene.thunder .flash{animation:mzFlash 7s infinite}@keyframes mzBolt{0%,2%,12%,100%{opacity:0}3%,6%{opacity:1}4.5%{opacity:.2}}@keyframes mzFlash{0%,2%,12%,100%{opacity:0}3%{opacity:.5}4.5%{opacity:.08}5.5%{opacity:.35}}",
      "#mzPlay{background:linear-gradient(135deg,#ff9fb8,#ffb86b)!important;color:#3a2230!important;box-shadow:0 10px 22px -8px rgba(255,140,120,.7)!important}.mz-scene.pl~.mz-body #mzPlay,.mz-scene.pl+.mz-body #mzPlay{animation:mzRing 2s infinite}@keyframes mzRing{0%{box-shadow:0 0 0 0 rgba(255,159,184,.55)}100%{box-shadow:0 0 0 14px rgba(255,159,184,0)}}",
      "#mzPre{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}",
      "#mzPre .mz-card{position:relative;overflow:hidden;isolation:isolate;display:flex;flex-direction:column;align-items:center;gap:1px;border-radius:16px;padding:10px 4px 8px;line-height:1.25;border:1px solid var(--line,#d3dbe8);background:var(--sheet2,#f1f4fb);color:var(--ink,#17263f);transition:transform .15s,box-shadow .25s}",
      "#mzPre .mz-card::before{content:'';position:absolute;inset:0;z-index:-1;background:linear-gradient(135deg,var(--c1),var(--c2));opacity:.16;transition:opacity .25s}",
      "#mzPre .mz-card i{font-style:normal;font-size:24px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.2));transition:transform .2s}",
      "#mzPre .mz-card b{font-size:12.5px;font-weight:700}#mzPre .mz-card small{font-size:10.5px;opacity:.7;white-space:nowrap}",
      "#mzPre .mz-card:active{transform:scale(.95)}",
      "#mzPre .mz-card.on{border-color:transparent;color:#fff;box-shadow:0 8px 18px -8px var(--c1)}#mzPre .mz-card.on::before{opacity:1}#mzPre .mz-card.on small{opacity:.92}#mzPre .mz-card.on b,#mzPre .mz-card.on small{text-shadow:0 1px 3px rgba(0,0,0,.35)}#mzPre .mz-card.on i{transform:scale(1.14)}",
      ".mz-scene.pl~.mz-body #mzPre .mz-card.on{animation:mzCardP 2.6s ease-in-out infinite}@keyframes mzCardP{50%{box-shadow:0 10px 24px -6px var(--c1)}}",
      "#mzPanel .mz-row{grid-template-columns:76px 1fr 30px}.mz-sub{font-size:11.5px;color:var(--muted,#5d6b7c);margin:8px 0 2px;opacity:.9}",
      ".mz-pomo{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:16px;border:1px solid var(--line,#d3dbe8);background:var(--sheet2,#f1f4fb);transition:background .4s}.mz-pomo .mz-pt{flex:1;min-width:0}.mz-pomo b{font-size:26px;font-variant-numeric:tabular-nums;letter-spacing:.5px}.mz-pomo small{display:block;font-size:12px;color:var(--muted,#5d6b7c)}",
      ".mz-pomo.run{border-color:transparent;background:linear-gradient(135deg,rgba(255,106,94,.22),rgba(255,184,107,.22))}.mz-pomo.run.rest{background:linear-gradient(135deg,rgba(60,207,145,.24),rgba(111,141,255,.22))}",
      "#mzPGo{padding:9px 18px;font-weight:700;border-radius:999px;border:0;cursor:pointer;color:#3a2230;background:linear-gradient(135deg,#ff9fb8,#ffb86b);box-shadow:0 8px 16px -8px rgba(255,140,120,.8)}#mzPGo.stop{background:var(--sheet,#fff);color:var(--ink,#17263f);border:1px solid var(--line,#d3dbe8);box-shadow:none}",
      ".mz-pill{position:absolute;left:14px;top:66px;display:none;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:700;background:rgba(0,0,0,.38);color:#fff;font-variant-numeric:tabular-nums}.mz-pill.on{display:block}",
      ".mz-bg .fireflies,.mz-bg .cafeg,.mz-bg .fang,.mz-bg .noisg{opacity:0;transition:opacity .7s}.mz-scene.cricket .fireflies,.mz-scene.cafe .cafeg,.mz-scene.fan .fang,.mz-scene.noise .noisg{opacity:1}",
      ".mz-bg .ff{animation:mzFly 5s ease-in-out infinite}@keyframes mzFly{0%{transform:translate(0,0);opacity:0}20%{opacity:1}50%{transform:translate(14px,-9px);opacity:.25}80%{opacity:1}100%{transform:translate(-6px,-20px);opacity:0}}",
      ".mz-bg .steam path{fill:none;stroke:#fff;stroke-linecap:round;stroke-width:2;transform-box:fill-box;transform-origin:50% 100%;animation:mzSteam 3.2s ease-out infinite;opacity:0}.mz-bg .steam path:nth-child(2){animation-delay:1s}.mz-bg .steam path:nth-child(3){animation-delay:2s}@keyframes mzSteam{0%{transform:translateY(4px) scaleX(.8);opacity:0}30%{opacity:.7}100%{transform:translateY(-22px) scaleX(1.3);opacity:0}}",
      ".mz-bg .fanspin{transform-box:fill-box;transform-origin:center;animation:mzSpin 1s linear infinite}@keyframes mzSpin{to{transform:rotate(360deg)}}",
      ".mz-bg .noisg circle{animation:mzTw 1.4s ease-in-out infinite}",
      ".mz-chip.on{background:linear-gradient(135deg,#6f8dff,#8f7bff);color:#fff}#mzMus .mz-chip,#mzSlp .mz-chip{padding:6px 11px}#mzSlp{gap:5px}",
      "#mzPanel{border-radius:22px}.mz-scene{border-radius:22px 22px 0 0}",
      "@media (prefers-reduced-motion:reduce){.mz-bg *,.mz-rain,.mz-dog *,.mz-note,.mz-zzz,.mz-fire,#btnMusic.on::after{animation:none!important}}",
      "@media print{#mzPanel,#btnMusic{display:none!important}}"
    ].join("\n");
    document.head.appendChild(css);

    var DOG = '<svg class="mz-dog" id="mzDog" viewBox="0 0 160 121" aria-hidden="true">' +
      '<path class="ln" opacity=".35" d="M20 119H140"/>' +
      '<g class="tail"><path class="ln" d="M101 108C120 108 128 94 121 84"/></g>' +
      '<g class="body"><path class="ln" d="M63 74C50 90 50 111 62 118L98 118C110 111 110 90 97 74"/><path class="ln" d="M72 100V118M88 100V118"/><path class="ln" d="M64 118h13M85 118h13"/></g>' +
      '<g class="head">' +
      '<path class="ln" d="M57 42C41 40 38 62 47 73C54 71 58 58 57 42ZM103 42C119 40 122 62 113 73C106 71 102 58 103 42Z"/>' +
      '<ellipse class="ln" cx="80" cy="54" rx="27" ry="23"/>' +
      '<g class="open"><circle class="fl" cx="70" cy="52" r="2.6"/><circle class="fl" cx="90" cy="52" r="2.6"/></g>' +
      '<g class="happy"><path class="ln" d="M65.5 53q4.5-6 9 0M85.5 53q4.5-6 9 0"/></g>' +
      '<ellipse class="fl" cx="80" cy="61" rx="4.4" ry="3.2"/><path class="ln" d="M80 64v3M73.5 67.5q6.5 5.5 13 0"/>' +
      '<path class="ln" d="M52 46C52 14 108 14 108 46" stroke-width="4"/><rect class="cup" x="44" y="38" width="12" height="20" rx="5"/><rect class="cup" x="104" y="38" width="12" height="20" rx="5"/>' +
      '</g></svg>';

    var panel = document.createElement("div");
    panel.id = "mzPanel"; panel.className = "no-print"; panel.setAttribute("role", "dialog"); panel.setAttribute("aria-label", "读书音乐");
    var LAY = [["rain", "🌧 雨声"], ["thunder", "⛈ 雷声"], ["sea", "🌊 海浪"], ["fire", "🔥 篝火"], ["wind", "🍃 风声"]];
    var LAY2 = [["cafe", "☕ 咖啡馆"], ["fan", "🌀 风扇"], ["white", "⚪ 白噪音"], ["pink", "🌸 粉红噪"], ["brown", "🟤 棕噪音"], ["cricket", "🦗 虫鸣"]];
    var ALLK = LAY.concat(LAY2).map(function (l) { return l[0]; });
    function nm(x) { return x.replace(/^\S+\s*/, ""); }
    function pad2(n) { return (n < 10 ? "0" : "") + n; }
    // [名字, 各声音音量, 副标题, 渐变色1, 渐变色2]；没写的声音都是 0
    var PRE = [
      ["🌧 雨夜书桌", { rain: .55, music: "lofi" }, "雨声 · Lo-fi", "#4f6bd8", "#7fa6f5"],
      ["⛈ 雷雨", { rain: .7, thunder: .6, wind: .25 }, "雨 · 雷 · 风", "#4b4f8f", "#8a6fd6"],
      ["🌊 海边", { sea: .75, wind: .25 }, "海浪 · 海风", "#2d8fbf", "#6fd0d8"],
      ["🔥 篝火", { rain: .25, fire: .7, wind: .15 }, "柴火噼啪", "#e8663a", "#ffb347"],
      ["☕ 咖啡馆", { cafe: .7, pink: .12 }, "人声 · 杯碟", "#a8683a", "#e0a572"],
      ["🌙 深夜书桌", { cricket: .55, brown: .3, wind: .1 }, "虫鸣 · 低频", "#2d3a78", "#6c7fd1"],
      ["🌀 风扇房", { fan: .65, pink: .2 }, "风扇嗡嗡", "#3f8a9c", "#9cd5d6"],
      ["⚪ 白噪音", { white: .5 }, "沙沙声", "#7d8ba3", "#c3cbd9"],
      ["🎯 专注", { pink: .45, brown: .2 }, "粉红 + 棕噪", "#d6537a", "#ff9a6b"],
      ["📚 图书馆", { fan: .25, pink: .15, music: "pixel" }, "空调 · 钢琴", "#5f8a4e", "#b8cf8a"],
      ["🎧 Lo-fi", { music: "lofi" }, "轻音乐", "#8f6bd8", "#d88fc7"],
      ["🎹 像素钢琴", { music: "pixel" }, "小镇钢琴", "#2fae7a", "#8fd9a8"]
    ];
    panel.innerHTML =
      '<div class="mz-scene" id="mzScene"><svg class="mz-bg" viewBox="0 0 348 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="mzSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#18233f"/><stop offset="1" stop-color="#40567f"/></linearGradient><linearGradient id="mzFl" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ff6a2b"/><stop offset="1" stop-color="#ffd86b"/></linearGradient><radialGradient id="mzGlow"><stop offset="0" stop-color="#ffb347" stop-opacity=".8"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient><linearGradient id="mzSea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a86b8"/><stop offset="1" stop-color="#15375c"/></linearGradient></defs><rect width="348" height="150" fill="url(#mzSky)"/><g class="stars" fill="#fff"><circle cx="20" cy="60" r="1.1" style="animation-delay:0.0s"/><circle cx="52" cy="92" r="0.8" style="animation-delay:1.1s"/><circle cx="96" cy="50" r="1" style="animation-delay:2.2s"/><circle cx="140" cy="76" r="0.8" style="animation-delay:0.6s"/><circle cx="210" cy="64" r="1" style="animation-delay:1.7s"/><circle cx="240" cy="44" r="0.8" style="animation-delay:2.8s"/><circle cx="286" cy="70" r="1" style="animation-delay:0.3s"/><circle cx="318" cy="48" r="0.8" style="animation-delay:1.4s"/><circle cx="24" cy="112" r="0.8" style="animation-delay:2.4s"/><circle cx="170" cy="100" r="0.7" style="animation-delay:0.9s"/></g><circle cx="188" cy="40" r="22" fill="#fff6c8" opacity=".12"/><circle cx="188" cy="40" r="11" fill="#fff3bf"/><circle cx="193" cy="37" r="10" fill="#2a3a5f" class="moonshade"/><g class="clouds"><g class="cl"><ellipse cx="118" cy="34" rx="30" ry="9"/><ellipse cx="140" cy="28" rx="22" ry="10"/><ellipse cx="100" cy="30" rx="16" ry="7"/></g><g class="cl c2"><ellipse cx="250" cy="46" rx="28" ry="8"/><ellipse cx="268" cy="41" rx="18" ry="9"/></g></g><path d="M-4 6Q87 34 174 8Q261 34 352 6" fill="none" stroke="#0d1426" stroke-opacity=".5" stroke-width="1.2"/><g class="bulbs"><circle class="gl" cx="41.3" cy="19.1" r="5.5" fill="#ffd66b" style="animation-delay:0.0s"/><circle cx="41.3" cy="19.1" r="2.4" fill="#ffd66b"/><circle class="gl" cx="86" cy="23.0" r="5.5" fill="#ff9fb8" style="animation-delay:0.4s"/><circle cx="86" cy="23.0" r="2.4" fill="#ff9fb8"/><circle class="gl" cx="130.3" cy="20.1" r="5.5" fill="#9fe3ff" style="animation-delay:0.7s"/><circle cx="130.3" cy="20.1" r="2.4" fill="#9fe3ff"/><circle class="gl" cx="174" cy="10.5" r="5.5" fill="#ffd66b" style="animation-delay:1.1s"/><circle cx="174" cy="10.5" r="2.4" fill="#ffd66b"/><circle class="gl" cx="217.8" cy="20.1" r="5.5" fill="#ff9fb8" style="animation-delay:1.5s"/><circle cx="217.8" cy="20.1" r="2.4" fill="#ff9fb8"/><circle class="gl" cx="262" cy="23.0" r="5.5" fill="#9fe3ff" style="animation-delay:1.9s"/><circle cx="262" cy="23.0" r="2.4" fill="#9fe3ff"/><circle class="gl" cx="306.8" cy="19.1" r="5.5" fill="#ffd66b" style="animation-delay:2.2s"/><circle cx="306.8" cy="19.1" r="2.4" fill="#ffd66b"/></g><g class="glowfire"><circle cx="62" cy="128" r="52" fill="url(#mzGlow)"/></g><rect y="132" width="348" height="18" fill="#0d1426" opacity=".28"/><ellipse cx="255" cy="146" rx="64" ry="6" fill="#ff8fb1" opacity=".3"/><g class="sea"><path class="w1" d="M0 124 q29 -8 58 0 t58 0 q29 -8 58 0 t58 0 q29 -8 58 0 t58 0 q29 -8 58 0 t58 0 q29 -8 58 0 t58 0 q29 -8 58 0 t58 0 L696 150 L0 150Z" fill="url(#mzSea)" opacity=".9"/><path class="w2" d="M0 134 q29 -8 58 0 t58 0 q29 -8 58 0 t58 0 q29 -8 58 0 t58 0 q29 -8 58 0 t58 0 q29 -8 58 0 t58 0 q29 -8 58 0 t58 0 L696 150 L0 150Z" fill="#2b6a9c" opacity=".75"/></g><g class="wind"><path d="M-20 62q20 -10 40 0t40 0t40 0t40 0t40 0t40 0t40 0t40 0t40 0" /><path d="M-20 88q20 8 40 0t40 0t40 0t40 0t40 0t40 0t40 0t40 0t40 0" class="b"/><ellipse class="lf" cx="0" cy="70" rx="4" ry="2.2" fill="#8fd18a"/><ellipse class="lf l2" cx="0" cy="96" rx="4" ry="2.2" fill="#f2b36b"/><ellipse class="lf l3" cx="0" cy="54" rx="3.4" ry="2" fill="#ffd0e0"/></g><g class="rips" fill="none" stroke="#bcd8ff" stroke-width="1"><ellipse cx="30" cy="140" rx="9" ry="2.4" style="animation-delay:0.0s"/><ellipse cx="95" cy="144" rx="9" ry="2.4" style="animation-delay:0.7s"/><ellipse cx="150" cy="139" rx="9" ry="2.4" style="animation-delay:1.3s"/><ellipse cx="205" cy="145" rx="9" ry="2.4" style="animation-delay:0.3s"/><ellipse cx="300" cy="141" rx="9" ry="2.4" style="animation-delay:1.0s"/><ellipse cx="330" cy="146" rx="9" ry="2.4" style="animation-delay:1.7s"/></g><g class="fire"><rect x="42" y="139" width="40" height="7" rx="3.5" fill="#5e3920" transform="rotate(-10 62 143)"/><rect x="42" y="139" width="40" height="7" rx="3.5" fill="#7a4a2a" transform="rotate(10 62 143)"/><path class="f1" d="M62 142C48 129 53 114 62 98C71 114 76 129 62 142Z" fill="url(#mzFl)"/><path class="f2" d="M51 142C44 134 47 125 52 117C58 125 60 134 51 142Z" fill="url(#mzFl)"/><path class="f3" d="M73 142C66 135 68 127 74 119C79 127 81 135 73 142Z" fill="url(#mzFl)"/><path class="f4" d="M62 142C57 135 59 127 62 119C65 127 67 135 62 142Z" fill="#fff4b0"/><circle class="sp" cx="58" cy="108" r="1.5" fill="#ffd27a"/><circle class="sp s2" cx="68" cy="106" r="1.2" fill="#ffd27a"/><circle class="sp s3" cx="63" cy="104" r="1.4" fill="#ffb347"/></g><g class="bolt"><polygon points="112,0 98,40 110,40 96,84 126,32 113,32 124,0" fill="#fff8d6"/></g><rect class="flash" width="348" height="150" fill="#eaf1ff"/><g class="fireflies"><g class="ff" style="animation-duration:4.0s;animation-delay:-0.0s"><circle cx="24" cy="96" r="4.5" fill="#d9ff7a" opacity=".25"/><circle cx="24" cy="96" r="1.7" fill="#eaff9a"/></g><g class="ff" style="animation-duration:4.9s;animation-delay:-0.7s"><circle cx="58" cy="118" r="4.5" fill="#d9ff7a" opacity=".25"/><circle cx="58" cy="118" r="1.7" fill="#eaff9a"/></g><g class="ff" style="animation-duration:5.8s;animation-delay:-1.4s"><circle cx="92" cy="84" r="4.5" fill="#d9ff7a" opacity=".25"/><circle cx="92" cy="84" r="1.7" fill="#eaff9a"/></g><g class="ff" style="animation-duration:6.7s;animation-delay:-2.1s"><circle cx="130" cy="112" r="4.5" fill="#d9ff7a" opacity=".25"/><circle cx="130" cy="112" r="1.7" fill="#eaff9a"/></g><g class="ff" style="animation-duration:4.0s;animation-delay:-2.8s"><circle cx="168" cy="92" r="4.5" fill="#d9ff7a" opacity=".25"/><circle cx="168" cy="92" r="1.7" fill="#eaff9a"/></g><g class="ff" style="animation-duration:4.9s;animation-delay:-3.5s"><circle cx="204" cy="120" r="4.5" fill="#d9ff7a" opacity=".25"/><circle cx="204" cy="120" r="1.7" fill="#eaff9a"/></g><g class="ff" style="animation-duration:5.8s;animation-delay:-4.2s"><circle cx="246" cy="88" r="4.5" fill="#d9ff7a" opacity=".25"/><circle cx="246" cy="88" r="1.7" fill="#eaff9a"/></g><g class="ff" style="animation-duration:6.7s;animation-delay:-4.9s"><circle cx="282" cy="110" r="4.5" fill="#d9ff7a" opacity=".25"/><circle cx="282" cy="110" r="1.7" fill="#eaff9a"/></g><g class="ff" style="animation-duration:4.0s;animation-delay:-0.6s"><circle cx="318" cy="96" r="4.5" fill="#d9ff7a" opacity=".25"/><circle cx="318" cy="96" r="1.7" fill="#eaff9a"/></g><g class="ff" style="animation-duration:4.9s;animation-delay:-1.3s"><circle cx="338" cy="124" r="4.5" fill="#d9ff7a" opacity=".25"/><circle cx="338" cy="124" r="1.7" fill="#eaff9a"/></g><g class="ff" style="animation-duration:5.8s;animation-delay:-2.0s"><circle cx="40" cy="70" r="4.5" fill="#d9ff7a" opacity=".25"/><circle cx="40" cy="70" r="1.7" fill="#eaff9a"/></g><g class="ff" style="animation-duration:6.7s;animation-delay:-2.7s"><circle cx="150" cy="70" r="4.5" fill="#d9ff7a" opacity=".25"/><circle cx="150" cy="70" r="1.7" fill="#eaff9a"/></g></g><g class="cafeg"><circle cx="128" cy="126" r="44" fill="url(#mzGlow)" opacity=".5"/><g class="steam"><path d="M122 120q-4 -6 0 -12t0 -10"/><path d="M129 120q-4 -6 0 -12t0 -10"/><path d="M136 120q-4 -6 0 -12t0 -10"/></g><path d="M118 124h24v10a8 8 0 0 1 -8 8h-8a8 8 0 0 1 -8 -8z" fill="#f4e4d0"/><path d="M142 127h4a4.5 4.5 0 0 1 0 9h-4" fill="none" stroke="#f4e4d0" stroke-width="2.4"/><ellipse cx="130" cy="124" rx="12" ry="2.4" fill="#7a4a2a"/></g><g class="fang"><g transform="translate(300 42)"><circle r="15" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="1.5"/><g class="fanspin"><ellipse cx="0" cy="-8" rx="4.2" ry="8" fill="#fff" opacity=".55"/><ellipse cx="0" cy="-8" rx="4.2" ry="8" fill="#fff" opacity=".55" transform="rotate(120)"/><ellipse cx="0" cy="-8" rx="4.2" ry="8" fill="#fff" opacity=".55" transform="rotate(240)"/></g><circle r="2.6" fill="#fff"/></g></g><g class="noisg"><circle cx="14" cy="100" r="1" fill="#cfd8ea" style="animation-delay:-0.0s;animation-duration:1.0s"/><circle cx="36" cy="128" r="1" fill="#cfd8ea" style="animation-delay:-0.4s;animation-duration:1.4s"/><circle cx="70" cy="90" r="1" fill="#cfd8ea" style="animation-delay:-0.7s;animation-duration:1.7s"/><circle cx="110" cy="126" r="1" fill="#cfd8ea" style="animation-delay:-1.1s;animation-duration:2.0s"/><circle cx="150" cy="104" r="1" fill="#cfd8ea" style="animation-delay:-0.1s;animation-duration:1.0s"/><circle cx="190" cy="134" r="1" fill="#cfd8ea" style="animation-delay:-0.5s;animation-duration:1.4s"/><circle cx="226" cy="98" r="1" fill="#cfd8ea" style="animation-delay:-0.8s;animation-duration:1.7s"/><circle cx="262" cy="126" r="1" fill="#cfd8ea" style="animation-delay:-1.2s;animation-duration:2.0s"/><circle cx="300" cy="92" r="1" fill="#cfd8ea" style="animation-delay:-0.2s;animation-duration:1.0s"/><circle cx="330" cy="120" r="1" fill="#cfd8ea" style="animation-delay:-0.5s;animation-duration:1.4s"/><circle cx="8" cy="130" r="1" fill="#cfd8ea" style="animation-delay:-0.9s;animation-duration:1.7s"/><circle cx="176" cy="70" r="1" fill="#cfd8ea" style="animation-delay:-1.3s;animation-duration:2.0s"/><circle cx="244" cy="70" r="1" fill="#cfd8ea" style="animation-delay:-0.2s;animation-duration:1.0s"/><circle cx="320" cy="66" r="1" fill="#cfd8ea" style="animation-delay:-0.6s;animation-duration:1.4s"/><circle cx="60" cy="66" r="1" fill="#cfd8ea" style="animation-delay:-1.0s;animation-duration:1.7s"/><circle cx="130" cy="84" r="1" fill="#cfd8ea" style="animation-delay:-1.4s;animation-duration:2.0s"/></g></svg><div class="mz-rain"></div><div class="mz-rain b"></div>' +
      '<div class="mz-title">读书音乐 <i class="mz-eq"><b></b><b></b><b></b><b></b></i><small>戴上耳机，小狗陪你</small></div><span class="mz-pill" id="mzPill"></span><button class="mz-x" id="mzX" aria-label="关闭">✕</button>' +
      '<span class="mz-note">♪</span><span class="mz-note">♫</span><span class="mz-note">♪</span><span class="mz-zzz">z Z</span>' + DOG + '</div>' +
      '<div class="mz-body">' +
      '<div class="mz-main"><button id="mzPlay" aria-label="播放 / 暂停">▶</button><div class="mz-now"><span id="mzNow">点一下开始</span><small id="mzSub"></small></div></div>' +
      '<div><div class="mz-h">一键场景</div><div class="mz-chips" id="mzPre">' + PRE.map(function (p, i) { var sp = p[0].indexOf(" "); return '<button class="mz-chip mz-card" data-p="' + i + '" style="--c1:' + p[3] + ';--c2:' + p[4] + '"><i>' + p[0].slice(0, sp) + '</i><b>' + p[0].slice(sp + 1) + '</b><small>' + p[2] + '</small></button>'; }).join("") + '</div></div>' +
      '<div><div class="mz-h">音乐</div><div class="mz-chips" id="mzMus"><button class="mz-chip" data-m="lofi">Lo-fi 轻音乐</button><button class="mz-chip" data-m="pixel">像素小镇钢琴</button><button class="mz-chip" data-m="off">关</button></div></div>' +
      '<div><div class="mz-h">混音</div><div style="display:grid;gap:4px" id="mzSl"></div></div>' +
      '<div><div class="mz-h">🍅 专注计时</div><div class="mz-pomo" id="mzPomo"><div class="mz-pt"><b id="mzPTime">25:00</b><small id="mzPSub"></small></div><button id="mzPGo" type="button">开始</button></div><div class="mz-chips" id="mzPF" style="margin-top:8px"><button class="mz-chip" data-f="25">25 + 5 分</button><button class="mz-chip" data-f="50">50 + 10 分</button></div></div>' +
      '<div><div class="mz-h">睡眠定时</div><div class="mz-chips" id="mzSlp"><button class="mz-chip" data-s="0">不定时</button><button class="mz-chip" data-s="15">15分</button><button class="mz-chip" data-s="30">30分</button><button class="mz-chip" data-s="60">60分</button><button class="mz-chip" data-s="90">90分</button></div></div>' +
      '<div class="mz-foot"><label><input type="checkbox" id="mzDrops"> 雨滴细节</label></div></div>';
    document.body.appendChild(panel);
    var sl = panel.querySelector("#mzSl");
    sl.innerHTML = '<div class="mz-row"><span>🔊 总音量</span><input type="range" min="0" max="100" data-k="master"><output></output></div>' +
      '<div class="mz-row"><span>🎼 音乐</span><input type="range" min="0" max="100" data-k="mv"><output></output></div>' +
      '<div class="mz-sub">🌿 自然</div>' + LAY.map(function (l) { return '<div class="mz-row"><span>' + l[1] + '</span><input type="range" min="0" max="100" data-k="' + l[0] + '"><output></output></div>'; }).join("") +
      '<div class="mz-sub">📚 场所与噪音</div>' + LAY2.map(function (l) { return '<div class="mz-row"><span>' + l[1] + '</span><input type="range" min="0" max="100" data-k="' + l[0] + '"><output></output></div>'; }).join("");

    function $(s) { return panel.querySelector(s); }
    function sceneUpd() { var sc = $("#mzScene"); sc.classList.toggle("pl", playing); ["rain", "fire", "sea", "wind", "thunder", "cafe", "fan", "cricket"].forEach(function (k) { sc.classList.toggle(k, st[k] > .02); }); sc.classList.toggle("noise", st.white > .02 || st.pink > .02 || st.brown > .02); sc.style.setProperty("--r", st.rain); }
    function ui() {
      var b = document.getElementById("btnMusic"); if (b) b.classList.toggle("on", playing);
      $("#mzPlay").textContent = playing ? "❚❚" : "▶";
      sceneUpd(); $("#mzDog").classList.toggle("pl", playing);
      panel.querySelectorAll("[data-p]").forEach(function (b) { var q = PRE[+b.dataset.p][1]; b.classList.toggle("on", ALLK.every(function (k) { return Math.abs(st[k] - (q[k] || 0)) < .03; }) && st.music === (q.music || "off")); });
      var parts = []; LAY.concat(LAY2).forEach(function (l) { if (st[l[0]] > .02) parts.push(nm(l[1])); });
      if (st.music === "lofi") parts.push("Lo-fi"); if (st.music === "pixel") parts.push("像素钢琴");
      $("#mzNow").textContent = playing ? "播放中" : "已暂停";
      $("#mzSub").textContent = (parts.join(" + ") || "全部静音") + (sleepEnd ? " · 定时 " + Math.max(1, Math.round((sleepEnd - Date.now()) / 60000)) + " 分" : "");
      panel.querySelectorAll("[data-m]").forEach(function (e) { e.classList.toggle("on", e.dataset.m === st.music); });
      panel.querySelectorAll("#mzSl input").forEach(function (e) { var v = Math.round(st[e.dataset.k] * 100); e.value = v; e.nextElementSibling.textContent = v; });
      panel.querySelectorAll("[data-s]").forEach(function (e) { var m = +e.dataset.s; e.classList.toggle("on", sleepEnd ? false : m === 0); });
      $("#mzDrops").checked = !!st.drops;
      pomoUI();
    }
    panel.addEventListener("click", function (e) {
      var t = e.target.closest("button"); if (!t) return;
      if (t.id === "mzX") panel.classList.remove("open");
      else if (t.id === "mzPlay") toggle();
      else if (t.dataset.p !== undefined) { var p = PRE[+t.dataset.p][1]; ALLK.forEach(function (k) { st[k] = p[k] || 0; }); st.music = p.music || "off"; if (st.music !== "off" && st.mv < .2) st.mv = .55; step = 0; save(); applyVol(); if (!playing) play(); ui(); }
      else if (t.id === "mzPGo") { pomo ? pomoStop() : pomoStart(); }
      else if (t.dataset.f) { st.pf = +t.dataset.f; save(); pomoUI(); }
      else if (t.dataset.m) { st.music = t.dataset.m; step = 0; save(); applyVol(); ui(); }
      else if (t.dataset.s !== undefined) { setSleep(+t.dataset.s); if (+t.dataset.s && !playing) play(); }
    });
    panel.addEventListener("input", function (e) {
      var r = e.target; if (r.id === "mzDrops") { st.drops = r.checked ? 1 : 0; save(); return; }
      if (!r.dataset.k) return; st[r.dataset.k] = r.value / 100; r.nextElementSibling.textContent = r.value; save(); applyVol();
      sceneUpd(); ui();
    });
    panel.addEventListener("change", function (e) { if (e.target.id === "mzDrops") { st.drops = e.target.checked ? 1 : 0; save(); } });
    document.addEventListener("click", function (e) { if (panel.classList.contains("open") && !panel.contains(e.target) && !e.target.closest("#btnMusic")) panel.classList.remove("open"); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") panel.classList.remove("open"); });
    setInterval(function () { if (sleepEnd && panel.classList.contains("open")) ui(); }, 20000);

    function mountBtn() {
      if (document.getElementById("btnMusic")) return;
      var b = document.createElement("button"); b.className = "btn line no-print"; b.id = "btnMusic"; b.type = "button"; b.title = "读书音乐"; b.setAttribute("aria-label", "读书音乐"); b.textContent = "🎧";
      var anchor = document.getElementById("btnBell") || document.getElementById("btnSet");
      if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(b, anchor);
      else { b.style.cssText = "position:fixed;right:12px;top:12px;z-index:3000"; document.body.appendChild(b); }
      b.addEventListener("click", function (e) { e.stopPropagation(); panel.classList.toggle("open"); ui(); });
      ui();
    }
    mountBtn();
    window.SPMMusic = { play: play, pause: pause, toggle: toggle, pomoStart: pomoStart, pomoStop: pomoStop, state: function () { return { playing: playing, st: st, ctx: ctx && ctx.state }; } };
  } catch (err) { try { console.warn("music.js", err); } catch (e) {} }
})();
