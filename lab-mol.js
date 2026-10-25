/* 分子实验室：SmilesDrawer（MIT）画 2D 结构式，3Dmol.js（BSD）看 3D 分子。
   内置小分子的 3D 坐标是自己整理的近似值；也可以用英文名从 PubChem 取 3D 结构（需联网）。库只在切到对应标签时才下载。 */
(function(){
const L2="https://cdn.jsdelivr.net/npm/smiles-drawer@1.0.10/dist/smiles-drawer.min.js",L3="https://cdn.jsdelivr.net/npm/3dmol@2.4.2/build/3Dmol-min.js";
const S2=[["水","O"],["甲烷","C"],["乙烯","C=C"],["乙炔","C#C"],["乙醇","CCO"],["乙酸","CC(=O)O"],["乙酸乙酯","CCOC(C)=O"],["苯","c1ccccc1"],["葡萄糖","OCC1OC(O)C(O)C(O)C1O"],["阿司匹林","CC(=O)Oc1ccccc1C(=O)O"],["咖啡因","Cn1cnc2c1c(=O)n(C)c(=O)n2C"]];
const xyz=a=>a.length+"\n\n"+a.map(x=>x[0]+" "+x[1].toFixed(4)+" "+x[2].toFixed(4)+" "+x[3].toFixed(4)).join("\n");
const ring=(n,r,z,off,el)=>Array.from({length:n},(_,i)=>{const t=2*Math.PI*i/n+off;return[el,r*Math.cos(t),r*Math.sin(t),z]});
const M3=[
 ["水 H₂O",xyz([["O",0,0,.117],["H",0,.757,-.469],["H",0,-.757,-.469]])],
 ["二氧化碳 CO₂",xyz([["C",0,0,0],["O",0,0,1.16],["O",0,0,-1.16]])],
 ["甲烷 CH₄",xyz([["C",0,0,0],["H",.629,.629,.629],["H",-.629,-.629,.629],["H",-.629,.629,-.629],["H",.629,-.629,-.629]])],
 ["氨 NH₃",xyz([["N",0,0,.116],["H",0,.939,-.271],["H",.813,-.47,-.271],["H",-.813,-.47,-.271]])],
 ["氯化氢 HCl",xyz([["H",0,0,0],["Cl",0,0,1.27]])],
 ["乙烷 C₂H₆",xyz([["C",0,0,.765],["C",0,0,-.765]].concat(ring(3,1.02,1.17,0,"H"),ring(3,1.02,-1.17,Math.PI/3,"H")).map(x=>x))],
 ["乙烯 C₂H₄",xyz([["C",0,0,.667],["C",0,0,-.667],["H",0,.923,1.238],["H",0,-.923,1.238],["H",0,.923,-1.238],["H",0,-.923,-1.238]])],
 ["乙炔 C₂H₂",xyz([["C",0,0,.6],["C",0,0,-.6],["H",0,0,1.66],["H",0,0,-1.66]])],
 ["苯 C₆H₆",xyz(ring(6,1.397,0,0,"C").concat(ring(6,2.481,0,0,"H")))]
];
const CSS=`.lab-mol .mo-tabs,.lab-mol .mo-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:8px}
.lab-mol .mo-tabs button,.lab-mol .mo-chip{border:1px solid var(--line);border-radius:999px;padding:3px 12px;font-size:12.5px;background:var(--sheet2)}
.lab-mol .mo-tabs button.on,.lab-mol .mo-chip.on{background:var(--blue-soft);border-color:var(--blue);font-weight:700}
.lab-mol input[type=text]{flex:1;min-width:150px}
.lab-mol .mo-cv{width:100%;display:block;background:#fff;border:1px solid var(--line);border-radius:12px}
.lab-mol .mo-3d{position:relative;width:100%;height:300px;background:#fff;border:1px solid var(--line);border-radius:12px;overflow:hidden}
.lab-mol .mo-msg{font-size:13px;min-height:20px;color:var(--bad)}`;
function render(host){
  if(!document.getElementById("mo-css")){const s=document.createElement("style");s.id="mo-css";s.textContent=CSS;document.head.appendChild(s)}
  const uid="mo"+Math.random().toString(36).slice(2,8);
  host.classList.add("lab-mol");
  host.innerHTML=`<div class="mo-tabs"><button type="button" data-m="2" class="on">2D 结构式</button><button type="button" data-m="3">3D 分子</button></div>
  <div class="mo-p2"><div class="mo-row">${S2.map((x,i)=>`<button type="button" class="mo-chip" data-i="${i}">${x[0]}</button>`).join("")}</div>
   <div class="mo-row"><label class="fine muted">SMILES</label><input type="text" class="mo-in" value="CCO" autocapitalize="off" autocomplete="off" spellcheck="false" placeholder="例如 CC(=O)O"></div>
   <canvas class="mo-cv" id="${uid}c" width="420" height="320"></canvas></div>
  <div class="mo-p3" style="display:none"><div class="mo-row">${M3.map((x,i)=>`<button type="button" class="mo-chip" data-j="${i}">${x[0]}</button>`).join("")}</div>
   <div class="mo-row"><input type="text" class="mo-q" placeholder="英文名从 PubChem 取，如 aspirin / glucose（需联网）" autocapitalize="off" autocomplete="off" spellcheck="false"><button type="button" class="btn small" data-a="q">搜索</button></div>
   <div class="mo-row"><button type="button" class="btn small" data-s="ball">球棍</button><button type="button" class="btn small" data-s="fill">空间填充</button><button type="button" class="btn small" data-s="line">线</button><button type="button" class="btn small" data-s="spin">⟳ 自转</button></div>
   <div class="mo-3d"></div></div>
  <div class="mo-msg" role="status"></div>
  <p class="fine muted" style="margin:6px 0 0">2D：SmilesDrawer；3D：3Dmol.js。内置 3D 坐标为近似值，仅作示意。</p>`;
  const msg=host.querySelector(".mo-msg"),inp=host.querySelector(".mo-in"),p2=host.querySelector(".mo-p2"),p3=host.querySelector(".mo-p3"),box=host.querySelector(".mo-3d");
  let drawer=null,v=null,sty="ball",spin=false,ok2=false,ok3=false;
  function draw2(){
    if(!drawer)return;msg.textContent="";const s=inp.value.replace(/\s+/g,"");
    const c=host.querySelector(".mo-cv");c.getContext("2d").clearRect(0,0,c.width,c.height);if(!s)return;
    try{window.SmilesDrawer.parse(s,t=>{try{drawer.draw(t,uid+"c","light",false)}catch(e){msg.textContent="这个 SMILES 画不出来，检查一下写法。"}},()=>{msg.textContent="SMILES 写法不对，检查括号、数字和大小写。"})}
    catch(e){msg.textContent="这个 SMILES 画不出来，检查一下写法。"}
  }
  function style(){if(!v)return;const m={ball:{stick:{radius:.15},sphere:{scale:.28}},fill:{sphere:{}},line:{line:{}}}[sty];v.setStyle({},m);v.render()}
  function show3(data,fmt,name){
    if(!v)return;v.removeAllModels();v.addModel(data,fmt);style();v.zoomTo();v.render();v.spin(spin);msg.textContent="";
    host.querySelectorAll(".mo-chip[data-j]").forEach(c=>c.classList.toggle("on",c.textContent===name))}
  function init3(){
    try{v=window.$3Dmol.createViewer(box,{backgroundColor:"white"});show3(M3[0][1],"xyz",M3[0][0])}
    catch(e){msg.textContent="这台设备打不开 3D 视图（可能不支持 WebGL）。"}
  }
  async function pub(){
    const n=host.querySelector(".mo-q").value.trim();if(!n||!v)return;msg.style.color="var(--muted)";msg.textContent="查询中…";
    try{const r=await fetch("https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/"+encodeURIComponent(n)+"/SDF?record_type=3d");
      if(!r.ok)throw new Error(r.status===404?"nf":"http");const t=await r.text();msg.style.color="var(--bad)";show3(t,"sdf","")}
    catch(e){msg.style.color="var(--bad)";msg.textContent=e.message==="nf"?"PubChem 没有找到这个名字的 3D 结构，试试英文名，或用上面的内置分子。":"查询失败（可能没有网络）。"}
  }
  function need(m){
    if(m==="2"&&!ok2){ok2=true;window.Labs.lib(L2).then(()=>{drawer=new window.SmilesDrawer.Drawer({width:420,height:320});draw2()}).catch(()=>{ok2=false;msg.textContent="结构式库没加载成功（可能没有网络），联网后重新展开即可。"})}
    if(m==="3"&&!ok3){ok3=true;window.Labs.lib(L3).then(init3).catch(()=>{ok3=false;msg.textContent="3D 库没加载成功（可能没有网络），联网后重新展开即可。"})}
  }
  host.addEventListener("click",e=>{
    const t=e.target.closest(".mo-tabs button"),c=e.target.closest("[data-i]"),j=e.target.closest("[data-j]"),s=e.target.closest("[data-s]"),a=e.target.closest("[data-a]");
    if(t){host.querySelectorAll(".mo-tabs button").forEach(b=>b.classList.toggle("on",b===t));p2.style.display=t.dataset.m==="2"?"":"none";p3.style.display=t.dataset.m==="3"?"":"none";msg.textContent="";need(t.dataset.m);if(t.dataset.m==="3"&&v){v.resize();v.render()}}
    if(c){const x=S2[+c.dataset.i];inp.value=x[1];host.querySelectorAll(".mo-chip[data-i]").forEach(b=>b.classList.toggle("on",b===c));draw2()}
    if(j){const x=M3[+j.dataset.j];show3(x[1],"xyz",x[0])}
    if(s){if(s.dataset.s==="spin"){spin=!spin;if(v)v.spin(spin)}else{sty=s.dataset.s;style()}}
    if(a)pub();
  });
  inp.oninput=()=>{host.querySelectorAll(".mo-chip[data-i]").forEach(b=>b.classList.remove("on"));draw2()};
  host.querySelector(".mo-q").onkeydown=e=>{if(e.key==="Enter")pub()};
  need("2");
}
Labs.reg("mol",{render});
})();
