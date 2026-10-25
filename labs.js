/* 实验室：笔记页底部的互动小工具卡片（周期表 / 函数图像 / 物理小实验）。
   本文件只负责「放哪里、什么时候加载」；每个工具是单独的文件，点开卡片才下载。 */
(function(){
const V="2026-10-25a";
const LABS={
  ptable:{ico:"🧪",t:"互动周期表",tag:"可点击",f:"lab-ptable.js"},
  plot:{ico:"📈",t:"函数图像实验室",tag:"可调参数",f:"lab-plot.js"},
  physics:{ico:"🎯",t:"物理小实验",tag:"可拖滑块",f:"lab-physics.js"}
};
const MAP={kim:["ptable"],sains:["ptable","physics"],mat:["plot"],am:["plot"],fiz:["physics"]};
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
window.Labs={mount,reg,lib:loadJS};
try{if(document.getElementById("chapList")&&!nQ)mount(S.sub,false)}catch(e){}
})();
