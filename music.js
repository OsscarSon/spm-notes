/* 读书音乐：全部用 WebAudio 现场合成（雨声、雷雨、海浪、篝火、风、Lo-fi 钢琴、像素小镇钢琴），不需要任何音频文件。
   自成一体：只读写 localStorage 键 spm-music，只添加自己的按钮和面板，不读不改网站的其他数据。 */
(function () {
  "use strict";
  try {
    var KEY = "spm-music";
    var DEF = { master: 0.8, rain: 0.55, thunder: 0, sea: 0, fire: 0, wind: 0, music: "lofi", mv: 0.55, drops: 1, tab: "mix", sp: "" };
    var st = {};
    try { st = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) {}
    Object.keys(DEF).forEach(function (k) { if (st[k] === undefined) st[k] = DEF[k]; });
    function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }

    var AC = window.AudioContext || window.webkitAudioContext;
    var ctx, master, comp, musicBus, verbIn, beds = {}, noiseB = {}, timer = null, playing = false, nextT = 0, step = 0, bar = 0, ambTick = null, sleepT = null, sleepEnd = 0;

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
      applyVol(true);
      return true;
    }
    function ramp(p, v, t) { try { p.cancelScheduledValues(ctx.currentTime); p.setTargetAtTime(v, ctx.currentTime, t || .25); } catch (e) { p.value = v; } }
    function applyVol(now) {
      if (!ctx) return;
      var t = now ? .01 : .25;
      ramp(beds.rain.gain, st.rain * .9, t); ramp(beds.sea.gain, st.sea * .9, t); ramp(beds.wind.gain, st.wind * .7, t); ramp(beds.fire.gain, st.fire * .6, t);
      ramp(beds.thunder.gain, 1, t); ramp(musicBus.gain, st.music === "off" ? 0 : st.mv * .9, t);
      if (playing) ramp(master.gain, st.master, .3);
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
    var nextThunder = 0;
    function ambient() { // 每 200ms 看一次，随机放雨滴 / 爆裂声 / 雷
      if (!playing || !ctx) return;
      var t = ctx.currentTime;
      if (st.drops && st.rain > .02 && Math.random() < .5 * st.rain) blip(t + Math.random() * .2, "rain");
      if (st.fire > .02 && Math.random() < .55 * st.fire) blip(t + Math.random() * .2, "fire");
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
        playing = true; applyVol(); ramp(master.gain, st.master, .6);
        if (!timer) timer = setInterval(sched, 120); if (!ambTick) ambTick = setInterval(ambient, 200);
        ui(); media();
      };
      var r = ctx.resume(); if (r && r.then) r.then(go, go); else go();
    }
    function pause() {
      if (!ctx) return; playing = false; ramp(master.gain, 0, .35);
      clearInterval(timer); timer = null; clearInterval(ambTick); ambTick = null; nextThunder = 0;
      setTimeout(function () { if (!playing && ctx && ctx.state === "running") ctx.suspend(); }, 1500);
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
      ".mz-fire{position:absolute;left:18px;bottom:8px;font-size:22px;opacity:0;transition:opacity .5s}.mz-scene.fire .mz-fire{opacity:.95;animation:mzFlick 1s infinite}@keyframes mzFlick{50%{transform:scale(1.12) rotate(-3deg)}}",
      ".mz-title{position:absolute;left:14px;top:10px;font-weight:700;font-size:15px;letter-spacing:.3px}.mz-title small{display:block;font-weight:500;opacity:.75;font-size:12px}",
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
      ".mz-row input[type=range]{width:100%;accent-color:var(--accent,#3b6fd8);height:22px;margin:0}",
      ".mz-foot{font-size:12px;color:var(--muted,#5d6b7c);display:flex;justify-content:space-between;gap:8px;align-items:center}",
      ".mz-tabs{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:4px;margin:12px 14px 0;border-radius:12px;background:var(--sheet2,#f1f4fb)}",
      ".mz-tabs button{border:0;border-radius:9px;padding:7px;font:inherit;font-weight:700;font-size:13.5px;background:none;color:var(--muted,#5d6b7c);cursor:pointer}.mz-tabs button.on{background:var(--sheet,#fff);color:var(--ink,#17263f);box-shadow:0 1px 4px rgba(0,0,0,.15)}",
      "#mzSp{display:none;padding:12px 14px 16px;gap:12px}#mzPanel.sp #mzSp{display:grid}#mzPanel.sp .mz-body{display:none}",
      ".mz-in{display:flex;gap:6px}.mz-in input{flex:1;min-width:0;border:1px solid var(--line,#d3dbe8);background:var(--sheet2,#f1f4fb);color:var(--ink,#17263f);border-radius:10px;padding:8px 10px;font:inherit;font-size:14px}",
      "#mzFrame iframe{width:100%;border:0;border-radius:14px;display:block}#mzFrame:empty{display:none}",
      ".mz-tip{font-size:12.5px;color:var(--muted,#5d6b7c);line-height:1.6}",
      "@media (prefers-reduced-motion:reduce){.mz-rain,.mz-dog *,.mz-note,.mz-zzz,.mz-fire,#btnMusic.on::after{animation:none!important}}",
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
    var SPP = [["🌿 Relax", "playlist/17oo9WFxyKDJNYpvuJDEBq"], ["🎧 Lofi Beats", "playlist/37i9dQZF1DWWQRwui0ExPn"], ["🎹 Peaceful Piano", "playlist/37i9dQZF1DX4sWSpwq3LiO"], ["🧠 Deep Focus", "playlist/37i9dQZF1DWZeKCadgRdKQ"], ["📚 Lofi 学习", "playlist/37i9dQZF1DX8Uebhn9wzrS"],
      ["⛏ Minecraft C418 经典", "playlist/1ZNIetyhnoL6lS5KeFYlrb"], ["⛏ Minecraft Ambient", "playlist/0qYcztUEKLdr4mbD2H7Sda"], ["⛏ Minecraft Sleep", "playlist/5PJyCOBxpD0HbDT7FM6t9L"]];
    var LAY = [["rain", "🌧 雨声"], ["thunder", "⛈ 雷声"], ["sea", "🌊 海浪"], ["fire", "🔥 篝火"], ["wind", "🍃 风声"]];
    var PRE = [
      ["🌧 雨夜书桌", { rain: .55, thunder: 0, sea: 0, fire: 0, wind: 0, music: "lofi" }],
      ["⛈ 雷雨", { rain: .7, thunder: .6, sea: 0, fire: 0, wind: .25, music: "off" }],
      ["🌊 海边", { rain: 0, thunder: 0, sea: .75, fire: 0, wind: .25, music: "off" }],
      ["🔥 篝火", { rain: .25, thunder: 0, sea: 0, fire: .7, wind: .15, music: "off" }],
      ["🎧 Lo-fi", { rain: 0, thunder: 0, sea: 0, fire: 0, wind: 0, music: "lofi" }],
      ["🎹 像素钢琴", { rain: 0, thunder: 0, sea: 0, fire: 0, wind: 0, music: "pixel" }]
    ];
    panel.innerHTML =
      '<div class="mz-scene" id="mzScene"><div class="mz-rain"></div><div class="mz-rain b"></div><span class="mz-fire">🔥</span>' +
      '<div class="mz-title">读书音乐<small>戴上耳机，小狗陪你</small></div><button class="mz-x" id="mzX" aria-label="关闭">✕</button>' +
      '<span class="mz-note">♪</span><span class="mz-note">♫</span><span class="mz-note">♪</span><span class="mz-zzz">z Z</span>' + DOG + '</div>' +
      '<div class="mz-tabs"><button data-t="mix">🎧 内置音乐</button><button data-t="sp">🎵 Spotify</button></div><div class="mz-body">' +
      '<div class="mz-main"><button id="mzPlay" aria-label="播放 / 暂停">▶</button><div class="mz-now"><span id="mzNow">点一下开始</span><small id="mzSub"></small></div></div>' +
      '<div><div class="mz-h">一键场景</div><div class="mz-chips" id="mzPre">' + PRE.map(function (p, i) { return '<button class="mz-chip" data-p="' + i + '">' + p[0] + '</button>'; }).join("") + '</div></div>' +
      '<div><div class="mz-h">音乐</div><div class="mz-chips" id="mzMus"><button class="mz-chip" data-m="lofi">Lo-fi 轻音乐</button><button class="mz-chip" data-m="pixel">像素小镇钢琴</button><button class="mz-chip" data-m="off">关</button></div></div>' +
      '<div><div class="mz-h">混音</div><div style="display:grid;gap:4px" id="mzSl"></div></div>' +
      '<div><div class="mz-h">睡眠定时</div><div class="mz-chips" id="mzSlp"><button class="mz-chip" data-s="0">不定时</button><button class="mz-chip" data-s="15">15 分</button><button class="mz-chip" data-s="30">30 分</button><button class="mz-chip" data-s="60">60 分</button><button class="mz-chip" data-s="90">90 分</button></div></div>' +
      '<div class="mz-foot"><label><input type="checkbox" id="mzDrops"> 雨滴细节</label><span>想听歌？切到 Spotify</span></div></div>' +
      '<div id="mzSp"><div><div class="mz-h">粘贴 Spotify 链接（歌单 / 专辑 / 歌曲 / 播客都可以）</div><div class="mz-in"><input id="mzUrl" type="url" inputmode="url" placeholder="https://open.spotify.com/playlist/…" autocomplete="off"><button class="mz-chip on" id="mzGo">载入</button></div></div>' +
      '<div><div class="mz-h">常用读书歌单</div><div class="mz-chips" id="mzSpPre">' + SPP.map(function (x, i) { return '<button class="mz-chip" data-sp="' + i + '">' + x[0] + '</button>'; }).join("") + '</div></div>' +
      '<div id="mzFrame"></div>' +
      '<div class="mz-tip"><b>怎么连接你的 Spotify：</b>想选别的歌：在 Spotify 里找到歌或歌单，点分享 → 复制链接，粘贴到上面的框就能载入。<br>登录：点下面的按钮，在新分页登录 Spotify，回到这里刷新播放器（先点别的歌单再点回来）就会用你的账号播放，Premium 可以完整播放，也能按播放器里的「+」把歌存进你的库。<br><button class="mz-chip" id="mzLogin" type="button" style="margin:6px 0 8px">🔑 登录 Spotify（新分页）</button><br>在「内置音乐」页把音乐关掉、只留雨声，可以一边听 Spotify 一边叠雨声（Spotify 的音量请在播放器里调）。免费账号只能试听片段；要完整播放，需要 Premium，并且在这个浏览器登录 Spotify。收起面板后歌会继续放，要停就在播放器里按暂停。</div></div>';
    document.body.appendChild(panel);
    var sl = panel.querySelector("#mzSl");
    sl.innerHTML = '<div class="mz-row"><span>🔊 总音量</span><input type="range" min="0" max="100" data-k="master"><output></output></div>' +
      '<div class="mz-row"><span>🎼 音乐</span><input type="range" min="0" max="100" data-k="mv"><output></output></div>' +
      LAY.map(function (l) { return '<div class="mz-row"><span>' + l[1] + '</span><input type="range" min="0" max="100" data-k="' + l[0] + '"><output></output></div>'; }).join("");

    function $(s) { return panel.querySelector(s); }
    function ui() {
      var b = document.getElementById("btnMusic"); if (b) b.classList.toggle("on", playing);
      $("#mzPlay").textContent = playing ? "❚❚" : "▶";
      var sc = $("#mzScene"); sc.classList.toggle("pl", playing); sc.classList.toggle("rain", st.rain > .02); sc.classList.toggle("fire", st.fire > .02);
      sc.style.setProperty("--r", st.rain); $("#mzDog").classList.toggle("pl", playing);
      var parts = []; LAY.forEach(function (l) { if (st[l[0]] > .02) parts.push(l[1].slice(2)); });
      if (st.music === "lofi") parts.push("Lo-fi"); if (st.music === "pixel") parts.push("像素钢琴");
      $("#mzNow").textContent = playing ? "播放中" : "已暂停";
      $("#mzSub").textContent = (parts.join(" + ") || "全部静音") + (sleepEnd ? " · 定时 " + Math.max(1, Math.round((sleepEnd - Date.now()) / 60000)) + " 分" : "");
      panel.querySelectorAll("[data-m]").forEach(function (e) { e.classList.toggle("on", e.dataset.m === st.music); });
      panel.querySelectorAll("#mzSl input").forEach(function (e) { var v = Math.round(st[e.dataset.k] * 100); e.value = v; e.nextElementSibling.textContent = v; });
      panel.querySelectorAll("[data-s]").forEach(function (e) { var m = +e.dataset.s; e.classList.toggle("on", sleepEnd ? false : m === 0); });
      $("#mzDrops").checked = !!st.drops;
    }
    panel.addEventListener("click", function (e) {
      var t = e.target.closest("button"); if (!t) return;
      if (t.id === "mzX") panel.classList.remove("open");
      else if (t.id === "mzPlay") toggle();
      else if (t.dataset.p !== undefined) { var p = PRE[+t.dataset.p][1]; Object.keys(p).forEach(function (k) { st[k] = p[k]; }); if (p.music !== "off" && st.mv < .2) st.mv = .55; save(); applyVol(); if (!playing) play(); ui(); }
      else if (t.dataset.m) { st.music = t.dataset.m; step = 0; save(); applyVol(); ui(); }
      else if (t.dataset.s !== undefined) { setSleep(+t.dataset.s); if (+t.dataset.s && !playing) play(); }
    });
    panel.addEventListener("input", function (e) {
      var r = e.target; if (r.id === "mzDrops") { st.drops = r.checked ? 1 : 0; save(); return; }
      if (!r.dataset.k) return; st[r.dataset.k] = r.value / 100; r.nextElementSibling.textContent = r.value; save(); applyVol();
      var sc = $("#mzScene"); sc.classList.toggle("rain", st.rain > .02); sc.classList.toggle("fire", st.fire > .02); sc.style.setProperty("--r", st.rain);
    });
    panel.addEventListener("change", function (e) { if (e.target.id === "mzDrops") { st.drops = e.target.checked ? 1 : 0; save(); } });
    document.addEventListener("click", function (e) { if (panel.classList.contains("open") && !panel.contains(e.target) && !e.target.closest("#btnMusic")) panel.classList.remove("open"); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") panel.classList.remove("open"); });
    setInterval(function () { if (sleepEnd && panel.classList.contains("open")) ui(); }, 20000);

    function spParse(v) {
      v = (v || "").trim(); var m = v.match(/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(?:embed\/)?(playlist|album|track|episode|show|artist)\/([A-Za-z0-9]{10,30})/) || v.match(/^spotify:(playlist|album|track|episode|show|artist):([A-Za-z0-9]{10,30})/);
      return m ? m[1] + "/" + m[2] : "";
    }
    function spLoad(path) {
      var box = $("#mzFrame"); if (!path) { box.innerHTML = ""; return; }
      var compact = /^(track|episode)/.test(path);
      if (box.dataset.p === path && box.firstChild) return;
      box.dataset.p = path;
      box.innerHTML = '<iframe src="https://open.spotify.com/embed/' + path + '?utm_source=generator" height="' + (compact ? 152 : 352) + '" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" title="Spotify"></iframe>';
      st.sp = path; save();
    }
    function setTab(t) { st.tab = t === "sp" ? "sp" : "mix"; panel.classList.toggle("sp", st.tab === "sp"); panel.querySelectorAll("[data-t]").forEach(function (b) { b.classList.toggle("on", b.dataset.t === st.tab); }); if (st.tab === "sp" && st.sp) spLoad(st.sp); save(); }
    panel.addEventListener("click", function (e) {
      var t = e.target.closest("button"); if (!t) return;
      if (t.dataset.t) setTab(t.dataset.t);
      else if (t.dataset.sp !== undefined) { var pa = SPP[+t.dataset.sp][1]; $("#mzUrl").value = "https://open.spotify.com/" + pa; spLoad(pa); }
      else if (t.id === "mzLogin") { window.open("https://accounts.spotify.com/login", "_blank", "noopener"); }
      else if (t.id === "mzGo") { var pp = spParse($("#mzUrl").value); if (!pp) { toastMsg("这不是 Spotify 链接，请从 Spotify 的「分享 → 复制链接」粘贴"); return; } spLoad(pp); }
    });
    $("#mzUrl").addEventListener("keydown", function (e) { if (e.key === "Enter") $("#mzGo").click(); });
    $("#mzUrl").addEventListener("paste", function () { setTimeout(function () { var pp = spParse($("#mzUrl").value); if (pp) spLoad(pp); }, 30); });
    if (st.sp) $("#mzUrl").value = "https://open.spotify.com/" + st.sp;
    setTab(st.tab);

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
    window.SPMMusic = { play: play, pause: pause, toggle: toggle, state: function () { return { playing: playing, st: st, ctx: ctx && ctx.state }; } };
  } catch (err) { try { console.warn("music.js", err); } catch (e) {} }
})();
