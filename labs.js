/* 实验室：笔记页底部的互动小工具卡片（周期表 / 函数图像 / 物理小实验）。
   本文件只负责「放哪里、什么时候加载」；每个工具是单独的文件，点开卡片才下载。 */
(function(){
const X=window.__spm||{},nQv=()=>X.nQ?X.nQ():"",S=new Proxy({},{get:(_,k)=>X.S()[k]});
const V="2026-10-26c";
const LABS={
  ptable:{ico:"🧪",t:"互动周期表",tag:"可点击",f:"lab-ptable.js"},
  plot:{ico:"📈",t:"函数图像实验室",tag:"可调参数",f:"lab-plot.js"},
  physics:{ico:"🎯",t:"物理小实验",tag:"可拖滑块",f:"lab-physics.js"},
  geo:{ico:"📐",t:"几何画板",tag:"可拖动点",f:"lab-geo.js"},
  mol:{ico:"⚛️",t:"分子结构 2D / 3D",tag:"可旋转",f:"lab-mol.js"},
  phet:{ico:"🎛️",t:"PhET 互动模拟",tag:"需联网",f:"lab-phet.js"},
  mmap:{ico:"🗺️",t:"笔记思维导图",tag:"一键生成",f:"lab-mmap.js"},
  ocr:{ico:"📷",t:"拍照识字 (OCR)",tag:"本机识别",f:"lab-ocr.js"},
  mathin:{ico:"✍️",t:"数学公式输入",tag:"可视键盘",f:"lab-mathin.js"},
  cas:{ico:"🧮",t:"代数核对 (符号计算)",tag:"展开 / 因式分解 / 求导",f:"lab-cas.js"},
  kekule:{ico:"🧬",t:"化学结构编辑器",tag:"可画结构",f:"lab-kekule.js"},
  mermaid:{ico:"🔀",t:"流程图 / 时间线",tag:"可编辑 · AI 画图",f:"lab-mermaid.js"},
  space:{ico:"🚀",t:"NASA 三维模型 · 航天",tag:"可旋转 · AR",f:"lab-space.js"}
};
const MAP={kim:["ptable","mol","kekule","mermaid","mathin","phet","mmap","ocr"],sains:["space","ptable","physics","mol","kekule","mermaid","mathin","phet","mmap","ocr"],mat:["plot","geo","cas","mathin","phet","mmap","ocr"],am:["plot","geo","cas","mathin","phet","mmap","ocr"],fiz:["physics","mermaid","mathin","phet","mmap","ocr"],bio:["mermaid","phet","mmap","ocr"],bm:["mmap","ocr"],bi:["mmap","ocr"],bc:["mmap","ocr"],sej:["mermaid","mmap","ocr"],moral:["mmap","ocr"]};
const mods={},loads={};
function loadJS(src){return loads[src]||(loads[src]=new Promise((ok,no)=>{const s=document.createElement("script");s.src=src;s.onload=ok;s.onerror=()=>{delete loads[src];no(new Error("load "+src))};document.head.appendChild(s)}))}
function reg(id,mod){mods[id]=mod}
function mount(sid,searching){
  document.querySelectorAll(".lab-wrap").forEach(x=>x.remove());
  const list=document.getElementById("chapList"),ids=MAP[sid];
  if(searching||!list||!ids)return;
  const wrap=document.createElement("div");wrap.className="lab-wrap";wrap.style.marginTop="14px";
  ids.forEach(id=>{
    const L=LABS[id],d=document.createElement("details");d.className="chap lab";let started=false;
    d.innerHTML=`<summary><span class="t">${L.ico} ${L.t} <span class="tag blue">${L.tag}</span></span></summary><div class="body"></div>`;
    d.addEventListener("toggle",()=>{
      if(!d.open||started)return;started=true;const body=d.querySelector(".body");
      body.innerHTML='<p class="fine muted">加载中…</p>';
      loadJS(L.f+"?v="+V).then(()=>{body.innerHTML="";mods[id].render(body,{sid})})
        .catch(e=>{started=false;body.innerHTML='<p class="fine">加载失败，请检查网络后重新展开。<br><span class="muted">'+String(e.message||e)+"</span></p>"});
    });
    wrap.appendChild(d);
  });
  list.parentNode.insertBefore(wrap,list.nextSibling);
}
const cssd={};function loadCSS(h){if(cssd[h])return;cssd[h]=1;const l=document.createElement("link");l.rel="stylesheet";l.href=h;document.head.appendChild(l)}
window.Labs={mount,reg,lib:loadJS,css:loadCSS};
try{if(X.S&&document.getElementById("chapList")&&!nQv())mount(S.sub,false)}catch(e){console.warn("labs",e)}
})();
