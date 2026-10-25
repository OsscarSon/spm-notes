/* 代数核对：Nerdamer（MIT）符号计算。展开、因式分解、化简、求导、积分、解方程，
   还能检查两个式子是不是恒等（做完作业核对用）。库只在展开卡片时才从 CDN 下载。 */
(function(){
const B="https://cdn.jsdelivr.net/npm/nerdamer@1.1.13/";
const LIBS=["nerdamer.core.js","Algebra.js","Calculus.js","Solve.js"].map(f=>B+f);
const CSS=`.lab-cas .cs-row{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:8px 0}
.lab-cas input[type=text]{flex:1;min-width:150px}
.lab-cas input.cs-v{flex:0 0 56px;min-width:56px;text-align:center}
.lab-cas .cs-out{background:var(--sheet2);border:1px solid var(--line);border-radius:12px;padding:10px;min-height:44px;overflow-x:auto;word-break:break-all}
.lab-cas .cs-msg{font-size:13px;min-height:20px;color:var(--bad)}
.lab-cas .cs-ok{color:#1a7f37;font-weight:700}.lab-cas .cs-no{color:var(--bad);font-weight:700}
.lab-cas hr{border:0;border-top:1px dashed var(--line);margin:12px 0}`;
const norm=s=>String(s).replace(/²/g,"^2").replace(/³/g,"^3").replace(/×/g,"*").replace(/÷/g,"/").replace(/−/g,"-").replace(/\bsqrt\b/g,"sqrt").replace(/(\d)([a-zA-Z(])/g,"$1*$2").replace(/\)(\w|\()/g,")*$1");
function render(host){
  if(!document.getElementById("cs-css")){const s=document.createElement("style");s.id="cs-css";s.textContent=CSS;document.head.appendChild(s)}
  host.classList.add("lab-cas");
  host.innerHTML=`<div class="cs-msg" role="status">加载符号计算库…</div>
  <div class="cs-row"><input type="text" class="cs-e" value="(x+2)^2-(x-1)(x+3)" autocapitalize="off" autocomplete="off" spellcheck="false" placeholder="例如 (x+1)^2"><label class="fine muted">变量</label><input type="text" class="cs-v" value="x" autocapitalize="off"></div>
  <div class="cs-row"><button type="button" class="btn small pri" data-o="expand">展开</button><button type="button" class="btn small pri" data-o="factor">因式分解</button><button type="button" class="btn small" data-o="simplify">化简</button><button type="button" class="btn small" data-o="diff">求导</button><button type="button" class="btn small" data-o="int">积分</button><button type="button" class="btn small" data-o="solve">解方程 (=0)</button></div>
  <div class="cs-out cs-r">结果会出现在这里。写法：乘号 *，乘方 ^，开方 sqrt(x)，分数用 /。解方程时，可写 x^2-5x+6=0。</div>
  <hr><div class="fine muted" style="margin-bottom:4px">✅ 核对两个式子是否相等（检查自己的答案）</div>
  <div class="cs-row"><input type="text" class="cs-a" placeholder="我的答案，例如 x^2+2x+1" autocapitalize="off" spellcheck="false"></div>
  <div class="cs-row"><input type="text" class="cs-b" placeholder="标准答案，例如 (x+1)^2" autocapitalize="off" spellcheck="false"><button type="button" class="btn small pri" data-o="eq">核对</button></div>
  <div class="cs-out cs-q"></div>
  <p class="fine muted" style="margin:8px 0 0">符号计算库：Nerdamer。复杂式子可能算不出来或结果形式不同，仅作核对参考。</p>`;
  const msg=host.querySelector(".cs-msg"),E=host.querySelector(".cs-e"),V=host.querySelector(".cs-v"),R=host.querySelector(".cs-r"),Q=host.querySelector(".cs-q");
  let N=null;
  const tex=(x,el)=>{const t=(()=>{try{return x.toTeX()}catch(e){return null}})(),s=x.toString();
    if(t&&window.katex){try{el.innerHTML=window.katex.renderToString(t,{throwOnError:true,displayMode:false})+'<div class="fine muted" style="margin-top:6px">'+s.replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]))+"</div>";return}catch(e){}}
    el.textContent=s};
  function run(op){
    if(!N){msg.textContent="符号计算库还没加载好。";return}
    msg.textContent="";const v=(V.value.trim()||"x"),src=norm(E.value.trim());if(!src){msg.textContent="先输入一个式子。";return}
    try{let r;
      if(op==="expand")r=N("expand("+src+")");
      else if(op==="factor")r=N.factor(src);
      else if(op==="simplify")r=N("simplify("+src+")");
      else if(op==="diff")r=N.diff(src,v);
      else if(op==="int"){r=N.integrate(src,v);const t=r.toString();R.dataset.int=1;tex(r,R);R.insertAdjacentHTML("beforeend",'<div class="fine muted">+ C（不定积分，别忘了常数）</div>');return}
      else if(op==="solve"){const eq=src.includes("=")?src:src+"=0";const s=N.solve(eq,v);R.textContent=v+" = "+s.toString().replace(/^\[|\]$/g,"").split(",").join("  或  ");return}
      tex(r,R);
    }catch(e){R.textContent="";msg.textContent="算不出来，检查写法（乘号用 *，乘方用 ^）。"}
  }
  function eq(){
    const a=norm(host.querySelector(".cs-a").value.trim()),b=norm(host.querySelector(".cs-b").value.trim());
    if(!N||!a||!b){Q.textContent="两个式子都要填。";return}
    try{
      const d=N("expand(("+a+")-("+b+"))").toString();
      if(d==="0"){Q.innerHTML='<span class="cs-ok">✔ 两个式子恒等</span>';return}
      const dd=N("simplify(("+a+")-("+b+"))").toString();
      if(dd==="0"){Q.innerHTML='<span class="cs-ok">✔ 两个式子恒等（化简后相同）</span>';return}
      // 数值抽样兜底
      const vars=[...new Set((a+" "+b).replace(/sqrt|sin|cos|tan|log|ln|abs|pi|exp/g,"").match(/[a-zA-Z]/g)||[])];let same=true,n=0;
      for(const t of [1.3,2.7,-0.9,4.1]){const sub={};vars.forEach((k,i)=>sub[k]=t+i*0.7);
        try{const x=+N(a,sub).evaluate().text("decimals"),y=+N(b,sub).evaluate().text("decimals");if(!isFinite(x)||!isFinite(y))continue;n++;if(Math.abs(x-y)>1e-6*Math.max(1,Math.abs(x),Math.abs(y))){same=false;break}}catch(e){}}
      if(n>=3&&same)Q.innerHTML='<span class="cs-ok">✔ 数值抽样一致</span><div class="fine muted">符号上没能证明恒等，但多个点代入结果相同。</div>';
      else Q.innerHTML='<span class="cs-no">✘ 不相等</span><div class="fine muted">两式之差化简为：'+dd.replace(/[&<>]/g,"")+"</div>";
    }catch(e){Q.textContent="算不出来，检查写法（乘号用 *，乘方用 ^）。"}
  }
  host.addEventListener("click",e=>{const o=e.target.closest("[data-o]");if(!o)return;o.dataset.o==="eq"?eq():run(o.dataset.o)});
  E.onkeydown=e=>{if(e.key==="Enter")run("expand")};
  LIBS.reduce((p,u)=>p.then(()=>window.Labs.lib(u)),Promise.resolve()).then(()=>{N=window.nerdamer;if(!N)throw 0;msg.textContent=""})
    .catch(()=>{msg.textContent="符号计算库没加载成功（可能没有网络），联网后重新展开即可。"});
}
Labs.reg("cas",{render});
})();
