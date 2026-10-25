/* NASA 三维模型 · 航天章节：<model-viewer>（Apache-2.0，Google）。旋转、缩放看空间站、哈勃望远镜、火星车；手机还能「放进房间」（AR）。
   模型文件要自己放进仓库的 models/ 文件夹（每个几 MB，只放几个就好）：models/iss.glb、models/hubble.glb、models/perseverance.glb。
   查看器库只在展开卡片时才下载；模型文件要点「载入模型」才下载。想加新模型：在下面的 M 数组里照样子加一项就行。 */
(function(){
const LIB="https://cdn.jsdelivr.net/npm/@google/model-viewer@3.5.0/dist/model-viewer-umd.min.js";
const M=[
 {ico:"🛰️",n:"国际空间站 ISS",f:"models/iss.glb",
  bm:"Stesen Angkasa Antarabangsa (ISS)",
  facts:["在<b>近地轨道</b>上运行，离地面约 400 km，速度约 7.7 km/s，绕地球一圈约 90 分钟。","里面的宇航员会漂浮，<b>不是因为没有重力</b>，而是空间站和宇航员一起绕着地球不停地「自由下落」。","大片的太阳能电池板把太阳能转成电能，供整个空间站使用。","由多个国家合作建造和运行，用来做微重力下的科学实验。"]},
 {ico:"🔭",n:"哈勃太空望远镜",f:"models/hubble.glb",
  bm:"Teleskop Angkasa Hubble",
  facts:["1990 年发射，在离地面约 540 km 的近地轨道上绕地球运行。","在大气层<b>之上</b>观测，不受大气扰动和云层影响，所以拍到的星空特别清楚。","主镜直径约 2.4 m，观测可见光、紫外线和一部分红外线。","它是一颗<b>科学卫星</b>（天文观测）；课本里的其他卫星还有通信、气象、导航 (GPS)、遥感卫星。"]},
 {ico:"🚙",n:"毅力号火星车",f:"models/perseverance.glb",
  bm:"Penjelajah Marikh (Mars rover) Perseverance",
  facts:["2021 年 2 月降落在火星的杰泽罗陨石坑 (Jezero)，寻找远古生命的痕迹并采集岩石样本。","带了一架叫 Ingenuity 的小直升机，在火星上完成了首次动力飞行。","用<b>放射性同位素电池</b>供电，不是只靠太阳能板（火星离太阳远，还有沙尘暴）。","火星表面的重力比地球小得多，所以同一个物体在火星上的<b>重量</b>变轻，但<b>质量</b>不变。"]}
];
const CSS=`.lab-space .sp-row{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:8px 0}
.lab-space .sp-chip{border:1px solid var(--line);border-radius:999px;padding:3px 12px;font-size:12.5px;background:var(--sheet2)}
.lab-space .sp-chip.on{background:var(--blue-soft);border-color:var(--blue);font-weight:700}
.lab-space .sp-stage{width:100%;height:min(62vh,400px);border-radius:12px;overflow:hidden;background:radial-gradient(circle at 50% 40%,#1b2a52 0%,#0a1020 75%);display:flex;align-items:center;justify-content:center;color:#c9d6f2;font-size:13.5px;text-align:center;padding:10px;box-sizing:border-box}
.lab-space model-viewer{width:100%;height:100%;--poster-color:transparent;background:transparent}
.lab-space .sp-msg{font-size:13px;min-height:20px;color:var(--muted)}
.lab-space .sp-msg.bad{color:var(--bad)}
.lab-space .sp-facts ul{margin:6px 0 0 18px;padding:0}.lab-space .sp-facts li{margin:4px 0;font-size:13.5px;line-height:1.6}`;
function render(host){
  if(!document.getElementById("sp-css")){const s=document.createElement("style");s.id="sp-css";s.textContent=CSS;document.head.appendChild(s)}
  host.classList.add("lab-space");
  host.innerHTML=`<div class="sp-row">${M.map((m,i)=>`<button type="button" class="sp-chip${i?"":" on"}" data-i="${i}">${m.ico} ${m.n}</button>`).join("")}</div>
  <div class="sp-stage"><span class="sp-ph">选一个模型，点「载入模型」（每个模型几 MB，建议用 Wi-Fi）</span></div>
  <div class="sp-row"><button type="button" class="btn small pri" data-a="load">▶ 载入模型</button><button type="button" class="btn small" data-a="spin">⟳ 自转：开</button><button type="button" class="btn small" data-a="reset">复位视角</button></div>
  <div class="sp-msg" role="status"></div>
  <div class="sp-facts"></div>
  <p class="fine muted" style="margin:8px 0 0">拖动旋转，双指缩放。手机上如果出现 AR 按钮，可以把模型放进真实房间里看大小。模型来源：NASA 3D Resources（science.nasa.gov/3d-resources），请以每个模型页面上的使用说明为准。查看器：model-viewer。</p>`;
  const stage=host.querySelector(".sp-stage"),msg=host.querySelector(".sp-msg"),facts=host.querySelector(".sp-facts"),spinB=host.querySelector('[data-a="spin"]');
  let idx=0,mv=null,spin=true,libOK=false,libP=null;
  const say=(t,bad)=>{msg.className="sp-msg"+(bad?" bad":"");msg.textContent=t};
  function showFacts(){const m=M[idx];facts.innerHTML=`<div class="fine muted" style="margin-top:4px">${m.bm}</div><ul>${m.facts.map(x=>"<li>"+x+"</li>").join("")}</ul>`}
  function lib(){
    if(libOK)return Promise.resolve();
    return libP||(libP=window.Labs.lib(LIB).then(()=>{if(!window.customElements||!customElements.get("model-viewer"))throw new Error("no model-viewer");libOK=true}).catch(e=>{libP=null;throw e}));
  }
  function load(){
    say("加载 3D 查看器…");
    lib().then(()=>{
      const m=M[idx];stage.innerHTML="";mv=document.createElement("model-viewer");
      mv.setAttribute("src",m.f);mv.setAttribute("alt",m.n);mv.setAttribute("camera-controls","");mv.setAttribute("touch-action","pan-y");
      mv.setAttribute("shadow-intensity","0.6");mv.setAttribute("ar","");mv.setAttribute("ar-modes","webxr scene-viewer quick-look");
      if(spin)mv.setAttribute("auto-rotate","");
      mv.addEventListener("progress",e=>{const p=e.detail&&e.detail.totalProgress;if(p>0&&p<1)say("载入模型 "+Math.round(p*100)+"%")});
      mv.addEventListener("load",()=>say(""));
      mv.addEventListener("error",()=>{say("没找到模型文件 "+m.f+"。请把这个 .glb 文件放进仓库的 models 文件夹（和 index.html 同一层的 models/），名字要一致。",1)});
      stage.appendChild(mv);say("载入模型…");
    }).catch(()=>say("3D 查看器没加载成功（可能没有网络），联网后重新展开即可。",1));
  }
  host.addEventListener("click",e=>{
    const c=e.target.closest("[data-i]"),a=e.target.closest("[data-a]");
    if(c){idx=+c.dataset.i;host.querySelectorAll(".sp-chip").forEach(x=>x.classList.toggle("on",x===c));showFacts();say("");if(mv)load()}
    if(!a)return;const k=a.dataset.a;
    if(k==="load")load();
    if(k==="spin"){spin=!spin;spinB.textContent="⟳ 自转："+(spin?"开":"关");if(mv){spin?mv.setAttribute("auto-rotate",""):mv.removeAttribute("auto-rotate")}}
    if(k==="reset"&&mv){mv.cameraOrbit="auto auto auto";mv.fieldOfView="auto";if(mv.resetTurntableRotation)mv.resetTurntableRotation()}
  });
  showFacts();
}
Labs.reg("space",{render});
})();
