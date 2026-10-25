/* 函数图像实验室：function-plot（MIT）。可输入函数、用滑块改参数 a b c、同时画两条曲线。
   库只在展开卡片时才从 CDN 下载。 */
(function(){
const LIB="https://cdn.jsdelivr.net/npm/function-plot@1.25.1/dist/function-plot.js";
const PRE=[
  ["一次函数","a*x+b",{a:1,b:0}],
  ["二次函数","a*x^2+b*x+c",{a:1,b:-2,c:-3}],
  ["三次函数","a*x^3+b*x",{a:1,b:-2}],
  ["正弦","a*sin(b*x)",{a:1,b:1}],
  ["余弦","a*cos(b*x)",{a:1,b:1}],
  ["指数","a^x",{a:2}],
  ["对数","log(x)/log(a)",{a:2}],
  ["反比例","a/x",{a:2}],
  ["绝对值","a*abs(x)+b",{a:1,b:0}]
];
const CSS=`.lab-plot .pl-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:8px}
.lab-plot .pl-row input[type=text]{flex:1;min-width:150px}
.lab-plot .pl-chip{border:1px solid var(--line);border-radius:999px;padding:3px 11px;font-size:12.5px;background:var(--sheet2)}
.lab-plot .pl-chip.on{background:var(--blue-soft);border-color:var(--blue);font-weight:700}
.lab-plot .pl-sl{display:grid;grid-template-columns:auto 1fr 54px;gap:8px;align-items:center;font-size:13px}
.lab-plot .pl-sl input{width:100%}
.lab-plot .pl-box{border:1px solid var(--line);border-radius:12px;overflow:hidden;background:var(--sheet2)}
.lab-plot .pl-err{color:var(--bad);font-size:13px;min-height:20px}
.lab-plot svg text{fill:var(--ink)}.lab-plot svg .domain{stroke:var(--muted)}.lab-plot svg .tick line{stroke:var(--line)}
.lab-plot svg .origin{stroke:var(--muted)}`;
function prep(e,p){
  let s=String(e||"").trim();if(!s)return"";
  s=s.replace(/π/g,"pi").replace(/[×·]/g,"*").replace(/÷/g,"/").replace(/\bln\s*\(/g,"log(").replace(/\*\*/g,"^");
  s=s.replace(/\b([abc])\b/g,(m,k)=>"("+(p[k]!==undefined?p[k]:0)+")");
  s=s.replace(/(\d|\))\s*(?=[a-zA-Z(])/g,"$1*").replace(/\bx\s*(?=\()/g,"x*").replace(/\bx\s+(?=[a-z\d])/g,"x*");
  return s;
}
const used=e=>["a","b","c"].filter(k=>new RegExp("\\b"+k+"\\b").test(e));
function render(host,ctx){
  if(!document.getElementById("pl-css")){const s=document.createElement("style");s.id="pl-css";s.textContent=CSS;document.head.appendChild(s)}
  const order=ctx&&ctx.sid==="am"?[1,3,5,6,2,4,0,7,8]:[0,1,2,7,5,6,3,4,8];
  const st={f:"",g:"",p:{a:1,b:0,c:0},R:8,i:-1};
  host.classList.add("lab-plot");
  host.innerHTML=`<div class="pl-row">${order.map(i=>`<button type="button" class="pl-chip" data-i="${i}">${PRE[i][0]}</button>`).join("")}</div>
  <div class="pl-row"><label class="fine muted">y₁ =</label><input type="text" class="pl-f" placeholder="例如 x^2 - 4x + 3" autocapitalize="off" autocomplete="off" spellcheck="false"></div>
  <div class="pl-row"><label class="fine muted">y₂ =</label><input type="text" class="pl-g" placeholder="（可选）再画一条，看交点" autocapitalize="off" autocomplete="off" spellcheck="false"></div>
  <div class="pl-sls"></div>
  <div class="pl-row"><button type="button" class="btn small" data-z="in">＋ 放大</button><button type="button" class="btn small" data-z="out">－ 缩小</button><button type="button" class="btn small" data-z="rs">复位</button><span class="fine muted">支持 sin cos tan abs sqrt exp log(自然对数)、pi；写 2x 或 2*x 都行</span></div>
  <div class="pl-err" role="status"></div><div class="pl-box"></div>`;
  const box=host.querySelector(".pl-box"),err=host.querySelector(".pl-err"),sls=host.querySelector(".pl-sls"),fi=host.querySelector(".pl-f"),gi=host.querySelector(".pl-g");
  let busy=null;
  function sliders(){
    const u=[...new Set(used(st.f).concat(used(st.g)))];
    sls.innerHTML=u.map(k=>`<div class="pl-sl"><b>${k}</b><input type="range" min="-5" max="5" step="0.1" value="${st.p[k]}" data-k="${k}"><output>${st.p[k]}</output></div>`).join("");
  }
  function draw(){
    if(!window.functionPlot||!box.isConnected)return;
    const w=Math.max(260,box.clientWidth||host.clientWidth||320),h=Math.round(Math.min(360,w*.75)),ry=st.R*h/w,data=[];
    err.textContent="";
    [[st.f,"#2f55d4"],[st.g,"#c23b32"]].forEach(([e,col])=>{const x=prep(e,st.p);if(x)data.push({fn:x,color:col,graphType:"polyline"})});
    box.innerHTML="";
    if(!data.length){err.textContent="先选一个函数，或在 y₁ 里输入。";return}
    try{window.functionPlot({target:box,width:w,height:h,grid:true,disableZoom:true,xAxis:{domain:[-st.R,st.R]},yAxis:{domain:[-ry,ry]},data})}
    catch(e){box.innerHTML="";err.textContent="这个式子画不出来，检查一下括号和符号："+String(e.message||e).slice(0,80)}
  }
  function pick(i){const P=PRE[i];st.i=i;st.f=P[1];st.g="";st.p=Object.assign({a:1,b:0,c:0},P[2]);fi.value=P[1];gi.value="";
    host.querySelectorAll(".pl-chip").forEach(c=>c.classList.toggle("on",+c.dataset.i===i));sliders();draw()}
  host.addEventListener("click",e=>{
    const c=e.target.closest(".pl-chip"),z=e.target.closest("[data-z]");
    if(c)pick(+c.dataset.i);
    if(z){const k=z.dataset.z;st.R=k==="in"?Math.max(1,st.R/1.6):k==="out"?Math.min(200,st.R*1.6):8;draw()}});
  const typed=()=>{st.f=fi.value;st.g=gi.value;st.i=-1;host.querySelectorAll(".pl-chip").forEach(c=>c.classList.remove("on"));sliders();clearTimeout(busy);busy=setTimeout(draw,250)};
  fi.oninput=typed;gi.oninput=typed;
  sls.addEventListener("input",e=>{const r=e.target;if(!r.dataset.k)return;st.p[r.dataset.k]=+r.value;r.nextElementSibling.textContent=r.value;draw()});
  window.Labs.lib(LIB).then(()=>{pick(order[0])}).catch(()=>{err.textContent="函数图像库没加载成功（可能没有网络），联网后重新展开即可。"});
}
Labs.reg("plot",{render});
})();
