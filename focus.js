/* 专注房间：选一个场景进房间，设目标、开计时，同时看到同一个房间里还有谁在专注。
   - 实时部分完全复用 online.js 的 Supabase Presence 连接（同一条连接、同一套昵称头像、同一个排队名额），
     不会多占一个在线名额。进房间时只多带两个字段：房间 id（白名单）和目标（过滤后最多 24 字）。
   - 计时在本机完成，断网 / 没排上队 / 没开在线名单，也能一个人专注，只是看不到别人。
   - 不进房间就不会被别人看到；离开房间后，如果没开「让别人看到我」就立刻取消广播。
   - 来自别人的数据一律只用 textContent 显示。 */
(function(){
"use strict";
try{
const LS="spm-focus-v1";
const SC=[
  {id:"sakura",n:"樱花书院",m:"春风与花瓣，轻柔而专注",fx:"petal",bg:"#eed8ca"},
  {id:"onsen",n:"温泉小筑",m:"低压力的放松与重启",fx:"steam",bg:"#e7dbd0"},
  {id:"brick",n:"红砖咖啡楼",m:"暖灯、猫咪和屋顶露台",fx:"mote",bg:"#c7b8bf"},
  {id:"cabin",n:"森林木屋",m:"松林与炉火，安静沉浸",fx:"steam",bg:"#eed4ae"},
  {id:"sunny",n:"晨光小筑",m:"明亮、积极向上的早晨",fx:"mote",bg:"#f5e7c4"},
  {id:"night",n:"月夜书店",m:"星空下的深夜书香",fx:"star",bg:"#26264a"},
  {id:"cafe",n:"街角咖啡",m:"温暖的背景白噪",fx:"mote",bg:"#b5c2bd"}
];
const ANI=["🐻","🦊","🐱","🐶","🐧","🐬","🦉","🐰","🦌","🐿️","🐳","🐼"];
const PAST=["#ffd9d9","#ffe6c7","#fff3b8","#d9f2c4","#c6f0e6","#c9e7ff","#d9d6ff","#f3d4ff","#ffd1ea","#ffe0cc","#cfeaff","#e2e6ee"];
const ST_TXT={focus:"专注中",rest:"休息中",study:"学习中",idle:"Idle"};
const ST_COL={focus:"#ff7a59",rest:"#3ccf91",study:"#6f8dff",idle:"#9aa3b5"};
const STAGES=["预习","复习","刷题","整理"];
const DURS=[15,25,45,60];
const IMG="img/focus/";
const OB=()=>window.SPMOnline||null;

/* ---------- 本机设置 ---------- */
const ymd=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
function load(){try{return JSON.parse(localStorage.getItem(LS)||"{}")||{}}catch(e){return{}}}
const P=Object.assign({scene:"sakura",dur:25,goal:"",stage:"",day:"",min:0},load());
function save(){try{localStorage.setItem(LS,JSON.stringify(P))}catch(e){}}
if(!SC.some(x=>x.id===P.scene))P.scene="sakura";
if(DURS.indexOf(P.dur)<0)P.dur=25;
P.goal=String(P.goal||"").slice(0,20);
if(STAGES.indexOf(P.stage)<0)P.stage="";
if(P.day!==ymd()){P.day=ymd();P.min=0}
P.min=Math.max(0,Math.floor(+P.min||0));

/* ---------- 计时状态（用结束时间戳算，切到后台也不会变慢） ---------- */
const run={st:"idle",end:0,left:P.dur*60000,total:0,inRoom:false};
const remain=()=>run.st==="running"?Math.max(0,run.end-Date.now()):run.left;
const phase=()=>run.st==="running"?"focus":run.st==="paused"?"rest":"";
const sc=()=>SC.find(x=>x.id===P.scene)||SC[0];
function goalText(){const t=(P.stage?P.stage+"·":"")+P.goal.trim();return t.slice(0,24)}
function pushRoom(){const o=OB();if(o&&run.inRoom)try{o.setRoom(P.scene,goalText(),phase())}catch(e){}}
function toast(t){try{if(window.__spm&&window.__spm.toast)window.__spm.toast(t)}catch(e){}}
function chime(){try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;const a=new C();[660,880].forEach((f,i)=>{const o=a.createOscillator(),g=a.createGain(),t=a.currentTime+i*.22;o.type="sine";o.frequency.value=f;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.12,t+.03);g.gain.exponentialRampToValueAtTime(.0001,t+.9);o.connect(g);g.connect(a.destination);o.start(t);o.stop(t+1)});setTimeout(()=>{try{a.close()}catch(e){}},2000)}catch(e){}}

function start(){
  if(run.st==="idle"){run.left=P.dur*60000;run.total=run.left}
  run.end=Date.now()+run.left;run.st="running";run.inRoom=true;
  const o=OB();if(o)try{o.setRoom(P.scene,goalText(),"focus")}catch(e){}
  tick();
}
function pause(){run.left=remain();run.st="paused";pushRoom();tick()}
function finish(manual){
  const spent=run.total-remain();
  const mins=manual?Math.floor(spent/60000):Math.round(run.total/60000);
  if(mins>0){if(P.day!==ymd()){P.day=ymd();P.min=0}P.min+=mins;save()}
  const was=run.st!=="idle";
  run.st="idle";run.left=P.dur*60000;run.total=0;
  pushRoom();tick();
  if(was){
    try{document.dispatchEvent(new CustomEvent("spm-focus-done",{detail:{min:mins,scene:P.scene,goal:P.goal,manual:!!manual}}))}catch(e){}
    if(!manual){chime();toast("🎉 本轮专注完成，+"+mins+" 分钟")}
  }
}
function leave(){
  if(run.st!=="idle")finish(true);
  run.inRoom=false;
  const o=OB();if(o)try{o.setRoom("")}catch(e){}
  if(!open&&o)try{o.hold(false)}catch(e){}
  tick();people();
}

/* ---------- 界面 ---------- */
const CSS=`#btnFocus{flex:none;white-space:nowrap;padding-left:10px;padding-right:10px;font-variant-numeric:tabular-nums}
#btnFocus.run{background:linear-gradient(135deg,rgba(255,150,195,.28),rgba(130,160,255,.3))}
#fcRoot{position:fixed;inset:0;z-index:3500;display:none;align-items:center;justify-content:center;padding:16px;background:rgba(10,16,28,.55);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);overflow:auto}
#fcRoot.open{display:flex;animation:fcFade .22s both}
#fcRoot *{box-sizing:border-box}
.fc-card{position:relative;display:grid;grid-template-columns:minmax(0,1.65fr) minmax(300px,1fr);width:min(1120px,100%);height:min(720px,calc(100dvh - 32px));border-radius:28px;overflow:hidden;background:var(--sheet,#fff);color:var(--ink,#17263f);box-shadow:0 40px 90px -30px rgba(0,0,0,.6);animation:fcPop .3s cubic-bezier(.3,1.3,.5,1) both;font-family:var(--sans,system-ui,sans-serif)}
.fc-main{position:relative;display:flex;flex-direction:column;gap:12px;padding:14px;min-width:0;min-height:0;background:var(--fcbg,#eee);transition:background .5s}
.fc-top{position:relative;z-index:3;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}
.fc-pill{display:inline-flex;align-items:center;gap:8px;padding:7px 14px;border-radius:999px;font-size:13.5px;font-weight:700;background:rgba(255,255,255,.82);color:#1d2a40;box-shadow:0 2px 10px -4px rgba(0,0,0,.25);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
.fc-avs{display:inline-flex}
.fc-avs i{font-style:normal;width:24px;height:24px;margin-left:-6px;border-radius:50%;border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-size:13px}
.fc-avs i:first-child{margin-left:0}
.fc-livet{font-weight:600;font-size:12.5px;color:#4b5970}
.fc-view{position:relative;flex:1;min-height:200px;border-radius:20px;overflow:hidden}
.fc-bg{position:absolute;inset:-40px;background-size:cover;background-position:center;filter:blur(38px) saturate(1.1);transform:scale(1.15);opacity:.9;transition:opacity .5s}
.fc-hero{position:absolute;left:50%;top:50%;height:100%;width:auto;aspect-ratio:1/1;max-width:none;transform:translate(-50%,-50%);-webkit-mask-image:linear-gradient(90deg,transparent,#000 9%,#000 91%,transparent),linear-gradient(180deg,transparent,#000 9%,#000 91%,transparent);-webkit-mask-composite:source-in;mask-image:linear-gradient(90deg,transparent,#000 9%,#000 91%,transparent),linear-gradient(180deg,transparent,#000 9%,#000 91%,transparent);mask-composite:intersect;animation:fcSwap .55s both;user-select:none;-webkit-user-drag:none}
.fc-fx{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.fc-fx span{position:absolute;display:block;opacity:0;animation-iteration-count:infinite;animation-timing-function:linear}
.fc-fx .petal{width:9px;height:7px;background:#ffb7cf;border-radius:80% 0 80% 0;animation-name:fcPetal}
.fc-fx .star{width:3px;height:3px;border-radius:50%;background:#fff;box-shadow:0 0 6px 1px rgba(255,255,255,.8);animation-name:fcTwinkle;animation-timing-function:ease-in-out}
.fc-fx .mote{width:5px;height:5px;border-radius:50%;background:#ffe3a3;box-shadow:0 0 10px 3px rgba(255,214,130,.7);animation-name:fcMote}
.fc-fx .steam{width:46px;height:46px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.75),rgba(255,255,255,0) 70%);filter:blur(5px);animation-name:fcSteam}
.fc-timer{position:relative;z-index:3;display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:22px;background:rgba(255,255,255,.9);color:#1d2a40;box-shadow:0 10px 30px -14px rgba(0,0,0,.35);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);flex-wrap:wrap}
.fc-ring{position:relative;width:72px;height:72px;flex:none}
.fc-ring svg{width:72px;height:72px;transform:rotate(-90deg)}
.fc-ring circle{fill:none;stroke-width:5}
.fc-ring .bg{stroke:rgba(111,141,255,.18)}
.fc-ring .fg{stroke:#6f5cf0;stroke-linecap:round;stroke-dasharray:194.8;stroke-dashoffset:0;transition:stroke-dashoffset .5s linear}
.fc-ring.rest .fg{stroke:#3ccf91}
.fc-ring b{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:15.5px;font-family:var(--kai,serif);font-variant-numeric:tabular-nums}
.fc-tt{flex:1;min-width:140px}
.fc-tt small{display:block;font-size:11px;letter-spacing:2px;font-weight:700;color:#5b52d6}
.fc-gt{display:block;font-size:17px;margin:2px 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.fc-sub{font-size:12.5px;color:#5d6b7c}
.fc-ctl{display:flex;gap:8px;flex-wrap:wrap}
.fc-go,.fc-sec{height:42px;border-radius:14px;padding:0 18px;font-size:14px;font-weight:700;cursor:pointer;border:1px solid transparent;transition:transform .15s,box-shadow .2s;font-family:inherit}
.fc-go{background:linear-gradient(135deg,#6f5cf0,#5a7bff);color:#fff;box-shadow:0 8px 18px -8px rgba(80,90,240,.7)}
.fc-go:hover{transform:translateY(-1px)}
.fc-go:active{transform:scale(.97)}
.fc-sec{background:#fff;color:#1d2a40;border-color:#d3dbe8}
.fc-sec[hidden]{display:none}
.fc-side{display:flex;flex-direction:column;gap:12px;padding:16px 18px 16px;overflow:auto;min-height:0;min-width:0}
.fc-h{font-size:11.5px;letter-spacing:2.2px;font-weight:800;color:var(--blue,#2f55d4);margin:0 0 8px;display:flex;justify-content:space-between;align-items:center;min-height:22px}
.fc-side>div:first-child .fc-h{padding-right:44px}
.fc-h em{font-style:normal;letter-spacing:0;font-weight:600;color:var(--muted,#5d6b7c);font-size:12px}
.fc-scenes{display:flex;flex-direction:column;gap:6px}
.fc-sn{display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:6px 10px;border-radius:14px;border:1px solid var(--line,#d3dbe8);background:var(--sheet,#fff);color:inherit;cursor:pointer;font-family:inherit;transition:transform .15s,border-color .2s,background .2s}
.fc-sn:hover{transform:translateX(2px)}
.fc-sn img{width:40px;height:40px;border-radius:12px;object-fit:cover;flex:none;background:var(--sheet2,#f1f4fb)}
.fc-sn div{flex:1;min-width:0}
.fc-sn b{display:block;font-size:14.5px}
.fc-sn small{display:block;font-size:12px;color:var(--muted,#5d6b7c);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:1px}
.fc-sn .n{font-size:11.5px;padding:2px 8px;border-radius:999px;background:var(--sheet2,#f1f4fb);color:var(--muted,#5d6b7c);flex:none}
.fc-sn .n:empty{display:none}
.fc-sn .ck{display:none;color:#6f5cf0;font-weight:800}
.fc-sn.sel{border-color:#8d83f5;background:linear-gradient(135deg,rgba(150,130,255,.14),rgba(130,170,255,.12))}
.fc-sn.sel .ck{display:block}
.fc-prep{border:1px solid var(--line,#d3dbe8);border-radius:18px;padding:12px 14px}
.fc-in{width:100%;height:40px;border-radius:12px;border:1px solid var(--line,#d3dbe8);background:var(--sheet,#fff);color:var(--ink,#17263f);padding:0 12px;font-size:14px;font-family:inherit}
.fc-in:focus{outline:2px solid #a79dff;outline-offset:1px}
.fc-chips{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
.fc-c{border:1px solid var(--line,#d3dbe8);background:var(--sheet2,#f1f4fb);color:inherit;border-radius:999px;padding:4px 12px;font-size:12.5px;cursor:pointer;font-family:inherit}
.fc-c.on{background:#6f5cf0;border-color:#6f5cf0;color:#fff}
.fc-c:disabled{opacity:.45;cursor:not-allowed}
.fc-note{font-size:12px;line-height:1.65;color:var(--muted,#5d6b7c);margin:8px 0 0}
.fc-pl{display:flex;flex-direction:column;gap:6px}
.fc-pi{display:flex;align-items:center;gap:10px;padding:7px 10px;border-radius:14px;background:var(--sheet2,#f1f4fb);animation:fcIn .3s both}
.fc-pi.me{background:linear-gradient(135deg,rgba(255,150,195,.2),rgba(130,160,255,.22))}
.fc-pa{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:17px;flex:none}
.fc-pn{flex:1;min-width:0}
.fc-pn div{font-size:13.5px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.fc-pn small{display:block;font-size:12px;color:var(--muted,#5d6b7c);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.fc-empty{font-size:13px;color:var(--muted,#5d6b7c);text-align:center;padding:10px 0}
.fc-net{font-size:11.5px;color:var(--muted,#5d6b7c);text-align:center;margin-top:auto;line-height:1.6}
.fc-x{position:absolute;z-index:5;right:12px;top:12px;width:34px;height:34px;border-radius:50%;border:0;background:var(--sheet2,#f1f4fb);color:var(--ink,#17263f);cursor:pointer;font-size:14px;transition:transform .25s}
.fc-x:hover{transform:rotate(90deg)}
@keyframes fcFade{from{opacity:0}to{opacity:1}}
@keyframes fcPop{from{opacity:0;transform:scale(.94) translateY(10px)}to{opacity:1;transform:none}}
@keyframes fcSwap{from{opacity:0;transform:translate(-50%,-48%) scale(.96)}to{opacity:1;transform:translate(-50%,-50%)}}
@keyframes fcIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
@keyframes fcPetal{0%{opacity:0;transform:translate(0,-10%) rotate(0)}10%{opacity:.9}100%{opacity:0;transform:translate(90px,110vh) rotate(540deg)}}
@keyframes fcTwinkle{0%,100%{opacity:.15;transform:scale(.7)}50%{opacity:1;transform:scale(1.3)}}
@keyframes fcMote{0%{opacity:0;transform:translate(0,0)}20%{opacity:.9}100%{opacity:0;transform:translate(24px,-160px)}}
@keyframes fcSteam{0%{opacity:0;transform:translate(0,0) scale(.5)}25%{opacity:.7}100%{opacity:0;transform:translate(20px,-200px) scale(1.8)}}
@media (max-width:860px){
  #fcRoot{align-items:flex-start;padding:0}
  .fc-card{grid-template-columns:1fr;height:auto;min-height:100dvh;border-radius:0}
  .fc-view{flex:none;height:min(78vw,360px)}
  .fc-side{overflow:visible}
  .fc-x{position:fixed}
}
@media (prefers-reduced-motion:reduce){#fcRoot *,.fc-card{animation:none!important;transition:none!important}.fc-fx{display:none}}
@media print{#btnFocus,#fcRoot{display:none!important}}`;

const el=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e};
let root=null,btn=null,open=false,tm=0,ringLen=194.8,rafP=0,fxFor="";
const $=s=>root.querySelector(s);
const mmss=ms=>{const s=Math.max(0,Math.ceil(ms/1000));return String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0")};

function build(){
  const st=document.createElement("style");st.id="fc-css";st.textContent=CSS;document.head.appendChild(st);
  root=el("div");root.id="fcRoot";
  root.innerHTML=`<div class="fc-card" role="dialog" aria-modal="true" aria-label="专注房间">
  <button type="button" class="fc-x" aria-label="关闭">✕</button>
  <div class="fc-main">
    <div class="fc-top"><div class="fc-pill"><span class="fc-sname"></span></div><div class="fc-pill fc-live" style="margin-right:44px"><span class="fc-avs"></span><span class="fc-livet"></span></div></div>
    <div class="fc-view"><div class="fc-bg"></div><img class="fc-hero" alt="" draggable="false"><div class="fc-fx" aria-hidden="true"></div></div>
    <div class="fc-timer">
      <div class="fc-ring"><svg viewBox="0 0 72 72" aria-hidden="true"><circle class="bg" cx="36" cy="36" r="31"/><circle class="fg" cx="36" cy="36" r="31"/></svg><b class="fc-clock">25:00</b></div>
      <div class="fc-tt"><small>专注计时</small><b class="fc-gt"></b><span class="fc-sub"></span></div>
      <div class="fc-ctl"><button type="button" class="fc-go"></button><button type="button" class="fc-sec" hidden></button></div>
    </div>
  </div>
  <aside class="fc-side">
    <div><p class="fc-h">选择场景<em class="fc-total"></em></p><div class="fc-scenes" role="radiogroup" aria-label="场景"></div></div>
    <div class="fc-prep">
      <p class="fc-h" style="margin-bottom:6px">进入房间前</p>
      <input class="fc-in" maxlength="20" autocomplete="off" placeholder="这一轮想完成什么？例如：做完 10 道题" aria-label="本轮目标">
      <div class="fc-chips fc-stages" aria-label="学习阶段"></div>
      <div class="fc-chips fc-durs" aria-label="时长"></div>
      <p class="fc-note">进入房间后，同房间的人会看到你的昵称、头像和目标（匿名，昵称可在 👥 面板里改）。离开房间就不再显示。</p>
    </div>
    <div><p class="fc-h">房间里的人<em class="fc-cnt"></em></p><div class="fc-pl"></div></div>
    <div class="fc-net"></div>
  </aside></div>`;
  document.body.appendChild(root);

  const sl=$(".fc-scenes");
  SC.forEach(s=>{
    const b=el("button","fc-sn");b.type="button";b.dataset.id=s.id;b.setAttribute("role","radio");
    const im=el("img");im.src=IMG+s.id+"-s.webp";im.alt="";im.width=40;im.height=40;im.loading="lazy";im.decoding="async";
    const d=el("div");d.appendChild(el("b","",s.n));d.appendChild(el("small","",s.m));
    b.appendChild(im);b.appendChild(d);b.appendChild(el("span","n"));b.appendChild(el("span","ck","✓"));
    b.addEventListener("click",()=>pick(s.id));sl.appendChild(b);
  });
  const sg=$(".fc-stages"),dr=$(".fc-durs");
  STAGES.forEach(t=>{const c=el("button","fc-c",t);c.type="button";c.dataset.v=t;c.addEventListener("click",()=>{P.stage=P.stage===t?"":t;save();prep();pushRoom()});sg.appendChild(c)});
  DURS.forEach(m=>{const c=el("button","fc-c",m+" 分钟");c.type="button";c.dataset.v=m;c.addEventListener("click",()=>{if(run.st!=="idle")return;P.dur=m;run.left=m*60000;save();prep();tick()});dr.appendChild(c)});
  const gi=$(".fc-in");gi.value=P.goal;
  gi.addEventListener("input",()=>{P.goal=gi.value.slice(0,20);save();tick()});
  gi.addEventListener("change",pushRoom);
  gi.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();gi.blur();if(run.st==="idle")start()}});

  $(".fc-go").addEventListener("click",()=>{run.st==="running"?pause():start()});
  $(".fc-sec").addEventListener("click",()=>{run.st==="idle"?leave():finish(true)});
  $(".fc-x").addEventListener("click",()=>setOpen(false));
  root.addEventListener("click",e=>{if(e.target===root)setOpen(false)});
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&open)setOpen(false)});
  document.addEventListener("spm-online-change",()=>{if(rafP)return;rafP=requestAnimationFrame(()=>{rafP=0;people()})});

  scene();prep();tick();people();
  setInterval(()=>{if(run.st==="running"||open)tick()},500);
}

