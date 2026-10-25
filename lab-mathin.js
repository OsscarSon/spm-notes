/* 数学公式输入：MathLive（MIT）。用可视键盘写公式，自动得到 LaTeX，可以复制去贴进笔记、作业或 AI 提问。
   库只在展开卡片时才从 CDN 下载。 */
(function(){
const LIB="https://cdn.jsdelivr.net/npm/mathlive@0.98.6/dist/mathlive.min.js";
const TPL=[["分数","\\frac{#?}{#?}"],["根号","\\sqrt{#?}"],["上标","#@^{#?}"],["下标","#@_{#?}"],["积分","\\int_{#?}^{#?}#?\\,dx"],["求和","\\sum_{#?}^{#?}#?"],["sin","\\sin\\left(#?\\right)"],["≤ ≥","\\le"],["π","\\pi"],["度 °","^\\circ"]];
const CSS=`.lab-mathin math-field{display:block;width:100%;font-size:24px;padding:8px 10px;border:1px solid var(--line);border-radius:12px;background:#fff;color:#222;min-height:56px}
.lab-mathin .mi-row{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:8px 0}
.lab-mathin .mi-chip{border:1px solid var(--line);border-radius:999px;padding:3px 12px;font-size:12.5px;background:var(--sheet2)}
.lab-mathin textarea{width:100%;min-height:64px;font-family:ui-monospace,Menlo,monospace;font-size:13px}
.lab-mathin .mi-msg{font-size:13px;min-height:20px;color:var(--bad)}`;
function render(host){
  if(!document.getElementById("mi-css")){const s=document.createElement("style");s.id="mi-css";s.textContent=CSS;document.head.appendChild(s)}
  host.classList.add("lab-mathin");
  host.innerHTML=`<div class="mi-msg" role="status">加载公式输入库…</div>
  <div class="mi-mf"></div>
  <div class="mi-row">${TPL.map((x,i)=>`<button type="button" class="mi-chip" data-i="${i}">${x[0]}</button>`).join("")}</div>
  <div class="fine muted">LaTeX（可直接修改，上面的公式会跟着变）</div>
  <textarea class="mi-ta" spellcheck="false" autocapitalize="off" placeholder="\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}"></textarea>
  <div class="mi-row"><button type="button" class="btn small pri" data-a="copy">复制 LaTeX</button><button type="button" class="btn small" data-a="copy2">复制 $…$</button><button type="button" class="btn small" data-a="demo">放一个例子</button><button type="button" class="btn small" data-a="clr">清空</button></div>
  <p class="fine muted" style="margin:6px 0 0">手机上点公式框会弹出数学键盘。公式输入库：MathLive。</p>`;
  const msg=host.querySelector(".mi-msg"),ta=host.querySelector(".mi-ta"),box=host.querySelector(".mi-mf");let mf=null;
  function copy(t){if(!t){msg.style.color="var(--muted)";msg.textContent="还没有公式。";return}
    (navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(()=>{msg.style.color="var(--muted)";msg.textContent="已复制"}).catch(()=>{ta.select();try{document.execCommand("copy")}catch(e){}msg.style.color="var(--muted)";msg.textContent="已复制"})}
  window.Labs.lib(LIB).then(()=>{
    if(!window.customElements||!customElements.get("math-field"))throw new Error("no mathlive");
    mf=document.createElement("math-field");mf.setAttribute("math-virtual-keyboard-policy","auto");box.appendChild(mf);
    try{if(window.MathfieldElement)MathfieldElement.soundsDirectory=null}catch(e){}
    mf.addEventListener("input",()=>{ta.value=mf.value});
    ta.addEventListener("input",()=>{try{mf.value=ta.value}catch(e){}});
    msg.textContent="";
  }).catch(()=>{msg.style.color="var(--bad)";msg.textContent="公式输入库没加载成功（可能没有网络），联网后重新展开即可。"});
  host.addEventListener("click",e=>{
    const c=e.target.closest("[data-i]"),a=e.target.closest("[data-a]");
    if(c&&mf){mf.focus();mf.insert(TPL[+c.dataset.i][1],{format:"latex"});ta.value=mf.value}
    if(!a)return;const k=a.dataset.a;
    if(k==="copy")copy(ta.value);if(k==="copy2")copy(ta.value?"$"+ta.value+"$":"");
    if(k==="clr"){ta.value="";if(mf)mf.value=""}
    if(k==="demo"){const d="x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}";ta.value=d;if(mf)mf.value=d}
  });
}
Labs.reg("mathin",{render});
})();
