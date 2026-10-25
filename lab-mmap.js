/* 笔记思维导图：Markmap（MIT）。把本科目已生成的 AI 笔记（Markdown）一键变成可缩放、可折叠的思维导图；
   也可以自己粘贴一段 Markdown。库只在展开卡片时才从 CDN 下载。 */
(function(){
const D3="https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js",VIEW="https://cdn.jsdelivr.net/npm/markmap-view@0.18/dist/browser/index.js",LIB="https://cdn.jsdelivr.net/npm/markmap-lib@0.18";
const CSS=`.lab-mm .mm-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:8px}
.lab-mm select{flex:1;min-width:160px}
.lab-mm textarea{width:100%;min-height:90px;margin-bottom:8px}
.lab-mm .mm-box{background:#fff;color:#222;border:1px solid var(--line);border-radius:12px;overflow:hidden}
.lab-mm svg{width:100%;height:min(62vh,440px);display:block}
.lab-mm .mm-msg{font-size:13px;min-height:20px;color:var(--bad)}`;
function render(host,ctx){
  if(!document.getElementById("mm-css")){const s=document.createElement("style");s.id="mm-css";s.textContent=CSS;document.head.appendChild(s)}
  host.classList.add("lab-mm");
  const X=window.__spm||{};let items=[];
  try{const S=X.S(),cs=X.chapsOf(ctx.sid);items=cs.filter(c=>S.notes[c.k]&&S.notes[c.k].md).map(c=>({t:c.t,md:S.notes[c.k].md}))}catch(e){}
  host.innerHTML=`<div class="mm-row">${items.length?`<select class="mm-sel" aria-label="选择章节"><option value="">选一章已生成的笔记…</option>${items.map((x,i)=>`<option value="${i}">${x.t.replace(/[&<>"]/g,"")}</option>`).join("")}</select>`:`<span class="fine muted">这一科还没有 AI 笔记，先生成一章，或在下面粘贴 Markdown。</span>`}
  <button type="button" class="btn small" data-a="fit">适合屏幕</button></div>
  <textarea class="mm-ta" placeholder="也可以直接粘贴 Markdown，用 # 和 - 分层，例如：&#10;# 光合作用&#10;## 条件&#10;- 光&#10;- 叶绿素"></textarea>
  <div class="mm-row"><button type="button" class="btn small pri" data-a="draw">画出思维导图</button></div>
  <div class="mm-msg" role="status"></div><div class="mm-box"><svg></svg></div>
  <p class="fine muted" style="margin:8px 0 0">拖动平移，滚轮 / 双指缩放，点节点圆点折叠。导图库：Markmap。</p>`;
  const msg=host.querySelector(".mm-msg"),svg=host.querySelector("svg"),ta=host.querySelector(".mm-ta"),sel=host.querySelector(".mm-sel");
  let MM=null,TR=null,mm=null;
  function draw(){
    if(!MM||!TR)return;const md=ta.value.trim();if(!md){msg.textContent="先选一章笔记，或粘贴一段 Markdown。";return}
    msg.textContent="";try{const{root}=TR.transform(md);svg.innerHTML="";mm=MM.create(svg,{maxWidth:260,initialExpandLevel:3,duration:300},root);setTimeout(()=>mm&&mm.fit&&mm.fit(),350)}
    catch(e){msg.textContent="画不出来："+String(e.message||e).slice(0,80)}
  }
  if(sel)sel.onchange=()=>{if(sel.value!==""){ta.value=items[+sel.value].md;draw()}};
  host.addEventListener("click",e=>{const a=e.target.closest("[data-a]");if(!a)return;if(a.dataset.a==="draw")draw();if(a.dataset.a==="fit"&&mm)mm.fit()});
  window.Labs.lib(D3).then(()=>window.Labs.lib(VIEW)).then(()=>{MM=window.markmap.Markmap;return window.Labs.lib(LIB)}).then(()=>{TR=new window.markmap.Transformer();msg.textContent=""}).catch(()=>{msg.textContent="思维导图库没加载成功（可能没有网络），联网后重新展开即可。"});
}
Labs.reg("mmap",{render});
})();
