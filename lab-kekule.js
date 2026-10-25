/* 化学结构编辑器：Kekule.js（MIT）。用鼠标画结构式（原子、键、环），可导出 SMILES / MOL。
   预设分子用带 2D 坐标的 MOL 载入（SMILES 不带坐标，Kekule 没有额外组件时无法自动排版）。
   库和样式只在展开卡片时才从 CDN 下载（文件较大，建议用 Wi-Fi）。 */
(function(){
const BASE="https://cdn.jsdelivr.net/npm/kekule@1.0.2/dist/";
const LIB=BASE+"kekule.min.js?modules=chemWidget,algorithm",CSSF=BASE+"themes/default/kekule.css";
const R=(n,r,a0)=>Array.from({length:n},(_,i)=>{const t=(a0+360*i/n)*Math.PI/180;return[+(r*Math.cos(t)).toFixed(3),+(r*Math.sin(t)).toFixed(3)]});
const hex=R(6,1.4,90);
const PRE=[
 ["乙醇",[["C",0,0],["C",1.3,.75],["O",2.6,0]],[[1,2,1],[2,3,1]]],
 ["乙酸",[["C",0,0],["C",1.3,.75],["O",1.3,2.25],["O",2.6,0]],[[1,2,1],[2,3,2],[2,4,1]]],
 ["乙烯",[["C",0,0],["C",1.3,0]],[[1,2,2]]],
 ["苯",hex.map(p=>["C",p[0],p[1]]),[[1,2,2],[2,3,1],[3,4,2],[4,5,1],[5,6,2],[6,1,1]]],
 ["乙酸乙酯",[["C",0,0],["C",1.3,.75],["O",2.6,0],["C",3.9,.75],["C",5.2,0],["O",3.9,2.25]],[[1,2,1],[2,3,1],[3,4,1],[4,5,1],[4,6,2]]],
 ["葡萄糖",[["O",0,1.4],["C",1.212,.7],["C",1.212,-.7],["C",0,-1.4],["C",-1.212,-.7],["C",-1.212,.7],["O",2.424,1.4],["O",2.424,-1.4],["O",0,-2.8],["O",-2.424,-1.4],["C",-2.424,1.4],["O",-3.636,2.1]],
  [[1,2,1],[2,3,1],[3,4,1],[4,5,1],[5,6,1],[6,1,1],[2,7,1],[3,8,1],[4,9,1],[5,10,1],[6,11,1],[11,12,1]]]
];
const pad=(s,n)=>String(s).padStart(n," ");
function molfile(atoms,bonds){
  let t="\nlab\n\n"+pad(atoms.length,3)+pad(bonds.length,3)+"  0  0  0  0  0  0  0  0999 V2000\n";
  atoms.forEach(a=>{t+=pad(a[1].toFixed(4),10)+pad(a[2].toFixed(4),10)+pad("0.0000",10)+" "+String(a[0]).padEnd(3," ")+" 0  0  0  0  0  0  0  0  0  0  0  0\n"});
  bonds.forEach(b=>{t+=pad(b[0],3)+pad(b[1],3)+pad(b[2],3)+"  0\n"});
  return t+"M  END\n";
}
const CSS=`.lab-kekule .ke-row{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:8px 0}
.lab-kekule .ke-chip{border:1px solid var(--line);border-radius:999px;padding:3px 12px;font-size:12.5px;background:var(--sheet2)}
.lab-kekule .ke-box{width:100%;height:420px;border:1px solid var(--line);border-radius:12px;overflow:hidden;background:#fff}
.lab-kekule textarea{width:100%;min-height:70px;font-family:ui-monospace,Menlo,monospace;font-size:12.5px}
.lab-kekule .ke-msg{font-size:13px;min-height:20px}`;
function render(host){
  if(!document.getElementById("ke-css")){const s=document.createElement("style");s.id="ke-css";s.textContent=CSS;document.head.appendChild(s)}
  host.classList.add("lab-kekule");
  host.innerHTML=`<div class="ke-msg" role="status">加载结构编辑器…（文件较大，第一次要等一会儿）</div>
  <div class="ke-row"><span class="fine muted">载入：</span>${PRE.map((x,i)=>`<button type="button" class="ke-chip" data-i="${i}">${x[0]}</button>`).join("")}</div>
  <div class="ke-box"></div>
  <div class="ke-row"><button type="button" class="btn small pri" data-a="smi">导出 SMILES</button><button type="button" class="btn small" data-a="mol">导出 MOL</button><button type="button" class="btn small" data-a="load">载入下面的文本</button><button type="button" class="btn small" data-a="clr">清空画布</button></div>
  <textarea class="ke-ta" spellcheck="false" autocapitalize="off" placeholder="导出的 SMILES / MOL 会在这里。也可以粘贴 MOL 文本再点「载入」。"></textarea>
  <p class="fine muted" style="margin:6px 0 0">左侧工具栏选原子、键、环，再点画布。想看 SMILES 的漂亮结构式，请用「分子结构」卡片。结构编辑器：Kekule.js。</p>`;
  const msg=host.querySelector(".ke-msg"),ta=host.querySelector(".ke-ta"),box=host.querySelector(".ke-box");let C=null;
  const say=(t,bad)=>{msg.style.color=bad?"var(--bad)":"var(--muted)";msg.textContent=t};
  const K=()=>window.Kekule;
  function load(text,fmt,warn){
    if(!C){say("编辑器还没加载好，请稍等。",1);return}
    try{const m=K().IO.loadFormatData(text,fmt);if(!m)throw 0;C.setChemObj(m);say(warn||"")}
    catch(e){say("载入失败，检查文本格式。",1)}}
  function mols(){return C?(C.exportObjs(K().Molecule)||[]):[]}
  function exp(fmt){
    if(!C){say("编辑器还没加载好，请稍等。",1);return}
    try{const ms=mols();if(!ms.length){ta.value="";say("画布是空的，先画一个结构。",1);return}
      if(fmt==="smi"){ta.value=ms.map(m=>K().IO.saveFormatData(m,"smi")).join(".");say("")}
      else{ta.value=K().IO.saveFormatData(ms[0],"mol");say(ms.length>1?"画布上有 "+ms.length+" 个分子，MOL 只导出第一个。":"")}}
    catch(e){say("导出失败（结构可能不完整，或含有不支持的内容）。",1)}}
  window.Labs.css(CSSF);
  window.Labs.lib(LIB).then(()=>{
    let n=0;const t=setInterval(()=>{
      const k=K();
      if(k&&k.Editor&&k.Editor.Composer&&k.IO&&k.Widget){clearInterval(t);
        try{C=new k.Editor.Composer(box);C.setDimension("100%","420px");say("")}catch(e){say("编辑器启动失败："+String(e.message||e).slice(0,60),1)}}
      else if(++n>200){clearInterval(t);say("编辑器组件加载太慢或失败（可能网络不稳），联网后重新展开再试。",1)}
    },150);
  }).catch(()=>say("结构编辑器没加载成功（可能没有网络），联网后重新展开即可。",1));
  host.addEventListener("click",e=>{
    const c=e.target.closest("[data-i]"),a=e.target.closest("[data-a]");
    if(c){const p=PRE[+c.dataset.i];load(molfile(p[1],p[2]),"mol")}
    if(!a)return;const k=a.dataset.a;
    if(k==="smi")exp("smi");if(k==="mol")exp("mol");
    if(k==="load"&&ta.value.trim()){const s=ta.value.trim();
      /M\s+END|V2000|V3000/.test(s)?load(s,"mol"):load(s,"smi","这是 SMILES：它不带坐标，原子可能会叠在一起（Kekule 的自动排版需要额外组件）。想看排好版的结构，请用上面的预设、自己画，或用「分子结构」卡片。")}
    if(k==="clr"&&C){try{C.newDoc?C.newDoc():C.setChemObj(new (K().ChemSpace)())}catch(err){say("清空失败。",1)}}
  });
}
Labs.reg("kekule",{render});
})();
