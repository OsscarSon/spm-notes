/* 物理小实验：Matter.js（MIT）。抛体运动 + 斜面滑块。
   模拟只是示意，数值以下方「理论公式」为准。库只在展开卡片时才从 CDN 下载。 */
(function(){
const LIB="https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js";
const W=640,H=300,STEP=1000/60,G=9.8;
const CSS=`.lab-phy .ph-tabs{display:flex;gap:8px;margin-bottom:8px}
.lab-phy .ph-tabs button{border:1px solid var(--line);border-radius:999px;padding:4px 14px;background:var(--sheet2)}
.lab-phy .ph-tabs button.on{background:var(--blue-soft);border-color:var(--blue);font-weight:700}
.lab-phy canvas{width:100%;aspect-ratio:${W}/${H};display:block;border:1px solid var(--line);border-radius:12px;background:var(--sheet2)}
.lab-phy .ph-ctl{display:grid;grid-template-columns:auto 1fr 64px;gap:6px 10px;align-items:center;margin:10px 0;font-size:13.5px}
.lab-phy .ph-ctl input{width:100%}
.lab-phy .ph-out{font-size:13.5px;line-height:1.7}.lab-phy .ph-out b{font-variant-numeric:tabular-nums}`;
function render(host){
  if(!document.getElementById("ph-css")){const s=document.createElement("style");s.id="ph-css";s.textContent=CSS;document.head.appendChild(s)}
  host.classList.add("lab-phy");
  host.innerHTML=`<div class="ph-tabs"><button type="button" data-m="proj" class="on">抛体运动</button><button type="button" data-m="inc">斜面滑块</button></div>
  <canvas></canvas><div class="ph-ctl"></div><div class="ph-btns" style="display:flex;gap:8px"><button type="button" class="btn small pri" data-a="go">▶ 发射 / 开始</button><button type="button" class="btn small" data-a="rs">↺ 重置</button></div><div class="ph-out" style="margin-top:8px"></div>`;
  const cv=host.querySelector("canvas"),ctl=host.querySelector(".ph-ctl"),out=host.querySelector(".ph-out"),det=host.closest("details"),g2=cv.getContext("2d");
  const dpr=Math.min(2,window.devicePixelRatio||1);cv.width=W*dpr;cv.height=H*dpr;
  let mode="proj",P={v:14,a:45,th:30,mu:.1},M=null,E=null,run=null,raf=0,last=0,acc=0,col={};
  function colors(){const cs=getComputedStyle(host);col={ink:cs.getPropertyValue("--ink").trim()||"#17263f",blue:cs.getPropertyValue("--blue").trim()||"#2f55d4",mut:cs.getPropertyValue("--muted").trim()||"#5d6b7c",line:cs.getPropertyValue("--line").trim()||"#d3dbe8",bad:cs.getPropertyValue("--bad").trim()||"#c23b32"}}
  function controls(){
    const d=mode==="proj"?[["v","初速度 v (m/s)",5,20,.5],["a","发射角 θ (°)",10,80,1]]:[["th","斜面角 θ (°)",10,45,1],["mu","摩擦系数 μ",0,1,.05]];
    ctl.innerHTML=d.map(x=>`<label>${x[1]}</label><input type="range" min="${x[2]}" max="${x[3]}" step="${x[4]}" value="${P[x[0]]}" data-k="${x[0]}"><output>${P[x[0]]}</output>`).join("");
  }
  function theory(){
    if(mode==="proj"){const t=P.a*Math.PI/180,R=P.v*P.v*Math.sin(2*t)/G,Hm=Math.pow(P.v*Math.sin(t),2)/(2*G),T=2*P.v*Math.sin(t)/G;
      return`<b>理论</b>：射程 R = v²sin2θ/g = <b>${R.toFixed(1)} m</b>，最大高度 = <b>${Hm.toFixed(1)} m</b>，飞行时间 = <b>${T.toFixed(2)} s</b>（g = 9.8 m/s²）`}
    const t=P.th*Math.PI/180,a=G*(Math.sin(t)-P.mu*Math.cos(t));
    return a<=0?`<b>理论</b>：tanθ = ${Math.tan(t).toFixed(2)} ≤ μ = ${P.mu}，物块<b>不会滑动</b>`:`<b>理论</b>：a = g(sinθ − μcosθ) = <b>${a.toFixed(2)} m/s²</b>，滑 2 m 需要 t = √(2s/a) = <b>${Math.sqrt(4/a).toFixed(2)} s</b>`;
  }
  function reset(){
    const Mt=window.Matter;if(!Mt)return;colors();M=Mt;
    E=M.Engine.create();const w=E.world;run={steps:0,go:false,trail:[],done:false};
    if(mode==="proj"){
      const K=14,gy=H-28;E.gravity.y=0;run.K=K;run.gy=gy;
      const ball=M.Bodies.circle(30,gy-8,8,{restitution:.35,friction:.2,frictionAir:0,label:"ball"});
      const ground=M.Bodies.rectangle(W/2,gy+20,W*3,40,{isStatic:true});
      M.Composite.add(w,[ball,ground]);run.ball=ball;run.minY=ball.position.y;run.bodies=[ground];
    }else{
      const th=P.th*Math.PI/180,L=360,cx=320,cy=H-20-(L/2)*Math.sin(th)-7*Math.cos(th),u=[Math.cos(th),Math.sin(th)],n=[Math.sin(th),-Math.cos(th)];
      E.gravity.y=G*100/1000;run.K=100;
      const ramp=M.Bodies.rectangle(cx,cy,L,14,{isStatic:true,angle:th,friction:P.mu,frictionStatic:P.mu});
      const d=-(L/2-40),bx=cx+u[0]*d+n[0]*18.5,by=cy+u[1]*d+n[1]*18.5;
      const blk=M.Bodies.rectangle(bx,by,36,22,{angle:th,friction:P.mu,frictionStatic:P.mu,frictionAir:0,restitution:0});
      M.Composite.add(w,[ramp,blk]);run.ball=blk;run.start=[bx,by];run.u=u;run.bodies=[ramp];
    }
    out.innerHTML=theory();draw();
  }
  function launch(){
    if(!E||run.go)reset();if(!run)return;run.go=true;
    if(mode==="proj"){const t=P.a*Math.PI/180,k=run.K/60;E.gravity.y=G*run.K/1000;M.Body.setVelocity(run.ball,{x:P.v*Math.cos(t)*k,y:-P.v*Math.sin(t)*k})}
    start();
  }
  function step(){
    if(!E||!run.go)return;M.Engine.update(E,STEP);run.steps++;const b=run.ball.position;
    if(mode==="proj"&&!run.done){run.trail.push([b.x,b.y]);run.minY=Math.min(run.minY,b.y);
      if(run.steps>3&&b.y>=run.gy-8-.8){run.done=true;const K=run.K;
        out.innerHTML=theory()+`<br><b>模拟</b>：射程 ≈ <b>${((b.x-30)/K).toFixed(1)} m</b>，最大高度 ≈ <b>${((run.gy-8-run.minY)/K).toFixed(1)} m</b>，飞行时间 ≈ <b>${(run.steps/60).toFixed(2)} s</b>`}}
    if(mode==="inc"&&!run.done){const s=((b.x-run.start[0])*run.u[0]+(b.y-run.start[1])*run.u[1])/run.K;
      if(s>=2){run.done=true;out.innerHTML=theory()+`<br><b>模拟</b>：滑 2 m 用了 <b>${(run.steps/60).toFixed(2)} s</b>（Matter 的摩擦是近似模型，和公式会有些差别）`}}
  }
  function poly(v){g2.beginPath();g2.moveTo(v[0].x,v[0].y);for(let i=1;i<v.length;i++)g2.lineTo(v[i].x,v[i].y);g2.closePath()}
  function draw(){
    g2.setTransform(dpr,0,0,dpr,0,0);g2.clearRect(0,0,W,H);if(!run)return;
    if(mode==="proj"){
      if(!run.go){const t=P.a*Math.PI/180,pts=[];g2.setLineDash([4,6]);g2.strokeStyle=col.mut;g2.beginPath();
        for(let x=0;;x+=.2){const y=x*Math.tan(t)-G*x*x/(2*Math.pow(P.v*Math.cos(t),2));if(y<0)break;const px=30+x*run.K,py=run.gy-8-y*run.K;x?g2.lineTo(px,py):g2.moveTo(px,py)}
        g2.stroke();g2.setLineDash([])}
      g2.fillStyle=col.line;g2.fillRect(0,run.gy,W,H-run.gy);
      g2.fillStyle=col.mut;g2.font="11px sans-serif";for(let m=0;m<=40;m+=10){const x=30+m*run.K;if(x<W){g2.fillRect(x,run.gy,1,6);g2.fillText(m+" m",x+3,run.gy+16)}}
      g2.strokeStyle=col.blue;g2.lineWidth=1.5;g2.beginPath();run.trail.forEach((p,i)=>i?g2.lineTo(p[0],p[1]):g2.moveTo(p[0],p[1]));g2.stroke();
      const b=run.ball.position;g2.fillStyle=col.blue;g2.beginPath();g2.arc(b.x,b.y,8,0,7);g2.fill();
    }else{
      g2.fillStyle=col.mut;run.bodies.forEach(b=>{poly(b.vertices);g2.fill()});
      g2.fillStyle=col.blue;poly(run.ball.vertices);g2.fill();
      g2.fillStyle=col.ink;g2.font="12px sans-serif";g2.fillText("θ = "+P.th+"°   μ = "+P.mu,12,20);
    }
  }
  function tick(t){
    if(!host.isConnected||!det||!det.open){raf=0;return}
    const dt=Math.min(100,t-(last||t));last=t;acc+=dt;let n=0;while(acc>=STEP&&n<6){step();acc-=STEP;n++}if(n>=6)acc=0;
    if(run&&run.done&&run.doneAt===undefined)run.doneAt=run.steps;
    draw();raf=run&&run.go&&!(run.done&&run.steps>run.doneAt+180)?requestAnimationFrame(tick):0;
  }
  function start(){if(!raf){last=0;acc=0;raf=requestAnimationFrame(tick)}}
  host.addEventListener("click",e=>{
    const m=e.target.closest("[data-m]"),a=e.target.closest("[data-a]");
    if(m){mode=m.dataset.m;host.querySelectorAll(".ph-tabs button").forEach(b=>b.classList.toggle("on",b===m));controls();reset()}
    if(a)a.dataset.a==="go"?launch():reset();
  });
  ctl.addEventListener("input",e=>{const r=e.target;if(!r.dataset.k)return;P[r.dataset.k]=+r.value;r.nextElementSibling.textContent=r.value;reset()});
  window.Labs.lib(LIB).then(()=>{controls();reset()}).catch(()=>{out.textContent="物理引擎没加载成功（可能没有网络），联网后重新展开即可。"});
}
Labs.reg("physics",{render});
})();