function setOpen(v){
  open=!!v;root.classList.toggle("open",open);
  document.documentElement.style.overflow=open?"hidden":"";
  const o=OB();
  if(open){
    try{if(o)o.close()}catch(e){}
    const m=document.getElementById("mzPanel");if(m)m.classList.remove("open");
    if(o)try{o.hold(true)}catch(e){}
    scene();tick();people();
    setTimeout(()=>{try{$(".fc-go").focus()}catch(e){}},60);
  }else if(o&&!run.inRoom){try{o.hold(false)}catch(e){}}
}

function pick(id){
  if(P.scene===id)return;
  P.scene=id;save();scene();pushRoom();people();
}
function scene(){
  const s=sc(),root_=root;
  $(".fc-sname").textContent="🏡 "+s.n;
  const main=$(".fc-main");main.style.setProperty("--fcbg",s.bg);
  const url=IMG+s.id+".webp";
  const im=$(".fc-hero");
  if(im.getAttribute("data-id")!==s.id){
    im.style.animation="none";void im.offsetWidth;im.style.animation="";
    im.src=url;im.alt=s.n+"场景插画";im.setAttribute("data-id",s.id);
    $(".fc-bg").style.backgroundImage="url("+url+")";
  }
  root_.querySelectorAll(".fc-sn").forEach(b=>{const on=b.dataset.id===s.id;b.classList.toggle("sel",on);b.setAttribute("aria-checked",on?"true":"false")});
  if(fxFor!==s.id){fxFor=s.id;fx(s.fx)}
}
function fx(type){
  const box=$(".fc-fx");box.textContent="";
  const n=type==="petal"?16:type==="star"?24:type==="steam"?7:12;
  for(let i=0;i<n;i++){
    const sp=el("span",type),r=Math.random;
    sp.style.left=(type==="steam"?32+r()*36:r()*100)+"%";
    sp.style.top=(type==="petal"?-6:type==="star"?r()*55:type==="steam"?42+r()*18:50+r()*45)+"%";
    const dur=type==="star"?2.2+r()*3:type==="petal"?7+r()*6:type==="steam"?5+r()*3:6+r()*5;
    sp.style.animationDuration=dur+"s";sp.style.animationDelay=(-r()*dur)+"s";
    box.appendChild(sp);
  }
}
function prep(){
  root.querySelectorAll(".fc-stages .fc-c").forEach(c=>c.classList.toggle("on",c.dataset.v===P.stage));
  root.querySelectorAll(".fc-durs .fc-c").forEach(c=>{c.classList.toggle("on",+c.dataset.v===P.dur);c.disabled=run.st!=="idle"});
}
function tick(){
  if(!root)return;
  if(run.st==="running"&&remain()<=0){finish(false);return}
  const ms=remain(),tot=run.st==="idle"?P.dur*60000:run.total||P.dur*60000;
  $(".fc-clock").textContent=mmss(ms);
  $(".fc-ring .fg").style.strokeDashoffset=String(ringLen*(1-Math.min(1,Math.max(0,ms/tot))));
  $(".fc-ring").classList.toggle("rest",run.st==="paused");
  $(".fc-gt").textContent=P.goal.trim()||"这一轮，专心做一件事";
  const sub=run.st==="running"?"专注中 · 本轮 "+Math.round(tot/60000)+" 分钟":run.st==="paused"?"已暂停 · 休息一下也没关系":(run.inRoom?"本轮结束 · ":"")+"今日已专注 "+P.min+" 分钟";
  $(".fc-sub").textContent=sub;
  const go=$(".fc-go"),sec=$(".fc-sec");
  go.textContent=run.st==="running"?"暂停":run.st==="paused"?"继续":run.inRoom?"再来一轮":"进入房间，开始专注";
  if(run.st==="idle"&&!run.inRoom)sec.hidden=true;
  else{sec.hidden=false;sec.textContent=run.st==="idle"?"离开房间":"结束本轮"}
  if(btn){btn.textContent=run.st==="running"?"🏡 "+mmss(ms):run.st==="paused"?"🏡 ⏸":"🏡";btn.classList.toggle("run",run.st!=="idle")}
  prep();
}
function people(){
  if(!root)return;
  const o=OB();let list=[],conn="none";
  if(o)try{list=o.list();conn=o.conn()}catch(e){}
  const cnt={};list.forEach(x=>{if(x.r)cnt[x.r]=(cnt[x.r]||0)+1});
  root.querySelectorAll(".fc-sn").forEach(b=>{const n=cnt[b.dataset.id]||0;b.querySelector(".n").textContent=n?n+" 人":""});
  const here=list.filter(x=>x.r===P.scene).sort((a,b)=>(b.me-a.me)||a.n.localeCompare(b.n,"zh"));
  const avs=$(".fc-avs");avs.textContent="";
  here.slice(0,5).forEach(u=>{const i=el("i","",ANI[u.a]);i.style.background=PAST[u.a]||"#eee";avs.appendChild(i)});
  $(".fc-livet").textContent=here.length?here.length+" 人正在专注":"还没有人，你来当第一个";
  $(".fc-cnt").textContent=here.length?here.length+" 人":"";
  const pl=$(".fc-pl");pl.textContent="";
  if(!here.length)pl.appendChild(el("div","fc-empty",conn==="on"?"这个房间现在是空的":"连上在线服务后，这里会显示同房间的人"));
  here.slice(0,30).forEach((u,i)=>{
    const row=el("div","fc-pi"+(u.me?" me":"")),a=el("div","fc-pa",ANI[u.a]);
    row.style.animationDelay=Math.min(i,10)*30+"ms";a.style.background=PAST[u.a]||"#eee";a.style.boxShadow="0 0 0 2px "+ST_COL[u.st];
    const info=el("div","fc-pn"),nm=el("div","",u.n+(u.me?"（我）":""));
    info.appendChild(nm);info.appendChild(el("small","",u.g?u.g+" · "+ST_TXT[u.st]:ST_TXT[u.st]));
    row.appendChild(a);row.appendChild(info);pl.appendChild(row);
  });
  if(here.length>30)pl.appendChild(el("div","fc-empty","还有 "+(here.length-30)+" 人"));
  const tot=$(".fc-total"),net=$(".fc-net");
  const all=Object.keys(cnt).reduce((s,k)=>s+cnt[k],0);
  tot.textContent=all?"共 "+all+" 人在房间里":"";
  net.textContent=!o?"在线服务未加载，当前是单人专注模式。":conn==="on"?"🟢 已连接 · 在线 "+list.length+" 人":conn==="loading"?"连接中…":conn==="queue"?"🎟️ 在线人数已满，排队第 "+(o.qpos?o.qpos():"?")+" 位。排队期间可以单人专注。":conn==="err"?"暂时连不上在线服务，仍可单人专注，计时不受影响。":"在线服务待连接。";
}
function boot(){try{build()}catch(e){console.warn("focus.js",e)}}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
window.SPMFocus={scenes:()=>SC.map(x=>({id:x.id,n:x.n,m:x.m})),open:id=>{setOpen(true);if(id&&SC.some(x=>x.id===id))pick(id)},close:()=>setOpen(false),state:()=>({st:run.st,left:remain(),scene:P.scene,inRoom:run.inRoom,todayMin:P.min})};
}catch(err){try{console.warn("focus.js",err)}catch(e){}}
})();
