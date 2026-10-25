/* 学习环境音：Tone.js（MIT）。用程序现场合成咖啡馆底噪、风扇 / 冷气、白 / 粉红 / 棕色噪音、夜晚虫鸣，
   不用下载任何音频文件，也没有版权问题。可以混音、设睡眠定时，还有「专注 25 分钟 + 休息 5 分钟」的番茄钟场景。
   和顶部的「读书音乐」(music.js) 是两套独立的声音，可以同时开，各调各的音量。
   声音库在展开卡片时才从 CDN 下载；状态存在 window.__amb，切换科目或收起卡片，声音不会中断。 */
(function(){
const LIB="https://cdn.jsdelivr.net/npm/tone@14.8.49/build/Tone.js";
const KEY="spm-amb-v1";
const LAYERS=[
 {id:"cafe",ico:"☕",n:"咖啡馆",d:"远处的低语和偶尔的杯碟声"},
 {id:"fan",ico:"🌀",n:"风扇 / 冷气",d:"稳定的低频嗡嗡声"},
 {id:"white",ico:"⚪",n:"白噪音",d:"沙沙声，盖住周围杂音"},
 {id:"pink",ico:"🌸",n:"粉红噪音",d:"比白噪音柔和，像远处的瀑布"},
 {id:"brown",ico:"🟤",n:"棕色噪音",d:"低沉的轰隆声，像大风"},
 {id:"cricket",ico:"🦗",n:"夜晚虫鸣",d:"安静的夜晚"}
];
const SCENES=[["☕ 咖啡馆",{cafe:70,pink:15}],["🌙 深夜书桌",{cricket:55,brown:30}],["🌀 风扇房",{fan:65,pink:20}],["⚪ 纯白噪音",{white:50}],["🎯 专注",{pink:45,brown:20}]];
const CSS=`.lab-amb .am-row{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:8px 0}
.lab-amb .am-chip{border:1px solid var(--line);border-radius:999px;padding:3px 12px;font-size:12.5px;background:var(--sheet2)}
.lab-amb .am-chip.on{background:var(--blue-soft);border-color:var(--blue);font-weight:700}
.lab-amb .am-l{display:flex;gap:10px;align-items:center;margin:6px 0}
.lab-amb .am-i{font-size:20px;width:26px;text-align:center}
.lab-amb .am-m{flex:1;min-width:0}.lab-amb .am-n{font-size:13.5px}
.lab-amb input[type=range]{width:100%}
.lab-amb .am-msg{font-size:13px;min-height:20px;color:var(--muted)}.lab-amb .am-msg.bad{color:var(--bad)}
.lab-amb hr{border:0;border-top:1px dashed var(--line);margin:12px 0}
.lab-amb .am-pt{font-variant-numeric:tabular-nums;font-weight:700}`;
const ST=window.__amb||(window.__amb={vol:{},master:80,playing:false,fading:false,pomo:null,sleepT:0,sleepMin:0,eng:null,timers:[],cur:null,loaded:false,tick:0});
if(!ST.loaded){ST.loaded=true;try{const s=JSON.parse(localStorage.getItem(KEY)||"null");if(s){ST.vol=s.vol||{};ST.master=s.master||80}}catch(e){}}
const keep=()=>{try{localStorage.setItem(KEY,JSON.stringify({vol:ST.vol,master:ST.master}))}catch(e){}};
const q=s=>ST.cur&&ST.cur.isConnected?ST.cur.querySelector(s):null;
const say=(t,bad)=>{const m=q(".am-msg");if(m){m.className="am-msg"+(bad?" bad":"");m.textContent=t||""}};
const mmss=ms=>{const s=Math.max(0,Math.round(ms/1000));return String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0")};

/* ---------- 声音引擎（全部程序合成） ---------- */
function build(){
  const t=window.Tone,master=new t.Gain(0).toDestination(),L={},mk=()=>new t.Gain(0).connect(master);
  const noise=(id,type,vol,cut)=>{const o=mk(),n=new t.Noise(type),f=new t.Filter(cut,"lowpass");n.volume.value=vol;n.connect(f);f.connect(o);n.start();L[id]={out:o}};
  noise("white","white",-16,9000);noise("pink","pink",-10,7000);noise("brown","brown",-4,1800);
  { // 咖啡馆：两段带通粉红噪音，音量缓慢起伏，像人群的低语
    const o=mk(),p=new t.Noise("pink"),b1=new t.Filter({type:"bandpass",frequency:420,Q:.8}),b2=new t.Filter({type:"bandpass",frequency:1100,Q:1.2}),g1=new t.Gain(.5),g2=new t.Gain(.3);
    p.volume.value=-4;p.connect(b1);b1.connect(g1);g1.connect(o);p.connect(b2);b2.connect(g2);g2.connect(o);p.start();
    new t.LFO({frequency:.11,min:.2,max:.65}).connect(g1.gain).start();
    new t.LFO({frequency:.23,min:.08,max:.4}).connect(g2.gain).start();
    new t.LFO({frequency:.37,min:850,max:1500}).connect(b2.frequency).start();
    L.cafe={out:o};
  }
  { // 风扇 / 冷气：低通棕色噪音 + 一点点低频嗡声
    const o=mk(),n=new t.Noise("brown"),f=new t.Filter(480,"lowpass"),os=new t.Oscillator(100,"sine"),og=new t.Gain(.8);
    n.volume.value=-2;n.connect(f);f.connect(o);os.volume.value=-26;os.connect(og);og.connect(o);n.start();os.start();
    new t.LFO({frequency:.06,min:.5,max:1}).connect(og.gain).start();
    L.fan={out:o};
  }
  const mkS=(out,vol)=>{const s=new t.Synth({oscillator:{type:"sine"},envelope:{attack:.004,decay:.04,sustain:0,release:.03}});s.volume.value=vol;s.connect(out);return s};
  const clink=new t.Synth({oscillator:{type:"triangle"},envelope:{attack:.001,decay:.18,sustain:0,release:.2}});clink.volume.value=-26;clink.connect(L.cafe.out);
  L.cricket={out:mk()};
  const crick=[mkS(L.cricket.out,-24),mkS(L.cricket.out,-27)];
  const bell=new t.Synth({oscillator:{type:"sine"},envelope:{attack:.01,decay:.9,sustain:0,release:1.4}});bell.volume.value=-14;bell.toDestination();
  return{t,master,L,clink,crick,bell};
}
let building=null;
function ensure(){
  if(ST.eng)return Promise.resolve(ST.eng);
  return building||(building=window.Labs.lib(LIB).then(()=>{if(!window.Tone)throw new Error("no tone");ST.eng=build();return ST.eng}).catch(e=>{building=null;throw e}));
}
function apply(fast){
  const E=ST.eng;if(!E)return;
  const duck=ST.pomo&&ST.pomo.phase==="rest"?.4:1;
  E.master.gain.rampTo(ST.playing&&!ST.fading?(ST.master/100)*duck:0,fast?.05:.6);
  LAYERS.forEach(l=>{const v=(ST.vol[l.id]||0)/100;E.L[l.id].out.gain.rampTo(Math.pow(v,1.6)*.9,.3)});
}
function every(fn,a,b){let id;const go=()=>{id=setTimeout(()=>{if(!ST.playing)return;try{fn()}catch(e){}go()},a+Math.random()*(b-a))};go();ST.timers.push(()=>clearTimeout(id))}
function clearTimers(){ST.timers.forEach(f=>f());ST.timers=[]}
function sched(){
  const E=ST.eng;clearTimers();if(!E)return;
  every(()=>{if(!(ST.vol.cafe>0))return;const f=1800+Math.random()*1600,n=E.t.now();E.clink.triggerAttackRelease(f,.05,n,.3+Math.random()*.5);E.clink.triggerAttackRelease(f*2.76,.04,n+.03,.25)},3500,11000);
  E.crick.forEach((s,i)=>every(()=>{if(!(ST.vol.cricket>0))return;const f=4100+Math.random()*500,k=3+(Math.random()*3|0),n=E.t.now();for(let j=0;j<k;j++)s.triggerAttackRelease(f,.03,n+j*.07)},700+i*350,2100+i*600));
}
function setSleep(){
  clearTimeout(ST.sleepT);ST.sleepT=0;
  if(ST.sleepMin>0&&ST.playing)ST.sleepT=setTimeout(()=>{ST.fading=true;apply();setTimeout(()=>{if(ST.fading)stop()},21000)},ST.sleepMin*60000);
}
function play(){
  const E=ST.eng;if(!E){say("声音库还没加载好，请稍等。",1);return}
  if(!LAYERS.some(l=>ST.vol[l.id]>0)){ST.vol=Object.assign({},SCENES[0][1]);keep()}
  window.Tone.start().then(()=>{ST.playing=true;ST.fading=false;apply();sched();setSleep();say("");ui()}).catch(()=>say("这台设备打不开声音，请再点一次。",1));
}
function stop(){
  ST.playing=false;ST.fading=false;clearTimeout(ST.sleepT);ST.sleepT=0;clearTimers();apply();ui();
  setTimeout(()=>{if(!ST.playing&&!ST.pomo){try{window.Tone.context.rawContext.suspend()}catch(e){}}},1200);
}
function chime(){
  const E=ST.eng;if(!E)return;
  try{if(E.t.context.state!=="running")return;E.bell.triggerAttackRelease("E5","8n");E.bell.triggerAttackRelease("B5","8n","+0.28")}catch(e){}
}
function pomoStart(){
  ST.pomo={phase:"focus",end:Date.now()+25*60000,n:0};ui();
  ensure().then(()=>window.Tone.start()).then(()=>apply()).catch(()=>{});
}
function pomoStop(){
  ST.pomo=null;apply();ui();
  setTimeout(()=>{if(!ST.playing&&!ST.pomo){try{window.Tone.context.rawContext.suspend()}catch(e){}}},1200);
}
if(!ST.tick)ST.tick=setInterval(()=>{
  const p=ST.pomo;if(!p)return;
  if(Date.now()>=p.end){const toRest=p.phase==="focus";ST.pomo={phase:toRest?"rest":"focus",end:Date.now()+(toRest?5:25)*60000,n:(p.n||0)+(toRest?1:0)};chime();apply();say(toRest?"专注结束，休息 5 分钟。环境音会自动调小。":"休息结束，开始下一轮专注。")}
  const el=q(".am-pt");if(el)el.textContent=pomoText();
},1000);
function pomoText(){const p=ST.pomo;return p?(p.phase==="focus"?"专注中 ":"休息中 ")+mmss(p.end-Date.now())+"　已完成 "+(p.n||0)+" 轮":"没有在计时"}
function ui(){
  const h=ST.cur;if(!h||!h.isConnected)return;
  const pb=h.querySelector('[data-a="play"]');if(pb){pb.textContent=ST.playing?"⏸ 停止":"▶ 播放";pb.disabled=!ST.eng}
  h.querySelectorAll("[data-v]").forEach(r=>{const id=r.dataset.v;r.value=id==="_m"?ST.master:(ST.vol[id]||0)});
  h.querySelectorAll(".am-chip[data-s]").forEach(c=>{const sc=SCENES[+c.dataset.s][1];c.classList.toggle("on",LAYERS.every(l=>(ST.vol[l.id]||0)===(sc[l.id]||0)))});
  const sl=h.querySelector(".am-sl");if(sl)sl.value=String(ST.sleepMin);
  const pg=h.querySelector('[data-a="pomo"]');if(pg)pg.textContent=ST.pomo?"结束番茄钟":"🍅 开始专注 25 分钟";
  const pt=h.querySelector(".am-pt");if(pt)pt.textContent=pomoText();
}
function render(host){
  if(!document.getElementById("am-css")){const s=document.createElement("style");s.id="am-css";s.textContent=CSS;document.head.appendChild(s)}
  host.classList.add("lab-amb");ST.cur=host;
  host.innerHTML=`<div class="am-row"><span class="fine muted">一键场景：</span>${SCENES.map((x,i)=>`<button type="button" class="am-chip" data-s="${i}">${x[0]}</button>`).join("")}</div>
  ${LAYERS.map(l=>`<div class="am-l"><span class="am-i">${l.ico}</span><div class="am-m"><div class="am-n">${l.n} <span class="fine muted">${l.d}</span></div><input type="range" min="0" max="100" step="1" data-v="${l.id}" aria-label="${l.n}"></div></div>`).join("")}
  <div class="am-l"><span class="am-i">🔊</span><div class="am-m"><div class="am-n">总音量</div><input type="range" min="0" max="100" step="1" data-v="_m" aria-label="总音量"></div></div>
  <div class="am-row"><button type="button" class="btn small pri" data-a="play" disabled>加载中…</button><label class="fine muted">睡眠定时</label><select class="am-sl" aria-label="睡眠定时"><option value="0">不定时</option><option value="15">15 分钟</option><option value="30">30 分钟</option><option value="60">60 分钟</option><option value="90">90 分钟</option></select></div>
  <div class="am-msg" role="status">加载声音库…</div>
  <hr><div class="fine muted">🍅 学习场景：专注 25 分钟 → 休息 5 分钟，循环。换阶段会有一声轻轻的钟声，休息时环境音会自动调小。</div>
  <div class="am-row"><button type="button" class="btn small" data-a="pomo">🍅 开始专注 25 分钟</button><span class="fine am-pt"></span></div>
  <p class="fine muted" style="margin:8px 0 0">声音全部由程序现场合成，不下载音频，也没有版权问题；和顶部的「读书音乐」是两套声音，可以一起开。手机锁屏或切到后台太久，系统可能会暂停网页的声音和计时。声音库：Tone.js。</p>`;
  host.addEventListener("input",e=>{const r=e.target.closest("[data-v]");if(!r)return;const id=r.dataset.v,v=+r.value;
    if(id==="_m")ST.master=v;else ST.vol[id]=v;keep();apply(true);
    host.querySelectorAll(".am-chip[data-s]").forEach(c=>{const sc=SCENES[+c.dataset.s][1];c.classList.toggle("on",LAYERS.every(l=>(ST.vol[l.id]||0)===(sc[l.id]||0)))})});
  host.addEventListener("change",e=>{if(e.target.classList.contains("am-sl")){ST.sleepMin=+e.target.value;setSleep()}});
  host.addEventListener("click",e=>{
    const c=e.target.closest("[data-s]"),a=e.target.closest("[data-a]");
    if(c){ST.vol=Object.assign({},SCENES[+c.dataset.s][1]);keep();ui();if(ST.playing){apply();sched()}else play()}
    if(!a)return;const k=a.dataset.a;
    if(k==="play")ST.playing?stop():play();
    if(k==="pomo")ST.pomo?pomoStop():pomoStart();
  });
  ui();
  ensure().then(()=>{ui();say(ST.playing?"":"声音库准备好了，点「播放」或选一个场景。");apply()}).catch(()=>say("声音库没加载成功（可能没有网络），联网后重新展开即可。",1));
}
Labs.reg("ambient",{render});
})();
