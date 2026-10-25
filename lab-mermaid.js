/* 流程图 / 时间线：Mermaid（MIT）。内置各科模板，可直接改文字；也可以让 AI 把主题或某一章笔记画成图。
   库只在展开卡片时才从 CDN 下载（约 2–3 MB，建议用 Wi-Fi）。模板仅供参考，请对照课本修改。 */
(function(){
const LIB="https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.min.js";
const T={
photo:["光合作用",`flowchart LR
  L["光能"] --> C["叶绿体中的叶绿素"]
  C --> R["光反应"]
  W["水 H₂O"] --> R
  R -->|"释放"| O["氧气 O₂"]
  R -->|"提供 ATP 等能量"| D["暗反应"]
  CO["二氧化碳 CO₂"] --> D
  D --> G["葡萄糖"]`],
mitosis:["有丝分裂",`flowchart LR
  A["间期：DNA 复制"] --> B["前期：染色体出现"]
  B --> C["中期：染色体排在赤道板"]
  C --> D["后期：姐妹染色单体分开"]
  D --> E["末期：形成两个细胞核"]
  E --> F["胞质分裂"]
  F --> G["两个相同的子细胞"]`],
central:["DNA → 蛋白质",`flowchart LR
  A["DNA"] -->|"转录（细胞核）"| B["mRNA"]
  B -->|"翻译（核糖体）"| C["多肽 / 蛋白质"]
  A -->|"复制"| A`],
foodchain:["食物链与能量",`flowchart LR
  S["太阳"] --> P["生产者（植物）"]
  P --> C1["初级消费者"]
  C1 --> C2["次级消费者"]
  C2 --> C3["三级消费者"]
  P -.-> D["分解者"]
  C1 -.-> D
  C2 -.-> D
  C3 -.-> D`],
reflex:["反射弧",`flowchart LR
  A["刺激"] --> B["感受器"]
  B --> C["感觉神经元"]
  C --> D["中枢神经系统"]
  D --> E["运动神经元"]
  E --> F["效应器"]
  F --> G["反应"]`],
indep:["马来亚走向独立",`timeline
    title 马来亚走向独立
    1946 : 马来亚联邦 Malayan Union 成立
    1948 : 马来亚联合邦成立
    1955 : 第一次联邦立法议会选举
    1956 : 独立谈判代表团赴伦敦
    1957 : 8 月 31 日 马来亚独立
    1963 : 9 月 16 日 马来西亚成立`],
colony:["马六甲与殖民",`timeline
    title 马六甲与殖民时期
    1511 : 葡萄牙占领马六甲
    1641 : 荷兰占领马六甲
    1824 : 英荷条约
    1826 : 海峡殖民地成立`],
state:["物态变化",`flowchart LR
  S["固体"] -->|"熔化 吸热"| L["液体"]
  L -->|"凝固 放热"| S
  L -->|"沸腾 吸热"| G["气体"]
  G -->|"凝结 放热"| L
  S -->|"升华 吸热"| G
  G -->|"凝华 放热"| S`],
acid:["酸的化学性质",`flowchart LR
  A["酸"] --> N{"和什么反应？"}
  N -->|"碱"| N1["盐 + 水（中和反应）"]
  N -->|"活泼金属"| N2["盐 + 氢气"]
  N -->|"金属碳酸盐"| N3["盐 + 水 + 二氧化碳"]`],
contact:["接触法制硫酸",`flowchart TD
  A["硫燃烧 得到 SO₂"] --> B["SO₂ 催化氧化成 SO₃（V₂O₅，450 °C）"]
  B --> C["SO₃ 溶于浓硫酸 得到发烟硫酸"]
  C --> D["加水稀释 得到 H₂SO₄"]`],
energy:["水力发电的能量转换",`flowchart LR
  A["水的重力势能"] --> B["水的动能"]
  B --> C["涡轮机转动"]
  C --> D["发电机（电磁感应）"]
  D --> E["电能"]`],
em:["电磁波谱",`flowchart LR
  A["无线电波"] --> B["微波"] --> C["红外线"] --> D["可见光"] --> E["紫外线"] --> F["X 射线"] --> G["伽马射线"]`],
water:["水循环",`flowchart LR
  A["海洋 / 湖泊"] -->|"蒸发"| B["水蒸气"]
  B -->|"凝结"| C["云"]
  C -->|"降水"| D["雨 / 雪"]
  D -->|"径流 / 渗透"| A`]
};
const BY={bio:["photo","mitosis","central","foodchain","reflex"],sej:["indep","colony"],kim:["state","acid","contact"],fiz:["energy","em"],sains:["photo","foodchain","state","water","energy"]};
const CSS=`.lab-mermaid .mr-row{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:8px 0}
.lab-mermaid .mr-chip{border:1px solid var(--line);border-radius:999px;padding:3px 12px;font-size:12.5px;background:var(--sheet2)}
.lab-mermaid .mr-chip.on{background:var(--blue-soft);border-color:var(--blue);font-weight:700}
.lab-mermaid textarea{width:100%;min-height:150px;font-family:ui-monospace,Menlo,monospace;font-size:12.5px}
.lab-mermaid input[type=text]{flex:1;min-width:160px}.lab-mermaid select{flex:1;min-width:150px}
.lab-mermaid .mr-out{background:#fff;color:#222;border:1px solid var(--line);border-radius:12px;padding:10px;overflow:auto;min-height:90px}
.lab-mermaid .mr-out svg{max-width:100%;height:auto;display:block;margin:0 auto}
.lab-mermaid .mr-msg{font-size:13px;min-height:20px}`;
function svgToPng(svg,done){
  const m=/viewBox="([\d.\-\s]+)"/.exec(svg);if(!m)return done(null);
  const v=m[1].trim().split(/\s+/).map(Number),w=Math.ceil(v[2]),h=Math.ceil(v[3]);if(!(w>0&&h>0))return done(null);
  const s=svg.replace(/<svg([^>]*)>/,(x,a)=>"<svg"+a.replace(/\swidth="[^"]*"/,"").replace(/\sheight="[^"]*"/,"").replace(/\sstyle="[^"]*"/,"")+' width="'+w+'" height="'+h+'">');
  const k=Math.min(3,Math.max(1,2000/w)),img=new Image();
  img.onload=()=>{try{const c=document.createElement("canvas");c.width=Math.round(w*k);c.height=Math.round(h*k);const g=c.getContext("2d");g.fillStyle="#fff";g.fillRect(0,0,c.width,c.height);g.drawImage(img,0,0,c.width,c.height);c.toBlob(b=>done(b),"image/png")}catch(e){done(null)}};
  img.onerror=()=>done(null);img.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(s);
}
function save(blob,name){const u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000)}
function render(host,ctx){
  if(!document.getElementById("mr-css")){const s=document.createElement("style");s.id="mr-css";s.textContent=CSS;document.head.appendChild(s)}
  host.classList.add("lab-mermaid");
  const B=window.__spm||{},ids=BY[ctx&&ctx.sid]||BY.bio,canAI=!!(B.gem&&B.gemOK);
  let items=[];try{const S=B.S(),cs=B.chapsOf(ctx.sid);items=cs.filter(c=>S.notes[c.k]&&S.notes[c.k].md).map(c=>({t:c.t,md:S.notes[c.k].md}))}catch(e){}
  host.innerHTML=`<div class="mr-row"><span class="fine muted">模板：</span>${ids.map(i=>`<button type="button" class="mr-chip" data-t="${i}">${T[i][0]}</button>`).join("")}</div>
  ${canAI?`<div class="mr-row"><input type="text" class="mr-topic" placeholder="想画什么？例如：蛋白质合成的过程 / 日本占领马来亚" autocapitalize="off"><button type="button" class="btn small pri" data-a="ai">🤖 AI 画图</button></div>
  ${items.length?`<div class="mr-row"><select class="mr-sel" aria-label="选一章笔记"><option value="">或选一章已生成的笔记…</option>${items.map((x,i)=>`<option value="${i}">${x.t.replace(/[&<>"]/g,"")}</option>`).join("")}</select><button type="button" class="btn small" data-a="ainote">🤖 把这章画成图</button></div>`:""}`:""}
  <textarea class="mr-ta" spellcheck="false" autocapitalize="off" placeholder="Mermaid 代码会在这里，直接改文字，图会跟着变。"></textarea>
  <div class="mr-msg" role="status">加载 Mermaid…（约 2–3 MB，第一次要等一会儿）</div>
  <div class="mr-out"></div>
  <div class="mr-row"><button type="button" class="btn small" data-a="copy">复制代码</button><button type="button" class="btn small" data-a="svg">下载 SVG</button><button type="button" class="btn small" data-a="png">保存 PNG 图片</button></div>
  <p class="fine muted" style="margin:6px 0 0">节点文字请用双引号包住，例如 A["光反应"]。AI 画的图可能有错，请对照课本检查。图表库：Mermaid。</p>`;
  const ta=host.querySelector(".mr-ta"),out=host.querySelector(".mr-out"),msg=host.querySelector(".mr-msg");
  let M=null,tok=0,seq=0,svg="",timer=0;
  const say=(t,bad)=>{msg.style.color=bad?"var(--bad)":"var(--muted)";msg.textContent=t};
  async function draw(){
    const my=++tok,code=ta.value.trim();if(!M)return{ok:false,err:"库还没加载好"};
    if(!code){out.innerHTML="";svg="";say("");return{ok:true}}
    const id="mr"+Date.now().toString(36)+(++seq);
    try{const r=await M.render(id,code);if(my!==tok)return{ok:true};out.innerHTML=r.svg;svg=r.svg;say("");return{ok:true}}
    catch(e){const d=document.getElementById("d"+id);if(d)d.remove();const x=document.getElementById(id);if(x)x.remove();
      const err=String((e&&e.message)||e).split("\n")[0].slice(0,120);if(my===tok)say("语法有误，图没更新："+err,1);return{ok:false,err}}
  }
  const later=()=>{clearTimeout(timer);timer=setTimeout(draw,450)};
  ta.addEventListener("input",()=>{host.querySelectorAll(".mr-chip").forEach(c=>c.classList.remove("on"));later()});
  const clean=t=>String(t||"").replace(/```(?:mermaid)?/gi,"").trim();
  async function ai(src,btn){
    if(!M){say("库还没加载好，请稍等。",1);return}
    if(btn)btn.disabled=true;say("AI 正在画图…");
    const rule="只输出 Mermaid 代码，不要用 ``` 包裹，不要任何解释。规则：过程或关系用 flowchart LR 或 flowchart TD；按年份的事件用 timeline；节点文字全部用双引号包住，如 A[\"文字\"]；节点 ID 只用英文字母和数字；每个节点文字不超过 16 个字；节点不超过 12 个；用中文（专有名词可附英文或马来文）。";
    const sys="你是 SPM 备考助教，擅长把知识画成清楚的流程图或时间线。";
    try{
      let code=clean(await B.gem([{role:"user",parts:[{text:rule+"\n\n要画的内容：\n"+src}]}],sys,2500));
      ta.value=code;let r=await draw();
      if(!r.ok){say("第一次的语法有点问题，AI 正在修正…");
        code=clean(await B.gem([{role:"user",parts:[{text:rule+"\n\n下面的 Mermaid 代码有语法错误（"+r.err+"），请修正后只输出完整代码：\n"+code}]}],sys,2500));
        ta.value=code;r=await draw()}
      if(r.ok)say("画好了。可以直接改文字，或下载保存。AI 画的图请对照课本检查。")
    }catch(e){say("AI 画图失败："+String((e&&e.message)||e).slice(0,80),1)}
    if(btn)btn.disabled=false;
  }
  host.addEventListener("click",e=>{
    const c=e.target.closest("[data-t]"),a=e.target.closest("[data-a]");
    if(c){ta.value=T[c.dataset.t][1];host.querySelectorAll(".mr-chip").forEach(x=>x.classList.toggle("on",x===c));draw()}
    if(!a)return;const k=a.dataset.a;
    if(k==="ai"){const q=host.querySelector(".mr-topic").value.trim();if(!q){say("先写一下想画什么。",1);return}ai(q,a)}
    if(k==="ainote"){const s=host.querySelector(".mr-sel");if(!s||s.value===""){say("先选一章笔记。",1);return}ai("下面是一章笔记，请挑出最适合画成流程或时间线的主线内容来画：\n"+items[+s.value].md.slice(0,5000),a)}
    if(k==="copy"){if(!ta.value){say("还没有代码。",1);return}(navigator.clipboard?navigator.clipboard.writeText(ta.value):Promise.reject()).then(()=>say("已复制")).catch(()=>{ta.select();try{document.execCommand("copy")}catch(x){}say("已复制")})}
    if(k==="svg"){if(!svg){say("先画出一张图。",1);return}save(new Blob([svg],{type:"image/svg+xml"}),"流程图.svg")}
    if(k==="png"){if(!svg){say("先画出一张图。",1);return}svgToPng(svg,b=>{b?save(b,"流程图.png"):say("这台设备保存不了 PNG，请用「下载 SVG」，或直接截图。",1)})}
  });
  window.Labs.lib(LIB).then(()=>{
    M=window.mermaid;if(!M)throw 0;
    M.initialize({startOnLoad:false,securityLevel:"strict",theme:"default",suppressErrorRendering:true,fontFamily:'system-ui,-apple-system,"PingFang SC","Microsoft YaHei",sans-serif',flowchart:{htmlLabels:false,curve:"basis",useMaxWidth:true},timeline:{useMaxWidth:true}});
    say("");const first=host.querySelector(".mr-chip");if(first)first.click();
  }).catch(()=>say("Mermaid 没加载成功（可能没有网络），联网后重新展开即可。",1));
}
Labs.reg("mermaid",{render,_png:svgToPng});
})();
