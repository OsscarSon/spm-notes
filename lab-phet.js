/* PhET 互动模拟：科罗拉多大学博尔德分校（CC-BY 4.0）。用 iframe 嵌入官方页面，不下载任何库；
   点「开始模拟」才会连接 PhET，需要网络。 */
(function(){
const BASE="https://phet.colorado.edu/sims/html/";
const G={
  phy:["物理",[["projectile-motion","抛体运动"],["forces-and-motion-basics","力与运动"],["energy-skate-park-basics","能量滑板公园"],["pendulum-lab","单摆"],["circuit-construction-kit-dc","直流电路"],["wave-on-a-string","弦上的波"],["bending-light","光的折射"],["gravity-and-orbits","重力与轨道"],["balloons-and-static-electricity","气球与静电"],["friction","摩擦"]]],
  chem:["化学",[["build-an-atom","构建原子"],["isotopes-and-atomic-mass","同位素与原子质量"],["states-of-matter","物态变化"],["balancing-chemical-equations","配平化学方程式"],["ph-scale","pH 值"],["acid-base-solutions","酸碱溶液"],["molarity","摩尔浓度"],["reactants-products-and-leftovers","反应物 · 产物 · 剩余物"],["molecule-polarity","分子极性"],["molecule-shapes","分子形状"]]],
  bio:["生物 / 地球",[["natural-selection","自然选择"],["gene-expression-essentials","基因表达基础"],["plate-tectonics","板块构造"]]],
  math:["数学",[["graphing-lines","直线图像"],["graphing-quadratics","二次函数图像"],["trig-tour","三角函数巡礼"],["equation-grapher","方程图像"],["plinko-probability","概率钉板"]]]
};
const BY={fiz:["phy"],kim:["chem"],bio:["bio"],mat:["math"],am:["math"],sains:["phy","chem","bio"]};
const CSS=`.lab-phet .pe-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:8px}
.lab-phet select{flex:1;min-width:160px}
.lab-phet .pe-box{border:1px solid var(--line);border-radius:12px;overflow:hidden;background:var(--sheet2);min-height:120px;display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:13.5px;text-align:center;padding:10px}
.lab-phet iframe{width:100%;height:min(72vh,520px);border:0;display:block;background:#fff}`;
function render(host,ctx){
  if(!document.getElementById("pe-css")){const s=document.createElement("style");s.id="pe-css";s.textContent=CSS;document.head.appendChild(s)}
  const gs=BY[ctx&&ctx.sid]||["phy","chem","bio","math"];
  host.classList.add("lab-phet");
  host.innerHTML=`<div class="pe-row"><select class="pe-sel" aria-label="选择模拟">${gs.map(k=>`<optgroup label="${G[k][0]}">${G[k][1].map(x=>`<option value="${x[0]}">${x[1]}</option>`).join("")}</optgroup>`).join("")}</select>
  <button type="button" class="btn small pri" data-a="go">▶ 开始模拟</button><a class="btn small" data-a="open" target="_blank" rel="noopener">↗ 新窗口</a></div>
  <div class="pe-box">选一个模拟，点「开始模拟」（需要网络）</div>
  <p class="fine muted" style="margin:8px 0 0">模拟来自 PhET Interactive Simulations，科罗拉多大学博尔德分校（<a href="https://phet.colorado.edu" target="_blank" rel="noopener">phet.colorado.edu</a>，CC-BY 4.0）。如果手机里显示空白，点「新窗口」直接打开官网。</p>`;
  const sel=host.querySelector(".pe-sel"),box=host.querySelector(".pe-box"),open=host.querySelector('[data-a="open"]');
  const page=()=>"https://phet.colorado.edu/zh_CN/simulations/"+sel.value;
  const sync=()=>{open.href=page()};sync();sel.onchange=()=>{sync();if(box.querySelector("iframe"))go()};
  function go(){
    if(!navigator.onLine){box.textContent="现在没有网络，PhET 模拟需要联网才能打开。";return}
    const id=sel.value;box.style.padding="0";box.style.display="block";
    box.innerHTML=`<iframe title="PhET ${id}" allowfullscreen loading="lazy" sandbox="allow-scripts allow-same-origin allow-popups allow-forms" referrerpolicy="no-referrer" src="${BASE}${id}/latest/${id}_all.html?locale=zh_CN"></iframe>`;
  }
  host.querySelector('[data-a="go"]').onclick=go;
}
Labs.reg("phet",{render});
})();
