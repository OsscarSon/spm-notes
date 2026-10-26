/* 在线名单：Supabase Realtime Presence（开源的实时服务）。右上角 👥 按钮，点开能看到「现在有谁在读书」。
   - 默认显示你（匿名）；不想被看到，随时取消勾选「让别人看到我」，选择会记住。
   - 人数上限排队：靠 Supabase 的 spm_claim / spm_leave（见 online-queue.sql）。满员后按最早上线顺序排队，前面有人离线时自动补位。
   - 别人只能看到：昵称、头像、正在学的科目、专注状态。不会有真名、学校、笔记内容。
   - 只在打开面板、或开启了「让别人看到我」时才会连接；否则不连接，也不占名额。
   - 免费版同时在线上限约 200 人，满了只是名单暂时看不到，App 其他功能不受影响。
   - 公开密钥（sb_publishable_…）本来就是设计成放在网页里的；千万不要把 secret / service_role 密钥放进来。
   - 来自别人的数据一律当成不可信：只用 textContent 显示，昵称会过滤，科目和状态只认白名单。 */
(function(){
"use strict";
try{
const SB_URL="https://szbawqmwgtmpjldfifat.supabase.co";
const SB_KEY="sb_publishable_z9hxMNpkYqNoEV56xy1szQ_TyGc6KTP";
const LIB="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.105.1/dist/umd/supabase.js";
const CHAN="spm-lobby-v1",LS="spm-online-v1";
const ADJ=["安静","勤奋","专注","认真","元气","机灵","佛系","早起","夜猫","乐观","努力","冷静"];
const ANI=[["小熊","🐻"],["小狐狸","🦊"],["小猫","🐱"],["小狗","🐶"],["企鹅","🐧"],["海豚","🐬"],["猫头鹰","🦉"],["兔子","🐰"],["小鹿","🦌"],["松鼠","🐿️"],["小鲸","🐳"],["熊猫","🐼"]];
const ST_TXT={focus:"专注中",rest:"休息中",study:"学习中",idle:"Idle"},ST_COL={focus:"#ff7a59",rest:"#3ccf91",study:"#6f8dff",idle:"#9aa3b5"};
const ST_EMO={focus:"🔥",rest:"☕",study:"✏️",idle:"💤"};
const PAST=["#ffd9d9","#ffe6c7","#fff3b8","#d9f2c4","#c6f0e6","#c9e7ff","#d9d6ff","#f3d4ff","#ffd1ea","#ffe0cc","#cfeaff","#e2e6ee"];
const ST_ORD={focus:0,study:1,rest:2,idle:3};

/* ---------- 本机资料（只存在这台设备） ---------- */
function loadMe(){try{return JSON.parse(localStorage.getItem(LS)||"{}")||{}}catch(e){return{}}}
function saveMe(){try{localStorage.setItem(LS,JSON.stringify(me))}catch(e){}}
function rid(){try{const a=new Uint8Array(8);crypto.getRandomValues(a);return"d"+Array.from(a,x=>x.toString(16).padStart(2,"0")).join("")}catch(e){return"d"+Math.random().toString(36).slice(2,12)+Date.now().toString(36)}}
function cleanNick(s){return String(s==null?"":s).replace(/https?:\/\/\S*|www\.\S*/gi,"").replace(/[\u0000-\u001f\u007f<>&"'`\\]/g,"").replace(/\s+/g," ").trim().slice(0,10)}
function randomNick(){const i=Math.floor(Math.random()*ANI.length);return{nick:ADJ[Math.floor(Math.random()*ADJ.length)]+ANI[i][0],av:i}}
const saved=loadMe();
const me=Object.assign({dev:"",nick:"",av:-1,share:true},saved);
if(!/^d[0-9a-z]{6,40}$/.test(me.dev||""))me.dev=rid();
me.nick=cleanNick(me.nick);
if(!me.nick||!(me.av>=0&&me.av<ANI.length)){const r=randomNick();me.nick=r.nick;me.av=r.av}
me.share=("share" in saved)?!!saved.share:true;saveMe();

/* ---------- 读取 App 里的科目和状态 ---------- */
const X=()=>window.__spm||{};
function subjInfo(id){try{const s=id&&X().subj?X().subj(id):null;return s&&s.name?{name:String(s.name),color:String(s.color||"#6f8dff")}:null}catch(e){return null}}
function curSub(){try{const id=X().S().sub;return subjInfo(id)?id:""}catch(e){return""}}
/* Idle 判定：番茄钟在跑时不算 Idle；否则「标签页在后台超过 5 分钟」或「10 分钟没有任何鼠标 / 键盘 / 触控操作」就算 Idle */
const IDLE_HIDE=5*60*1000,IDLE_ACT=10*60*1000;
let lastAct=Date.now(),hiddenAt=document.hidden?Date.now():0,idleNow=false;
function isIdle(){const n=Date.now();return idleNow=!!((document.hidden&&hiddenAt&&n-hiddenAt>=IDLE_HIDE)||n-lastAct>=IDLE_ACT)}
function myStatus(){try{const p=window.SPMMusic&&window.SPMMusic.pomo&&window.SPMMusic.pomo();if(p){idleNow=false;return p.phase==="rest"?"rest":"focus"}}catch(e){}return isIdle()?"idle":"study"}
const payload=()=>({n:me.nick,a:me.av,s:curSub(),st:myStatus()});

/* ---------- 连接 ---------- */
let sb=null,ch=null,state="off",list=[],open=false,lastTrack=0,lastKey="",trackT=0,pollT=0,libP=null;
const needConn=()=>open||me.share;
function loadLib(){
  if(window.supabase&&window.supabase.createClient)return Promise.resolve();
  return libP||(libP=new Promise((ok,no)=>{const s=document.createElement("script");s.src=LIB;s.onload=()=>window.supabase&&window.supabase.createClient?ok():no(new Error("no supabase"));s.onerror=()=>{libP=null;no(new Error("load"))};document.head.appendChild(s)}));
}
function readState(){
  const st=ch?ch.presenceState():{},out=[];
  Object.keys(st).slice(0,300).forEach(k=>{
    const metas=st[k];if(!metas||!metas.length)return;const m=metas[metas.length-1]||{};
    const sid=typeof m.s==="string"&&subjInfo(m.s)?m.s:"";
    out.push({k:String(k).slice(0,40),n:cleanNick(m.n)||"同学",a:Number.isInteger(m.a)&&m.a>=0&&m.a<ANI.length?m.a:0,s:sid,st:ST_TXT[m.st]?m.st:"study",me:k===me.dev});
  });
  return out;
}
/* ---------- 排队（人数上限）：用普通 HTTP 请求向服务器领号，不占实时连接名额 ---------- */
let qrank=0,qpos=0,hbT=0,claimed=false;
function rpc(fn,body,keep){
  return fetch(SB_URL+"/rest/v1/rpc/"+fn,{method:"POST",keepalive:!!keep,headers:{"apikey":SB_KEY,"Content-Type":"application/json"},body:JSON.stringify(body)})
    .then(r=>{if(!r.ok)throw new Error("rpc "+r.status);return r.json()});
}
const claim=()=>rpc("spm_claim",{p_dev:me.dev}).then(r=>{claimed=true;qrank=+r.rank||0;qpos=+r.pos||0;return r});
function leaveQ(){if(!claimed)return;claimed=false;try{rpc("spm_leave",{p_dev:me.dev},true).catch(()=>{})}catch(e){}}
function stopHb(){clearInterval(hbT);hbT=0}
function startHb(){stopHb();hbT=setInterval(beat,20000)}
function beat(){
  if(!needConn()){stopHb();return}
  claim().then(r=>{
    if(!needConn())return;
    if(state==="queue"){if(r.ok){state="off";connect()}else ui()}
  }).catch(()=>{});
}
let errKind="";
function connect(){
  if(state==="loading"||state==="on")return;
  state="loading";errKind="";ui();
  /* 领号失败（例如还没建 SQL、或网络抖动）就直接连，不卡住功能 */
  claim().catch(()=>null).then(r=>{
    if(!needConn()){state="off";ui();return}
    if(r){startHb();if(!r.ok){state="queue";ui();return}}
    start();
  });
}
function start(){
  loadLib().then(()=>{
    if(!needConn()){state="off";ui();return}
    sb=window.supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},realtime:{params:{eventsPerSecond:5}}});
    const mine=ch=sb.channel(CHAN,{config:{presence:{key:me.dev}}});
    mine.on("presence",{event:"sync"},()=>{if(mine!==ch)return;list=readState();ui()});
    mine.subscribe((status,err)=>{
      if(mine!==ch)return;
      if(status==="SUBSCRIBED"){state="on";errKind="";lastKey="";if(me.share)track(true);startPoll();ui()}
      else if(status==="CHANNEL_ERROR"||status==="TIMED_OUT"){const m=String((err&&err.message)||err||"");state="err";errKind=/too_many|limit|quota/i.test(m)?"full":"net";ui()}
      else if(status==="CLOSED"){if(state==="on"){state="loading";ui()}}
    });
  }).catch(()=>{state="err";errKind="lib";ui()});
}
function disconnect(){
  clearTimeout(trackT);clearInterval(pollT);pollT=0;stopHb();leaveQ();
  const s=sb,c=ch;sb=null;ch=null;
  try{if(s&&c)s.removeChannel(c)}catch(e){}
  try{if(s&&s.realtime)s.realtime.disconnect()}catch(e){}
  state="off";list=[];lastKey="";ui();
}
function sync(){needConn()?connect():disconnect()}
function track(force){
  if(!ch||state!=="on"||!me.share)return;
  const p=payload(),key=JSON.stringify(p);
  if(!force&&key===lastKey)return;
  const wait=7000-(Date.now()-lastTrack);
  if(!force&&wait>0){clearTimeout(trackT);trackT=setTimeout(()=>track(false),wait);return}
  lastKey=key;lastTrack=Date.now();
  try{Promise.resolve(ch.track(p)).catch(()=>{})}catch(e){}
}
function untrack(){lastKey="";try{if(ch)Promise.resolve(ch.untrack()).catch(()=>{})}catch(e){}}
function startPoll(){clearInterval(pollT);pollT=setInterval(()=>{if(state==="on"&&me.share)track(false)},5000)}

/* ---------- 界面 ---------- */
const CSS=`#btnOnline{position:relative;flex:none;white-space:nowrap;padding-left:10px;padding-right:10px}
#btnOnline .on-bd{display:none;margin-left:5px;font-size:12px;font-weight:700;font-variant-numeric:tabular-nums}
#btnOnline.live .on-bd{display:inline}
#btnOnline.me::after{content:'';position:absolute;top:3px;right:3px;width:8px;height:8px;border-radius:50%;background:#3ccf91;box-shadow:0 0 0 0 rgba(60,207,145,.6);animation:onPulse 2s infinite}
#onPanel{position:fixed;z-index:3000;right:12px;top:62px;width:min(352px,calc(100vw - 24px));max-height:calc(100vh - 78px);max-height:calc(100dvh - 78px);overflow:auto;border-radius:24px;background-color:var(--sheet,#fff);background-image:radial-gradient(120% 90px at 15% 0,rgba(255,150,195,.20),transparent 70%),radial-gradient(120% 90px at 95% 0,rgba(130,160,255,.22),transparent 70%);background-repeat:no-repeat;color:var(--ink,#17263f);border:1px solid var(--line,#d3dbe8);box-shadow:0 24px 60px -18px rgba(10,20,40,.55);display:none;-webkit-overflow-scrolling:touch;padding:16px;transform-origin:top right}
#onPanel.open{display:block;animation:onPop .24s cubic-bezier(.3,1.4,.5,1)}
#onPanel .on-hd{position:relative;display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:12px}
#onPanel .on-t{font-size:17px;letter-spacing:.2px}
#onPanel .on-sub{display:block;font-size:12.5px;color:var(--muted,#5d6b7c);margin-top:3px}
#onPanel .on-deco i{position:absolute;font-style:normal;pointer-events:none;color:#ffb3d1;animation:onTw 3.2s ease-in-out infinite}
#onPanel .on-deco i:nth-child(1){right:48px;top:-4px;font-size:13px}
#onPanel .on-deco i:nth-child(2){right:70px;top:16px;font-size:10px;color:#a9b8ff;animation-delay:.9s}
#onPanel .on-deco i:nth-child(3){right:40px;top:26px;font-size:11px;animation-delay:1.7s}
#onPanel .on-x{border:0;background:var(--sheet2,#f1f4fb);color:var(--ink,#17263f);width:32px;height:32px;border-radius:50%;font-size:14px;cursor:pointer;transition:transform .25s,background .2s;flex:none}
#onPanel .on-x:hover{transform:rotate(90deg);background:var(--blue-soft,#e4eafc)}
#onPanel .on-me{background:linear-gradient(135deg,rgba(255,150,195,.16),rgba(130,160,255,.18));border:1px solid var(--line,#d3dbe8);border-radius:18px;padding:12px 14px;margin-bottom:12px}
#onPanel .on-row{display:flex;align-items:center;gap:10px}
#onPanel .on-av{width:46px;height:46px;border-radius:50%;border:2px solid #fff;box-shadow:0 4px 12px -4px rgba(0,0,0,.45);font-size:24px;cursor:pointer;flex:none;padding:0;animation:onBob 3.4s ease-in-out infinite;transition:transform .2s}
#onPanel .on-av:hover{transform:rotate(-10deg) scale(1.1);animation-play-state:paused}
#onPanel .on-nick{flex:1;min-width:0;height:38px;border-radius:12px;border:1px solid var(--line,#d3dbe8);background:var(--sheet,#fff);color:var(--ink,#17263f);padding:0 12px;font-size:14px;font-weight:600}
#onPanel .on-nick:focus{outline:2px solid #ff9ec6;outline-offset:1px}
#onPanel .on-dice{border:1px solid var(--line,#d3dbe8);background:var(--sheet,#fff);border-radius:12px;height:38px;width:40px;cursor:pointer;font-size:17px;flex:none;padding:0;transition:transform .35s}
#onPanel .on-dice:hover{transform:rotate(180deg) scale(1.1)}
#onPanel .on-dice:active{transform:rotate(360deg) scale(.9)}
#onPanel .on-sw{display:flex;align-items:center;gap:10px;margin:12px 0 6px;font-size:14px;cursor:pointer;user-select:none}
#onPanel .on-sw input{-webkit-appearance:none;appearance:none;margin:0;border:0;width:46px;height:26px;border-radius:999px;background:var(--line,#c9d2e3);position:relative;cursor:pointer;flex:none;transition:background .25s}
#onPanel .on-sw input::after{content:"💤";position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#fff;font-size:11px;line-height:20px;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,.3);transition:transform .25s cubic-bezier(.3,1.6,.5,1)}
#onPanel .on-sw input:checked{background:linear-gradient(135deg,#ff8fb8,#8d9bff)}
#onPanel .on-sw input:checked::after{content:"✨";transform:translateX(20px)}
#onPanel .on-sw input:focus-visible{outline:2px solid #ff9ec6;outline-offset:2px}
#onPanel .on-swt{font-weight:700}
#onPanel .on-pill{font-style:normal;font-size:11px;padding:1px 8px;border-radius:999px;background:rgba(255,150,195,.25);color:inherit}
#onPanel .on-note{font-size:12px;color:var(--muted,#5d6b7c);margin:4px 0 0;line-height:1.6}
#onPanel .on-chips{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 10px}
#onPanel .on-chip{display:inline-flex;align-items:center;gap:5px;font-size:12.5px;padding:3px 11px;border-radius:999px;border:1px solid var(--line,#d3dbe8);background:var(--sheet2,#f1f4fb)}
#onPanel .on-chip i{width:8px;height:8px;border-radius:50%;display:inline-block}
#onPanel .on-msg{font-size:13px;color:var(--muted,#5d6b7c);min-height:18px;margin:2px 0 8px;line-height:1.65;text-align:center}
#onPanel .on-msg:empty{display:none}
#onPanel .on-msg.bad{color:var(--bad,#c23b32)}
#onPanel .on-big{font-size:40px;line-height:1.2;margin:6px 0 4px;animation:onBob 3s ease-in-out infinite}
#onPanel .on-it{display:flex;align-items:center;gap:11px;padding:8px 10px;margin-bottom:6px;border-radius:16px;background:var(--sheet2,#f1f4fb);animation:onIn .35s both;transition:transform .15s}
#onPanel .on-it:hover{transform:translateX(3px)}
#onPanel .on-it.me{background:linear-gradient(135deg,rgba(255,150,195,.2),rgba(130,160,255,.22))}
#onPanel .on-ia{position:relative;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:19px;flex:none}
#onPanel .on-ia b{position:absolute;right:-2px;bottom:-2px;width:11px;height:11px;border-radius:50%;border:2px solid var(--sheet,#fff)}
#onPanel .on-in{flex:1;min-width:0}#onPanel .on-in div{font-size:14px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#onPanel .on-in small{display:block;font-size:12px;color:var(--muted,#5d6b7c);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:1px}
#onPanel .on-tag{font-size:11px;padding:1px 8px;border-radius:999px;background:linear-gradient(135deg,#ff8fb8,#8d9bff);color:#fff;margin-left:6px;font-weight:600}
#onPanel .on-more{font-size:12.5px;color:var(--muted,#5d6b7c);padding:6px 0 0;text-align:center}
#onPanel .on-foot{font-size:11.5px;color:var(--muted,#5d6b7c);margin:12px 0 0;line-height:1.6;text-align:center}
@keyframes onPop{from{opacity:0;transform:scale(.9) translateY(-6px)}to{opacity:1;transform:none}}
@keyframes onBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
@keyframes onTw{0%,100%{opacity:.25;transform:scale(.8)}50%{opacity:1;transform:scale(1.2) rotate(15deg)}}
@keyframes onIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@keyframes onPulse{0%{box-shadow:0 0 0 0 rgba(60,207,145,.6)}70%{box-shadow:0 0 0 7px rgba(60,207,145,0)}100%{box-shadow:0 0 0 0 rgba(60,207,145,0)}}
@media (prefers-reduced-motion:reduce){#onPanel *,#onPanel,#btnOnline::after{animation:none!important;transition:none!important}}
@media print{#btnOnline,#onPanel{display:none!important}}`;
const $=(s,r)=>(r||panel).querySelector(s);
let panel=null,btn=null;
function build(){
  if(!document.getElementById("on-css")){const s=document.createElement("style");s.id="on-css";s.textContent=CSS;document.head.appendChild(s)}
  panel=document.createElement("div");panel.id="onPanel";panel.setAttribute("role","dialog");panel.setAttribute("aria-label","在线名单");
  panel.innerHTML=`<div class="on-hd"><div><b class="on-t">在线名单</b><span class="on-sub"></span></div><div class="on-deco" aria-hidden="true"><i>✦</i><i>✧</i><i>♡</i></div><button type="button" class="on-x" aria-label="关闭">✕</button></div>
  <div class="on-me"><div class="on-row"><button type="button" class="on-av" title="换头像" aria-label="换头像"></button><input class="on-nick" maxlength="10" autocomplete="off" spellcheck="false" aria-label="昵称"><button type="button" class="on-dice" title="随机昵称" aria-label="随机昵称">🎲</button></div>
  <label class="on-sw"><input type="checkbox" class="on-share"><span class="on-swt">让别人看到我</span><em class="on-pill">匿名</em></label>
  <p class="on-note">别人只能看到：昵称、头像、你正在学的科目、专注状态。名字可放你自己喜欢的名字。默认已开启，不想被看到随时取消勾选。</p></div>
  <div class="on-chips"></div><div class="on-msg" role="status"></div><div class="on-list"></div>
  <p class="on-foot">🔒 打开这个面板会连接到 Supabase（开源的实时服务）。关掉面板、并且没有开启「让别人看到我」时会自动断开。</p>`;
  document.body.appendChild(panel);
  btn=document.createElement("button");btn.id="btnOnline";btn.type="button";btn.className="btn line no-print";btn.title="在线名单";btn.setAttribute("aria-label","在线名单");
  btn.innerHTML='👥<span class="on-bd"></span>';
  const anchor=document.getElementById("btnMusic")||document.getElementById("btnBell")||document.getElementById("btnSet");
  if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(btn,anchor);
  else{btn.style.cssText="position:fixed;right:12px;top:12px;z-index:3000";document.body.appendChild(btn)}
  btn.addEventListener("click",e=>{e.stopPropagation();toggle()});
  $(".on-x").addEventListener("click",()=>setOpen(false));
  $(".on-av").addEventListener("click",()=>{me.av=(me.av+1)%ANI.length;saveMe();ui();track(false)});
  $(".on-dice").addEventListener("click",()=>{const r=randomNick();me.nick=r.nick;me.av=r.av;saveMe();ui();track(false)});
  const ni=$(".on-nick");
  const commit=()=>{const v=cleanNick(ni.value);me.nick=v||me.nick;ni.value=me.nick;saveMe();track(false)};
  ni.addEventListener("change",commit);ni.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();ni.blur()}});
  $(".on-share").addEventListener("change",e=>{
    me.share=!!e.target.checked;saveMe();
    if(me.share){if(state==="on")track(true);else sync()}
    else{untrack();if(!open)disconnect()}
    ui();
  });
  /* 捕获阶段监听：音乐按钮会 stopPropagation，普通监听收不到 */
  document.addEventListener("click",e=>{if(open&&!panel.contains(e.target)&&!(e.target.closest&&e.target.closest("#btnOnline")))setOpen(false)},true);
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&open)setOpen(false)});
  document.addEventListener("visibilitychange",()=>{if(!document.hidden&&needConn()&&state!=="on"&&state!=="loading")connect()});
  window.addEventListener("online",()=>{if(needConn()&&state!=="on"&&state!=="loading")connect()});
  document.addEventListener("spm-pomo",()=>track(false));
  const act=()=>{lastAct=Date.now();if(idleNow){idleNow=false;track(false)}};
  ["pointerdown","mousemove","keydown","wheel","touchstart","scroll"].forEach(ev=>window.addEventListener(ev,act,{passive:true,capture:true}));
  document.addEventListener("visibilitychange",()=>{if(document.hidden)hiddenAt=Date.now();else{hiddenAt=0;act()}});
  window.addEventListener("pagehide",()=>{leaveQ()});
  window.addEventListener("pageshow",e=>{if(e.persisted&&needConn()&&state!=="on"&&state!=="loading")connect()});
  ui();
}
function toggle(){setOpen(!open)}
function setOpen(v){
  open=!!v;panel.classList.toggle("open",open);
  if(open){const m=document.getElementById("mzPanel");if(m)m.classList.remove("open");ui()}
  sync();ui();
}
function el(tag,cls,txt){const e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e}
function ui(){
  if(!panel)return;
  const on=state==="on",sharing=me.share;
  const others=list.length,focusN=list.filter(x=>x.st==="focus").length;
  btn.classList.toggle("live",on||state==="queue");btn.classList.toggle("me",sharing);
  $(".on-bd",btn).textContent=on?String(others):state==="queue"?"⏳":"";
  const av=$(".on-av");av.textContent=ANI[me.av][1];av.style.background=PAST[me.av]||"#eee";
  const ni=$(".on-nick");if(document.activeElement!==ni)ni.value=me.nick;
  $(".on-share").checked=sharing;
  $(".on-t").textContent=on?"👥 现在 "+others+" 人在线":state==="queue"?"🎟️ 排队中":"👥 在线名单";
  $(".on-sub").textContent=on?(focusN?"🔥 "+focusN+" 人专注中，一起加油！":"☕ 没有人在专注计时"):"";
  const msg=$(".on-msg");msg.className="on-msg";
  const L=$(".on-list"),C=$(".on-chips");L.textContent="";C.textContent="";
  const face=(em,t)=>{msg.textContent="";msg.appendChild(el("div","on-big",em));msg.appendChild(document.createTextNode(t))};
  if(state==="loading"){face("🫧","连接中…")}
  else if(state==="err"){msg.classList.add("bad");face("🙈",errKind==="full"?"在线名单暂时满了（免费服务有同时在线人数上限），稍后再试。App 其他功能不受影响。":errKind==="lib"?"需要联网才能看在线名单。":"暂时连不上在线服务，稍后再试。App 其他功能不受影响。")}
  else if(state==="queue"){face("🎟️","在线名单人数已满，你正在排队：第 "+qpos+" 位。前面有人离线时会自动补位，不用刷新，也不影响 App 其他功能。")}
  else if(state==="off"){msg.textContent=open?"":"点 👥 打开在线名单。"}
  else if(!others){face("🌱",sharing?"还没有人在线，你来当第一个吧！":"现在还没有人开启显示。想让别人看到你，可以打开上面的开关。")}
  else msg.textContent="";
  if(!on)return;
  const cnt={};list.forEach(x=>{if(x.s)cnt[x.s]=(cnt[x.s]||0)+1});
  Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a]).slice(0,8).forEach(id=>{
    const si=subjInfo(id);if(!si)return;const c=el("span","on-chip"),d=el("i");d.style.background=si.color;c.appendChild(d);c.appendChild(document.createTextNode(si.name+" "+cnt[id]));C.appendChild(c)});
  const sorted=list.slice().sort((a,b)=>(b.me-a.me)||(ST_ORD[a.st]-ST_ORD[b.st])||a.n.localeCompare(b.n,"zh"));
  sorted.slice(0,60).forEach((u,i)=>{
    const row=el("div","on-it"+(u.me?" me":"")),a=el("div","on-ia",ANI[u.a][1]),dot=el("b");row.style.animationDelay=Math.min(i,12)*35+"ms";a.style.background=PAST[u.a]||"#eee";a.style.boxShadow="0 0 0 2px "+ST_COL[u.st];dot.style.background=ST_COL[u.st];a.appendChild(dot);
    const info=el("div","on-in"),nm=el("div","",u.n);if(u.me)nm.appendChild(el("span","on-tag","我"));
    const si=u.s?subjInfo(u.s):null;info.appendChild(nm);info.appendChild(el("small","",ST_EMO[u.st]+" "+ST_TXT[u.st]+(si?" · "+si.name:"")));
    row.appendChild(a);row.appendChild(info);L.appendChild(row)});
  if(sorted.length>60)L.appendChild(el("div","on-more","还有 "+(sorted.length-60)+" 人在线"));
}
function boot(){try{build();if(me.share)sync()}catch(e){console.warn("online.js",e)}}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
window.SPMOnline={open:()=>setOpen(true),close:()=>setOpen(false),state:()=>({state,count:list.length,share:me.share,nick:me.nick})};
}catch(err){try{console.warn("online.js",err)}catch(e){}}
})();
