/* 3D 认部件引擎：<model-viewer>（Apache-2.0，Google）。给 lab-space.js、lab-bio3d.js 共用。
   数据文件调用 M3D.run(host, ctx, {M, pool, foot, max})；M 里每一项 = 一个模型（f、parts、calc、chaps…）。 */
(function(){
const LIB="https://cdn.jsdelivr.net/npm/@google/model-viewer@3.5.0/dist/model-viewer-umd.min.js";
const CSS=`.lab-space .sp-row{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:8px 0}
.lab-space .sp-chip{border:1px solid var(--line);border-radius:999px;padding:4px 12px;font-size:12.5px;background:var(--sheet2)}
.lab-space .sp-chip.on{background:var(--blue-soft);border-color:var(--blue);font-weight:700}
.lab-space .sp-tabs{display:flex;gap:0;border:1px solid var(--line);border-radius:12px;overflow:hidden;margin:10px 0}
.lab-space .sp-tabs button{flex:1;padding:8px 6px;font-size:13.5px;background:var(--sheet2);border:0;border-right:1px solid var(--line)}
.lab-space .sp-tabs button:last-child{border-right:0}
.lab-space .sp-tabs button.on{background:var(--blue-soft);color:var(--blue);font-weight:700}
.lab-space .sp-stage{position:relative;width:100%;height:min(58vh,380px);border-radius:14px;overflow:hidden;display:flex;align-items:center;justify-content:center;color:#c9d6f2;font-size:13.5px;text-align:center;padding:10px;box-sizing:border-box;
 background:radial-gradient(1px 1px at 12% 22%,#fffc,transparent),radial-gradient(1.5px 1.5px at 72% 14%,#fffb,transparent),radial-gradient(1px 1px at 38% 78%,#fff9,transparent),radial-gradient(1px 1px at 88% 66%,#fffc,transparent),radial-gradient(1.5px 1.5px at 55% 50%,#fff6,transparent),radial-gradient(1px 1px at 25% 60%,#fff8,transparent),radial-gradient(circle at 50% 42%,#1d2f5f 0%,#0a1020 78%);box-shadow:inset 0 0 40px #0006}
.lab-space model-viewer{width:100%;height:100%;--poster-color:transparent;background:transparent}
.lab-space .sp-big{border:1px solid #7aa2ff;background:#2563eb;color:#fff;border-radius:999px;padding:10px 20px;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 4px 18px #2563eb66}
.lab-space .sp-big small{display:block;font-weight:400;opacity:.85;font-size:11.5px;margin-top:2px}
.lab-space .sp-hs{display:block;position:relative;width:28px;height:28px;border-radius:50%;border:2px solid #fff;background:#2563ebdd;color:#fff;padding:0;cursor:pointer;box-shadow:0 2px 10px #0008;transition:opacity .2s,transform .15s}
.lab-space .sp-hs:not([visible]){opacity:.4}
.lab-space .sp-hs i{font-style:normal;font-weight:700;font-size:13px;line-height:24px;display:block}
.lab-space .sp-hs.on{background:#f59e0b;transform:scale(1.15)}
.lab-space .sp-hs.cur{animation:sp-pulse 1.2s infinite}
.lab-space .sp-hs.ok{background:#16a34a}.lab-space .sp-hs.no{background:#dc2626}
.lab-space .sp-hs .lb{display:none;position:absolute;left:34px;top:50%;transform:translateY(-50%);white-space:nowrap;background:#0b1226ee;color:#fff;border:1px solid #ffffff55;border-radius:8px;padding:3px 8px;font-size:12px}
.lab-space .sp-hs.on .lb{display:block}
.lab-space.sp-quiz .sp-hs .lb{display:none!important}
@keyframes sp-pulse{0%{box-shadow:0 0 0 0 #fbbf24cc}70%{box-shadow:0 0 0 14px #fbbf2400}100%{box-shadow:0 0 0 0 #fbbf2400}}
.lab-space .sp-msg{font-size:13px;min-height:18px;color:var(--muted)}
.lab-space .sp-msg.bad{color:var(--bad)}
.lab-space .sp-card{border:1px solid var(--line);border-radius:12px;padding:10px 12px;background:var(--sheet2);margin:8px 0}
.lab-space .sp-card h4{margin:0 0 4px;font-size:14.5px}
.lab-space .sp-bar{height:6px;border-radius:99px;background:var(--line);overflow:hidden;margin:6px 0 10px}
.lab-space .sp-bar i{display:block;height:100%;background:var(--blue);transition:width .25s}
.lab-space .sp-opt{display:block;width:100%;text-align:left;margin:6px 0;padding:9px 12px;border:1px solid var(--line);border-radius:10px;background:var(--sheet2);font-size:14px}
.lab-space .sp-opt.ok{border-color:#16a34a;background:#16a34a22;font-weight:700}
.lab-space .sp-opt.no{border-color:#dc2626;background:#dc262622}
.lab-space .sp-fb{margin:8px 0;font-size:13.5px;line-height:1.65}
.lab-space .sp-fb.ok b:first-child{color:#16a34a}.lab-space .sp-fb.no b:first-child{color:#dc2626}
.lab-space .sp-calc input{width:110px;max-width:40%}
.lab-space .sp-calc .sp-c{margin:10px 0;padding-bottom:10px;border-bottom:1px dashed var(--line)}
.lab-space .sp-calc .sp-r{font-size:13.5px;margin-top:6px;line-height:1.65}
.lab-space .sp-facts ul{margin:6px 0 0 18px;padding:0}.lab-space .sp-facts li{margin:4px 0;font-size:13.5px;line-height:1.6}`;
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
function num(s){s=String(s).replace(/,|\s/g,"").replace(/[×x*]10\^?([−-]?\d+)/i,"e$1").replace(/−/g,"-");const m=s.match(/-?\d*\.?\d+(?:e-?\d+)?/i);return m?parseFloat(m[0]):NaN}
function run(host,ctx,cfg){
  const M=cfg.M,POOL=cfg.pool||[];
  if(!document.getElementById("sp-css")){const s=document.createElement("style");s.id="sp-css";s.textContent=CSS;document.head.appendChild(s)}
  host.classList.add("lab-space");
  const idx0=Math.max(0,M.findIndex(x=>(x.chaps||[]).includes(ctx&&ctx.key)));
  host.innerHTML=`<div class="sp-row">${M.map((m,i)=>`<button type="button" class="sp-chip${i===idx0?" on":""}" data-i="${i}">${m.ico} ${m.n}</button>`).join("")}</div>
  <div class="sp-tabs"><button type="button" class="on" data-mode="explore">🔍 探索</button><button type="button" data-mode="quiz">🧠 测验</button><button type="button" data-mode="calc" class="sp-calcb">🧮 计算</button></div>
  <div class="sp-stage"></div>
  <div class="sp-row"><button type="button" class="btn small" data-a="spin">⟳ 自转：开</button><button type="button" class="btn small" data-a="reset">复位视角</button></div>
  <div class="sp-msg" role="status"></div>
  <div class="sp-panel"></div>
  <details class="sp-facts" style="margin-top:8px"><summary class="fine" style="cursor:pointer">📌 这个模型的考试小知识</summary><div class="sp-fl"></div></details>
  <p class="fine muted" style="margin:8px 0 0">拖动旋转，双指缩放；手机上如果出现 AR 按钮，可以把模型放进真实房间里看大小。${cfg.foot||""}查看器：model-viewer。</p>`;
  const stage=host.querySelector(".sp-stage"),msg=host.querySelector(".sp-msg"),panel=host.querySelector(".sp-panel"),spinB=host.querySelector('[data-a="spin"]');
  let idx=idx0,mv=null,spin=true,libP=null,mode="explore",sel=-1,qz=null;
  const say=(t,bad)=>{msg.className="sp-msg"+(bad?" bad":"");msg.textContent=t};
  const m=()=>M[idx];
  function placeholder(){mv=null;const x=m();stage.innerHTML=`<button type="button" class="sp-big" data-a="load">▶ 载入 3D 模型<small>${x.mb}${x.mb.includes("MB")?"，建议用 Wi-Fi":""}</small></button>`}
  function lib(){return libP||(libP=window.Labs.lib(LIB).then(()=>{if(!window.customElements||!customElements.get("model-viewer"))throw new Error("no model-viewer")}).catch(e=>{libP=null;throw e}))}
  function hs(){
    if(!mv)return;mv.querySelectorAll(".sp-hs").forEach(x=>x.remove());
    m().parts.forEach((p,i)=>{const b=document.createElement("button");b.type="button";b.className="sp-hs";b.slot="hotspot-"+i;b.dataset.position=p.pos;b.dataset.normal="0 1 0";b.dataset.visibilityAttribute="visible";b.dataset.hs=i;b.setAttribute("aria-label",p.zh);b.innerHTML=`<i>${i+1}</i><span class="lb">${p.zh}</span>`;mv.appendChild(b)});
    paintHS();
  }
  function paintHS(){
    if(!mv)return;const cur=mode==="quiz"&&qz&&!qz.over?qz.items[qz.i].pi:-1;
    mv.querySelectorAll(".sp-hs").forEach(b=>{const i=+b.dataset.hs;b.classList.toggle("on",mode==="explore"&&i===sel);b.classList.toggle("cur",i===cur&&!qz.shown);const r=qz&&qz.res?qz.res[i]:null;b.classList.toggle("ok",mode==="quiz"&&r===1);b.classList.toggle("no",mode==="quiz"&&r===0)});
  }
  function load(){
    if(mv)return;say("加载 3D 查看器…");
    lib().then(()=>{
      const x=m();stage.innerHTML="";mv=document.createElement("model-viewer");
      mv.setAttribute("src",x.f);mv.setAttribute("alt",x.n);mv.setAttribute("camera-controls","");mv.setAttribute("touch-action","pan-y");
      mv.setAttribute("shadow-intensity","0.6");mv.setAttribute("ar","");mv.setAttribute("ar-modes","webxr scene-viewer quick-look");
      if(spin)mv.setAttribute("auto-rotate","");
      mv.addEventListener("progress",e=>{const p=e.detail&&e.detail.totalProgress;if(p>0&&p<1)say("载入模型 "+Math.round(p*100)+"%")});
      mv.addEventListener("load",()=>say(""));
      mv.addEventListener("error",()=>say("没找到模型文件 "+x.f+"。请把这个 .glb 放进仓库的 models 文件夹（和 index.html 同一层），名字要一致。",1));
      stage.appendChild(mv);hs();say("载入模型…");
    }).catch(()=>say("3D 查看器没加载成功（可能没有网络），联网后重新展开即可。",1));
  }
  function focusPart(i){if(!mv)return;try{const q=m().parts[i].pos.split(" ");mv.cameraTarget=q.map(v=>v+"m").join(" ")}catch(e){}}
  /* —— 探索 —— */
  function explore(){
    const x=m();
    panel.innerHTML=`<div class="sp-row">${x.parts.map((p,i)=>`<button type="button" class="sp-chip${i===sel?" on":""}" data-p="${i}">${i+1} ${p.zh}</button>`).join("")}</div>`+
    (sel<0?`<div class="sp-card fine muted">点模型上的圆点，或点上面的部件按钮，看它是什么、有什么用。</div>`:
      `<div class="sp-card"><h4>${sel+1} · ${x.parts[sel].zh} <span class="fine muted">${x.parts[sel].bm}</span></h4><div class="fine" style="line-height:1.65">${x.parts[sel].fn}</div></div>`);
    paintHS();
  }
  /* —— 测验 —— */
  function newQuiz(){
    const x=m(),items=[];
    x.parts.forEach((p,i)=>{
      const others=x.parts.filter(y=>y!==p).map(y=>y.zh),extra=shuffle(POOL.filter(y=>!x.parts.some(z=>z.zh===y)));
      const dis=shuffle(others).slice(0,3);while(dis.length<3)dis.push(extra.shift());
      items.push({pi:i,t:`模型上的圆点 <b>${i+1}</b> 是什么部件？`,o:[p.zh].concat(dis).map((t,k)=>({t,ok:!k})),why:`<b>${p.zh}</b>（${p.bm}）：${p.fn}`});
      items.push({pi:i,t:`圆点 <b>${i+1}</b>：${p.q}`,o:p.o.map((t,k)=>({t,ok:k===p.a})),why:`<b>${p.zh}</b>：${p.fn}`});
    });
    qz={items:shuffle(items).slice(0,cfg.max||12).map(it=>({...it,o:shuffle(it.o)})),i:0,score:0,shown:false,over:false,res:{},wrong:[]};
  }
  function quiz(){
    if(!qz)newQuiz();
    if(qz.over){
      panel.innerHTML=`<div class="sp-card"><h4>完成！答对 ${qz.score} / ${qz.items.length}</h4>${qz.wrong.length?`<div class="fine muted" style="margin:4px 0">答错的题，回顾一下：</div>${qz.wrong.map(w=>`<div class="fine" style="margin:6px 0;line-height:1.6">• ${w.t}<br><span class="muted">${w.why}</span></div>`).join("")}`:`<div class="fine">全对，太棒了！👏</div>`}<div class="sp-row"><button type="button" class="btn small pri" data-a="again">再来一次</button></div></div>`;
      paintHS();return}
    const it=qz.items[qz.i];
    panel.innerHTML=`<div class="fine muted">第 ${qz.i+1} / ${qz.items.length} 题 · 答对 ${qz.score}</div><div class="sp-bar"><i style="width:${Math.round(qz.i/qz.items.length*100)}%"></i></div>
    <div style="font-size:14.5px;line-height:1.7;margin-bottom:4px">${it.t}</div>
    ${it.o.map((o,k)=>`<button type="button" class="sp-opt" data-o="${k}">${o.t}</button>`).join("")}
    <div class="sp-fb"></div>`;
    paintHS();
  }
  function answer(k){
    if(qz.shown)return;qz.shown=true;const it=qz.items[qz.i],ok=it.o[k].ok;
    panel.querySelectorAll(".sp-opt").forEach((b,j)=>{b.classList.toggle("ok",it.o[j].ok);if(j===k&&!ok)b.classList.add("no")});
    if(ok)qz.score++;else qz.wrong.push(it);
    qz.res[it.pi]=(qz.res[it.pi]===0||!ok)?0:1;
    panel.querySelector(".sp-fb").className="sp-fb "+(ok?"ok":"no");
    panel.querySelector(".sp-fb").innerHTML=`<b>${ok?"答对了！":"不对。"}</b> ${it.why}<div class="sp-row"><button type="button" class="btn small pri" data-a="next">${qz.i+1>=qz.items.length?"看结果":"下一题"}</button></div>`;
    paintHS();
  }
  /* —— 计算 —— */
  function calc(){
    const x=m();
    panel.innerHTML=`<div class="sp-calc">${x.calc.map((c,i)=>`<div class="sp-c"><div style="font-size:14px;line-height:1.7">${i+1}. ${c.q}</div>
     <div class="sp-row"><input type="text" inputmode="decimal" data-ci="${i}" placeholder="答案" autocomplete="off"> <span class="fine muted">${c.u}</span><button type="button" class="btn small pri" data-a="chk" data-c="${i}">核对</button><button type="button" class="btn small" data-a="stp" data-c="${i}">看步骤</button></div><div class="sp-r" data-r="${i}"></div></div>`).join("")}</div>
     <div class="fine muted">地球半径取 6370 km；π 取 3.14 或计算器上的值都可以，误差在 3% 以内算对。</div>`;
  }
  function paint(){
    const cb=host.querySelector(".sp-calcb");cb.style.display=m().calc?"":"none";if(mode==="calc"&&!m().calc)mode="explore";
    host.classList.toggle("sp-quiz",mode==="quiz");
    host.querySelectorAll(".sp-tabs button").forEach(b=>b.classList.toggle("on",b.dataset.mode===mode));
    host.querySelector(".sp-fl").innerHTML=`<div class="fine muted" style="margin-top:4px">${m().bm}</div><ul>${m().facts.map(f=>"<li>"+f+"</li>").join("")}</ul>`;
    ({explore,quiz,calc})[mode]();
  }
  stage.addEventListener("click",e=>{
    const b=e.target.closest(".sp-hs");
    if(b){const i=+b.dataset.hs;if(mode==="explore"){sel=i;explore();focusPart(i)}return}
    if(/spdebug/.test(location.hash)&&mv&&mv.positionAndNormalFromPoint){const r=mv.getBoundingClientRect(),h=mv.positionAndNormalFromPoint(e.clientX-r.left,e.clientY-r.top);if(h)say("坐标 "+[h.position.x,h.position.y,h.position.z].map(v=>v.toFixed(2)).join(" "))}
  });
  host.addEventListener("click",e=>{
    const c=e.target.closest(".sp-chip[data-i]"),t=e.target.closest("[data-mode]"),p=e.target.closest("[data-p]"),o=e.target.closest("[data-o]"),a=e.target.closest("[data-a]");
    if(c){idx=+c.dataset.i;host.querySelectorAll(".sp-chip[data-i]").forEach(x=>x.classList.toggle("on",x===c));sel=-1;qz=null;say("");placeholder();paint();if(mode==="quiz")load();return}
    if(t){mode=t.dataset.mode;sel=-1;if(mode==="quiz"){qz=null;load()}paint();return}
    if(p){sel=+p.dataset.p;explore();focusPart(sel);return}
    if(o){answer(+o.dataset.o);return}
    if(!a)return;const k=a.dataset.a;
    if(k==="load")load();
    if(k==="spin"){spin=!spin;spinB.textContent="⟳ 自转："+(spin?"开":"关");if(mv){spin?mv.setAttribute("auto-rotate",""):mv.removeAttribute("auto-rotate")}}
    if(k==="reset"&&mv){try{mv.cameraTarget="auto auto auto";mv.cameraOrbit="auto auto auto";mv.fieldOfView="auto"}catch(e){}if(mv.resetTurntableRotation)mv.resetTurntableRotation()}
    if(k==="next"){qz.i++;qz.shown=false;if(qz.i>=qz.items.length)qz.over=true;quiz()}
    if(k==="again"){qz=null;paint()}
    if(k==="chk"||k==="stp"){
      const i=+a.dataset.c,c=m().calc[i],r=host.querySelector(`[data-r="${i}"]`),inp=host.querySelector(`[data-ci="${i}"]`);
      if(k==="stp"){r.innerHTML=`<div class="sp-card">${c.s}</div>`;return}
      const v=num(inp.value);if(!isFinite(v)){r.innerHTML='<span class="fine muted">先填一个数字。</span>';return}
      const ok=Math.abs(v-c.ans)<=Math.abs(c.ans)*c.tol;
      r.innerHTML=ok?`<b style="color:#16a34a">✔ 对了！</b> 参考答案 ≈ ${c.ans} ${c.u}`:`<b style="color:var(--bad)">✘ 还不对。</b> <span class="muted">检查单位和公式，或点「看步骤」。</span>`;
    }
  });
  placeholder();paint();
}
window.M3D={run};
})();
