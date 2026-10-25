/* 互动周期表：118 个元素的基本数据为自行整理（事实数据），无需第三方库、无需署名。
   点元素 → 质子/电子/中子数、电子排列（如 2.8.1）、子壳层、类别，并有玻尔模型动画。 */
(function(){
const SY="H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og".split(" ");
const ZH="氢 氦 锂 铍 硼 碳 氮 氧 氟 氖 钠 镁 铝 硅 磷 硫 氯 氩 钾 钙 钪 钛 钒 铬 锰 铁 钴 镍 铜 锌 镓 锗 砷 硒 溴 氪 铷 锶 钇 锆 铌 钼 锝 钌 铑 钯 银 镉 铟 锡 锑 碲 碘 氙 铯 钡 镧 铈 镨 钕 钷 钐 铕 钆 铽 镝 钬 铒 铥 镱 镥 铪 钽 钨 铼 锇 铱 铂 金 汞 铊 铅 铋 钋 砹 氡 钫 镭 锕 钍 镤 铀 镎 钚 镅 锔 锫 锎 锿 镄 钔 锘 铹".split(" ");
const EN="Hydrogen Helium Lithium Beryllium Boron Carbon Nitrogen Oxygen Fluorine Neon Sodium Magnesium Aluminium Silicon Phosphorus Sulfur Chlorine Argon Potassium Calcium Scandium Titanium Vanadium Chromium Manganese Iron Cobalt Nickel Copper Zinc Gallium Germanium Arsenic Selenium Bromine Krypton Rubidium Strontium Yttrium Zirconium Niobium Molybdenum Technetium Ruthenium Rhodium Palladium Silver Cadmium Indium Tin Antimony Tellurium Iodine Xenon Caesium Barium Lanthanum Cerium Praseodymium Neodymium Promethium Samarium Europium Gadolinium Terbium Dysprosium Holmium Erbium Thulium Ytterbium Lutetium Hafnium Tantalum Tungsten Rhenium Osmium Iridium Platinum Gold Mercury Thallium Lead Bismuth Polonium Astatine Radon Francium Radium Actinium Thorium Protactinium Uranium Neptunium Plutonium Americium Curium Berkelium Californium Einsteinium Fermium Mendelevium Nobelium Lawrencium Rutherfordium Dubnium Seaborgium Bohrium Hassium Meitnerium Darmstadtium Roentgenium Copernicium Nihonium Flerovium Moscovium Livermorium Tennessine Oganesson".split(" ");
const BM="Hidrogen Helium Litium Berilium Boron Karbon Nitrogen Oksigen Fluorin Neon Natrium Magnesium Aluminium Silikon Fosforus Sulfur Klorin Argon Kalium Kalsium".split(" ");
const MS="1.008 4.003 6.94 9.012 10.81 12.011 14.007 15.999 18.998 20.180 22.990 24.305 26.982 28.085 30.974 32.06 35.45 39.948 39.098 40.078 44.956 47.867 50.942 51.996 54.938 55.845 58.933 58.693 63.546 65.38 69.723 72.630 74.922 78.971 79.904 83.798 85.468 87.62 88.906 91.224 92.906 95.95 98 101.07 102.91 106.42 107.87 112.41 114.82 118.71 121.76 127.60 126.90 131.29 132.91 137.33 138.91 140.12 140.91 144.24 145 150.36 151.96 157.25 158.93 162.50 164.93 167.26 168.93 173.05 174.97 178.49 180.95 183.84 186.21 190.23 192.22 195.08 196.97 200.59 204.38 207.2 208.98 209 210 222 223 226 227 232.04 231.04 238.03 237 244 243 247 247 251 252 257 258 259 266 267 268 269 270 277 278 281 282 285 286 289 290 293 294 294".split(" ").map(Number);
const CATS={alk:["碱金属",0],ake:["碱土金属",25],tm:["过渡金属",50],ptm:["后过渡金属",120],lan:["镧系",85],act:["锕系",340],mtd:["类金属",170],nm:["非金属",200],hal:["卤素",245],ng:["稀有气体",285]};
const L={alk:[3,11,19,37,55,87],ake:[4,12,20,38,56,88],hal:[9,17,35,53,85,117],ng:[2,10,18,36,54,86,118],mtd:[5,14,32,33,51,52],nm:[1,6,7,8,15,16,34],ptm:[13,31,49,50,81,82,83,84,113,114,115,116]};
function cat(z){for(const k in L)if(L[k].includes(z))return k;if(z>=57&&z<=71)return"lan";if(z>=89&&z<=103)return"act";return"tm"}
function pos(z){
  if(z>=57&&z<=71)return[9,z-54];if(z>=89&&z<=103)return[10,z-86];
  const P=[[1,2],[3,10],[11,18],[19,36],[37,54],[55,86],[87,118]];let p=0;while(z>P[p][1])p++;
  const i=z-P[p][0],r=p+1;
  if(p===0)return[1,i?18:1];
  if(p<3)return[r,i<2?i+1:i+11];
  if(p<5)return[r,i+1];
  return[r,z<=(p===5?56:88)?i+1:z-(p===5?68:100)];
}
const ORD="1s 2s 2p 3s 3p 4s 3d 4p 5s 4d 5p 6s 4f 5d 6p 7s 5f 6d 7p".split(" "),CAP={s:2,p:6,d:10,f:14};
const MV={24:["4s>3d"],29:["4s>3d"],41:["5s>4d"],42:["5s>4d"],44:["5s>4d"],45:["5s>4d"],46:["5s>4d","5s>4d"],47:["5s>4d"],57:["4f>5d"],58:["4f>5d"],64:["4f>5d"],78:["6s>5d"],79:["6s>5d"],89:["5f>6d"],90:["5f>6d","5f>6d"],91:["5f>6d"],92:["5f>6d"],93:["5f>6d"],96:["5f>6d"],103:["6d>7p"]};
function config(z){
  const o={};let r=z;for(const s of ORD){if(r<=0)break;const n=Math.min(CAP[s[1]],r);o[s]=n;r-=n}
  (MV[z]||[]).forEach(m=>{const[a,b]=m.split(">");o[a]--;o[b]=(o[b]||0)+1});
  return o;
}
function shells(o){const a=[];for(const k in o)if(o[k]>0)a[+k[0]-1]=(a[+k[0]-1]||0)+o[k];return a.map(x=>x||0)}
function cfgHTML(o){return Object.keys(o).filter(k=>o[k]>0).sort((a,b)=>a[0]-b[0]||"spdf".indexOf(a[1])-"spdf".indexOf(b[1])).map(k=>k+"<sup>"+o[k]+"</sup>").join(" ")}
function bohr(z,sh){
  const n=sh.length,R0=26,step=(88-R0)/Math.max(n-1,1);let g="";
  sh.forEach((e,i)=>{const r=R0+i*step;let d="";
    for(let j=0;j<e;j++){const a=2*Math.PI*j/e+i*.7;d+=`<circle cx="${(100+r*Math.cos(a)).toFixed(1)}" cy="${(100+r*Math.sin(a)).toFixed(1)}" r="${e>18?2.4:3.4}" class="pt-e"/>`}
    g+=`<circle cx="100" cy="100" r="${r.toFixed(1)}" class="pt-orb"/><g class="pt-spin" style="animation-duration:${7+i*5}s;animation-direction:${i%2?"reverse":"normal"}">${d}</g>`});
  return`<svg viewBox="0 0 200 200" class="pt-bohr" role="img" aria-label="玻尔模型：${sh.join(".")}">${g}<circle cx="100" cy="100" r="15" class="pt-nuc"/><text x="100" y="104" text-anchor="middle" class="pt-nt">${z}+</text></svg>`;
}
const CSS=`.pt-wrap{--g:2px}.pt-scroll{overflow-x:auto;padding-bottom:6px;-webkit-overflow-scrolling:touch}
.pt-grid{display:grid;grid-template-columns:repeat(18,minmax(36px,1fr));grid-template-rows:repeat(7,auto) 12px repeat(2,auto);gap:var(--g);min-width:700px}
.pt-c{position:relative;aspect-ratio:1;padding:0;border:1px solid;border-radius:6px;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.05;color:var(--ink);transition:transform .12s,opacity .2s}
.pt-c i{position:absolute;left:3px;top:1px;font:500 8.5px/1 var(--sans);font-style:normal;opacity:.7}
.pt-c b{font:700 14px/1 var(--sans)}
.pt-c:hover{transform:scale(1.12);z-index:2}.pt-c.sel{outline:2.5px solid var(--ink);outline-offset:1px;z-index:3}.pt-c.dim{opacity:.16}
.pt-ph{display:flex;align-items:center;justify-content:center;font-size:9px;color:var(--muted);border:1px dashed var(--line);border-radius:6px}
.pt-top{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px}.pt-top input{max-width:190px}
.pt-chip{border:1px solid;border-radius:999px;padding:3px 10px;font-size:12px;background:transparent}.pt-chip.on{font-weight:700;outline:2px solid var(--ink)}
.pt-det{display:grid;grid-template-columns:auto 1fr auto;gap:14px;align-items:center;padding:12px;margin-bottom:12px;border-radius:14px;background:var(--sheet2);border:1px solid var(--line)}
.pt-big{width:96px;height:96px;border:2px solid;border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;line-height:1.1}
.pt-big i{position:absolute;left:7px;top:5px;font:600 13px var(--sans);font-style:normal}.pt-big b{font:700 38px/1 var(--sans)}.pt-big span{font-size:12px}
.pt-info{display:grid;grid-template-columns:auto 1fr;gap:3px 12px;font-size:13.5px;margin:0}.pt-info dt{color:var(--muted)}.pt-info dd{margin:0;font-weight:600}
.pt-bohr{width:150px;height:150px}.pt-orb{fill:none;stroke:var(--line);stroke-width:1}.pt-e{fill:var(--blue)}.pt-nuc{fill:var(--blue-soft);stroke:var(--blue);stroke-width:1.5}.pt-nt{font:700 11px var(--sans);fill:var(--blue)}
.pt-spin{transform-origin:100px 100px;animation:ptSpin linear infinite}@keyframes ptSpin{to{transform:rotate(360deg)}}
@media(max-width:640px){.pt-det{grid-template-columns:auto 1fr}.pt-bohr{grid-column:1/-1;margin:0 auto}}
@media(prefers-reduced-motion:reduce){.pt-spin{animation:none}}`+Object.keys(CATS).map(k=>{const h=CATS[k][1];return`.pt-c.${k},.pt-big.${k},.pt-chip.${k}{background:hsla(${h},70%,55%,.3);border-color:hsla(${h},70%,48%,.7)}`}).join("");
function render(host){
  if(!document.getElementById("pt-css")){const s=document.createElement("style");s.id="pt-css";s.textContent=CSS;document.head.appendChild(s)}
  let cells="";
  for(let z=1;z<=118;z++){const[r,c]=pos(z);cells+=`<button type="button" class="pt-c ${cat(z)}" data-z="${z}" style="grid-row:${r};grid-column:${c}" aria-label="${ZH[z-1]||EN[z-1]} ${SY[z-1]}"><i>${z}</i><b>${SY[z-1]}</b></button>`}
  cells+=`<div class="pt-ph" style="grid-row:6;grid-column:3">57–71</div><div class="pt-ph" style="grid-row:7;grid-column:3">89–103</div>`;
  host.innerHTML=`<div class="pt-wrap"><div class="pt-top"><input type="text" class="pt-q" placeholder="搜索：Na / 钠 / sodium / 11"><span class="fine muted">点元素看详情；点下面的颜色可高亮一类</span></div>
  <div class="pt-top pt-leg">${Object.keys(CATS).map(k=>`<button type="button" class="pt-chip ${k}" data-k="${k}">${CATS[k][0]}</button>`).join("")}</div>
  <div class="pt-det"></div><div class="pt-scroll"><div class="pt-grid">${cells}</div></div>
  <p class="fine muted" style="margin:8px 0 0">相对原子质量取常用值；超重元素（Z≥104）为预测或最长寿命同位素的质量数。中子数按「质量数取整 − 质子数」估算，同位素不同会有差别。</p></div>`;
  const det=host.querySelector(".pt-det"),st={k:null,q:""};
  function show(z){
    const o=config(z),sh=shells(o),m=MS[z-1],A=Math.round(m),c=cat(z),[r,col]=pos(z),f=c==="lan"||c==="act";
    host.querySelectorAll(".pt-c.sel").forEach(x=>x.classList.remove("sel"));
    const b=host.querySelector('.pt-c[data-z="'+z+'"]');if(b)b.classList.add("sel");
    const zh=z<=103?ZH[z-1]:"（超重元素）";
    det.innerHTML=`<div class="pt-big ${c}"><i>${z}</i><b>${SY[z-1]}</b><span>${EN[z-1]}</span></div>
    <dl class="pt-info"><dt>名称</dt><dd>${zh}${BM[z-1]?" · "+BM[z-1]:""}</dd>
    <dt>类别</dt><dd>${CATS[c][0]}</dd>
    <dt>位置</dt><dd>${f?"f 区（"+(c==="lan"?"镧系，第 6 周期":"锕系，第 7 周期")+"）":"第 "+col+" 族，第 "+r+" 周期"}</dd>
    <dt>质子 / 电子</dt><dd>${z} / ${z}</dd>
    <dt>相对原子质量</dt><dd>${m}（≈ ${A}）</dd>
    <dt>中子数（估）</dt><dd>${A-z}</dd>
    <dt>电子排列</dt><dd>${sh.join(".")}</dd>
    <dt>子壳层</dt><dd>${cfgHTML(o)}</dd></dl>${bohr(z,sh)}`;
  }
  function filt(){const q=st.q.toLowerCase();host.querySelectorAll(".pt-c").forEach(b=>{const z=+b.dataset.z;
    let ok=!st.k||cat(z)===st.k;
    if(ok&&q)ok=SY[z-1].toLowerCase()===q||String(z)===q||(ZH[z-1]||"").includes(q)||EN[z-1].toLowerCase().includes(q)||(BM[z-1]||"").toLowerCase().includes(q);
    b.classList.toggle("dim",!ok)})}
  host.addEventListener("click",e=>{
    const c=e.target.closest(".pt-c"),k=e.target.closest(".pt-chip");
    if(c)show(+c.dataset.z);
    if(k){st.k=st.k===k.dataset.k?null:k.dataset.k;host.querySelectorAll(".pt-chip").forEach(x=>x.classList.toggle("on",x.dataset.k===st.k));filt()}});
  host.querySelector(".pt-q").oninput=e=>{st.q=e.target.value.trim();filt();const m=[...host.querySelectorAll(".pt-c:not(.dim)")];if(st.q&&m.length===1)show(+m[0].dataset.z)};
  show(11);
}
Labs.reg("ptable",{render});
})();
