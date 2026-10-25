/* 几何画板：JSXGraph（LGPL / MIT 双协议）。拖动点，看角度、外接圆、向量、斜率、图形变换怎么变。
   库只在展开卡片时才从 CDN 下载。 */
(function(){
const LIB="https://cdn.jsdelivr.net/npm/jsxgraph@1.9.2/distrib/jsxgraphcore.js",CSSURL="https://cdn.jsdelivr.net/npm/jsxgraph@1.9.2/distrib/jsxgraph.css";
const PRE=[["三角形内角和","tri"],["外接圆","circ"],["向量加法","vec"],["直线与斜率","line"],["图形变换","tf"]];
const CSS=`.lab-geo .ge-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:8px}
.lab-geo .ge-chip{border:1px solid var(--line);border-radius:999px;padding:3px 11px;font-size:12.5px;background:var(--sheet2)}
.lab-geo .ge-chip.on{background:var(--blue-soft);border-color:var(--blue);font-weight:700}
.lab-geo .ge-bd{width:100%;aspect-ratio:1/1;max-height:440px;background:#fff;border:1px solid var(--line);border-radius:12px;touch-action:none}
.lab-geo .ge-out{font-size:13.5px;line-height:1.7;margin-top:8px}.lab-geo .ge-out b{font-variant-numeric:tabular-nums}`;
const d=(a,b)=>Math.hypot(a.X()-b.X(),a.Y()-b.Y());
const ang=(p,q,r)=>{const ux=q.X()-p.X(),uy=q.Y()-p.Y(),vx=r.X()-p.X(),vy=r.Y()-p.Y(),m=Math.hypot(ux,uy)*Math.hypot(vx,vy);return m?Math.acos(Math.max(-1,Math.min(1,(ux*vx+uy*vy)/m)))*180/Math.PI:0};
const f1=x=>(Math.round(x*10)/10).toFixed(1);
function render(host){
  if(!document.getElementById("ge-css")){const s=document.createElement("style");s.id="ge-css";s.textContent=CSS;document.head.appendChild(s)}
  host.classList.add("lab-geo");
  host.innerHTML=`<div class="ge-row">${PRE.map(p=>`<button type="button" class="ge-chip" data-p="${p[1]}">${p[0]}</button>`).join("")}</div>
  <div class="ge-row ge-tf" style="display:none">${[["trans","平移 (+3, +2)"],["refy","关于 y 轴反射"],["refx","关于 x 轴反射"],["rot","绕原点转 90°"],["enl","放大 ×2"]].map(t=>`<button type="button" class="ge-chip" data-t="${t[0]}">${t[1]}</button>`).join("")}</div>
  <div class="ge-bd" id="ge${Math.random().toString(36).slice(2,8)}"></div><div class="ge-out"></div>
  <p class="fine muted" style="margin:8px 0 0">拖动图里的点试试。图形库：JSXGraph。</p>`;
  const bd=host.querySelector(".ge-bd"),out=host.querySelector(".ge-out"),tfRow=host.querySelector(".ge-tf");
  let brd=null,mode="tri",tf="trans",J=null;
  const P=(x,y,n,o)=>brd.create("point",[x,y],Object.assign({name:n,size:4,strokeColor:"#2f55d4",fillColor:"#2f55d4",label:{color:"#17263f"}},o||{}));
  const txt=fn=>{out.innerHTML=fn();brd.on("update",()=>{out.innerHTML=fn()})};
  function build(){
    if(brd){J.JSXGraph.freeBoard(brd);brd=null}
    host.querySelectorAll(".ge-chip[data-p]").forEach(c=>c.classList.toggle("on",c.dataset.p===mode));
    tfRow.style.display=mode==="tf"?"flex":"none";
    brd=J.JSXGraph.initBoard(bd.id,{boundingbox:[-8,8,8,-8],axis:true,keepAspectRatio:true,showCopyright:false,showNavigation:false,pan:{enabled:false},zoom:{wheel:false}});
    if(mode==="tri"){
      const A=P(-4,-2,"A"),B=P(4,-2,"B"),C=P(1,4,"C");
      brd.create("polygon",[A,B,C],{fillColor:"#2f55d4",fillOpacity:.1,borders:{strokeColor:"#2f55d4"},vertices:{visible:false}});
      txt(()=>{const a=ang(A,B,C),b=ang(B,A,C),c=ang(C,A,B);return`∠A = <b>${f1(a)}°</b>　∠B = <b>${f1(b)}°</b>　∠C = <b>${f1(c)}°</b><br>三个角加起来 = <b>${f1(a+b+c)}°</b>（永远是 180°）`})
    }else if(mode==="circ"){
      const A=P(-3,-2,"A"),B=P(4,-1,"B"),C=P(0,5,"C");
      brd.create("polygon",[A,B,C],{fillOpacity:0,borders:{strokeColor:"#5d6b7c"},vertices:{visible:false}});
      const c=brd.create("circumcircle",[A,B,C],{strokeColor:"#c23b32",center:{visible:true,name:"O",size:3,strokeColor:"#c23b32",fillColor:"#c23b32"}});
      txt(()=>`外接圆半径 R = <b>${f1(c.Radius())}</b>　三角形三个顶点都在圆上；拖动顶点，圆心 O 是三条边垂直平分线的交点。`)
    }else if(mode==="vec"){
      const O=P(0,0,"O",{fixed:true,strokeColor:"#17263f",fillColor:"#17263f"}),a=P(4,1,"a"),b=P(1,4,"b"),s=brd.create("point",[()=>a.X()+b.X(),()=>a.Y()+b.Y()],{name:"a+b",size:3,fixed:true,strokeColor:"#c23b32",fillColor:"#c23b32"});
      brd.create("arrow",[O,a],{strokeColor:"#2f55d4"});brd.create("arrow",[O,b],{strokeColor:"#2f55d4"});brd.create("arrow",[O,s],{strokeColor:"#c23b32",strokeWidth:3});
      brd.create("segment",[a,s],{dash:2,strokeColor:"#9aa6b5"});brd.create("segment",[b,s],{dash:2,strokeColor:"#9aa6b5"});
      txt(()=>`a = (<b>${f1(a.X())}</b>, <b>${f1(a.Y())}</b>)　b = (<b>${f1(b.X())}</b>, <b>${f1(b.Y())}</b>)<br>a + b = (<b>${f1(s.X())}</b>, <b>${f1(s.Y())}</b>)，长度 |a+b| = <b>${f1(Math.hypot(s.X(),s.Y()))}</b>（平行四边形法则）`)
    }else if(mode==="line"){
      const p=P(-3,-2,"P"),q=P(3,4,"Q");brd.create("line",[p,q],{strokeColor:"#c23b32"});
      txt(()=>{const dx=q.X()-p.X(),dy=q.Y()-p.Y();if(Math.abs(dx)<1e-6)return`竖直线 x = <b>${f1(p.X())}</b>，斜率不存在`;const m=dy/dx,c=p.Y()-m*p.X();return`斜率 m = Δy/Δx = <b>${f1(dy)}</b> / <b>${f1(dx)}</b> = <b>${f1(m)}</b><br>y = <b>${f1(m)}</b>x ${c<0?"−":"+"} <b>${f1(Math.abs(c))}</b>（y 截距 = ${f1(c)}）`})
    }else{
      const A=P(1,1,"A"),B=P(4,1,"B"),C=P(2,3,"C"),F={trans:(x,y)=>[x+3,y+2],refy:(x,y)=>[-x,y],refx:(x,y)=>[x,-y],rot:(x,y)=>[-y,x],enl:(x,y)=>[2*x,2*y]};
      const im=(p,n)=>brd.create("point",[()=>F[tf](p.X(),p.Y())[0],()=>F[tf](p.X(),p.Y())[1]],{name:n,size:3,fixed:true,strokeColor:"#c23b32",fillColor:"#c23b32",label:{color:"#c23b32"}});
      const A2=im(A,"A′"),B2=im(B,"B′"),C2=im(C,"C′");
      brd.create("polygon",[A,B,C],{fillColor:"#2f55d4",fillOpacity:.15,borders:{strokeColor:"#2f55d4"},vertices:{visible:false}});
      brd.create("polygon",[A2,B2,C2],{fillColor:"#c23b32",fillOpacity:.15,borders:{strokeColor:"#c23b32"},vertices:{visible:false}});
      host.querySelectorAll(".ge-chip[data-t]").forEach(c=>c.classList.toggle("on",c.dataset.t===tf));
      const R={trans:"(x, y) → (x+3, y+2)",refy:"(x, y) → (−x, y)",refx:"(x, y) → (x, −y)",rot:"(x, y) → (−y, x)",enl:"(x, y) → (2x, 2y)，面积变成 4 倍"};
      txt(()=>`蓝 = 原图，红 = 像。规则：<b>${R[tf]}</b><br>A(${f1(A.X())}, ${f1(A.Y())}) → A′(${f1(A2.X())}, ${f1(A2.Y())})`)
    }
  }
  host.addEventListener("click",e=>{const c=e.target.closest("[data-p]"),t=e.target.closest("[data-t]");if(!J)return;
    if(c){mode=c.dataset.p;build()}if(t){tf=t.dataset.t;build()}});
  window.Labs.css(CSSURL);
  window.Labs.lib(LIB).then(()=>{J=window.JXG;build()}).catch(()=>{out.textContent="几何库没加载成功（可能没有网络），联网后重新展开即可。"});
}
Labs.reg("geo",{render});
})();
