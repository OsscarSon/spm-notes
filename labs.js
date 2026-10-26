/* 实验室：笔记页底部的互动小工具卡片（周期表 / 函数图像 / 物理小实验）。
   本文件只负责「放哪里、什么时候加载」；每个工具是单独的文件，点开卡片才下载。 */
(function(){
const X=window.__spm||{},nQv=()=>X.nQ?X.nQ():"",S=new Proxy({},{get:(_,k)=>X.S()[k]});
const V="2026-10-26f";
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
  mermaid:{ico:"🔀",t:"流程图 / 时间线",tag:"可编辑 · AI 画图",f:"lab-mermaid.js"},
  bio3d:{ico:"🫀",t:"3D 细胞与人体 · 认部件",tag:"测验 · 可旋转",f:"lab-bio3d.js"},
  space:{ico:"🚀",t:"NASA 三维模型 · 认部件",tag:"测验 · 计算 · AR",f:"lab-space.js"}
};
const MAP={kim:["ptable","mol","mermaid","mathin","phet","mmap","ocr"],sains:["bio3d","ptable","physics","mol","mermaid","mathin","phet","mmap","ocr"],mat:["plot","geo","cas","mathin","phet","mmap","ocr"],am:["plot","geo","cas","mathin","phet","mmap","ocr"],fiz:["physics","mermaid","mathin","phet","mmap","ocr"],bio:["bio3d","mermaid","phet","mmap","ocr"],bm:["mmap","ocr"],bi:["mmap","ocr"],bc:["mmap","ocr"],sej:["mermaid","mmap","ocr"],moral:["mmap","ocr"]};
/* 只在相关章节里出现的实验室：id → {科目: 章节 key}。找不到对应章节（比如正在搜索）就不显示。 */
const CHAPLAB={space:{sains:["sains|T5-9"],fiz:["fiz|T4-3"]},
  bio3d:{bio:["bio|T4-2","bio|T4-4","bio|T4-9","bio|T4-10","bio|T4-12"],sains:["sains|T4-5","sains|T4-7","sains|T5-2"]}};
const mods={},loads={};
function loadJS(src){return loads[src]||(loads[src]=new Promise((ok,no)=>{const s=document.createElement("script");s.src=src;s.onload=ok;s.onerror=()=>{delete loads[src];no(new Error("load "+src))};document.head.appendChild(s)}))}
function reg(id,mod){mods[id]=mod}
function makeLab(id,sid,key){
  const L=LABS[id],d=document.createElement("details");d.className="chap lab";let started=false;
  d.innerHTML=`<summary><span class="t">${L.ico} ${L.t} <span class="tag blue">${L.tag}</span></span></summary><div class="body"></div>`;
  d.addEventListener("toggle",()=>{
    if(!d.open||started)return;started=true;const body=d.querySelector(".body");
    body.innerHTML='<p class="fine muted">加载中…</p>';
    loadJS(L.f+"?v="+V).then(()=>{body.innerHTML="";mods[id].render(body,{sid,key})})
      .catch(e=>{started=false;body.innerHTML='<p class="fine">加载失败，请检查网络后重新展开。<br><span class="muted">'+String(e.message||e)+"</span></p>"});
  });
  return d;
}
function mount(sid,searching){
  document.querySelectorAll(".lab-wrap").forEach(x=>x.remove());
  const list=document.getElementById("chapList"),ids=MAP[sid]||[];
  if(searching||!list)return;
  /* 章节专属实验室：放进对应章节展开后的内容里 */
  Object.keys(CHAPLAB).forEach(id=>{
    (CHAPLAB[id][sid]||[]).forEach(key=>{
      if(!LABS[id])return;
      const ch=[...document.querySelectorAll("details.chap[data-k]")].find(x=>x.dataset.k===key);if(!ch)return;
      const w=document.createElement("div");w.className="lab-wrap";w.style.marginTop="12px";w.appendChild(makeLab(id,sid,key));
      const body=ch.querySelector(".body");if(body)body.appendChild(w);
    });
  });
  if(!ids.length)return;
  const wrap=document.createElement("div");wrap.className="lab-wrap";wrap.style.marginTop="14px";
  ids.forEach(id=>wrap.appendChild(makeLab(id,sid,null)));
  list.parentNode.insertBefore(wrap,list.nextSibling);
}
const cssd={};function loadCSS(h){if(cssd[h])return;cssd[h]=1;const l=document.createElement("link");l.rel="stylesheet";l.href=h;document.head.appendChild(l)}
window.Labs={mount,reg,lib:loadJS,css:loadCSS};
try{if(X.S&&document.getElementById("chapList")&&!nQv())mount(S.sub,false)}catch(e){console.warn("labs",e)}
})();
