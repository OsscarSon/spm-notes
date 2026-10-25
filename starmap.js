/* 章节星座图：笔记页顶部的星空卡片。样式和逻辑都在这个文件里，不影响 index.html 体积 */
(function(){var st=document.createElement('style');st.id='starmap-style';st.textContent=`
#starMap{margin:0 0 14px;border-radius:22px;overflow:hidden;position:relative;color:#eaf0ff;box-shadow:0 0 0 1px rgba(255,255,255,.1),0 26px 50px -26px rgba(20,20,80,.7);background:#0c1030}
#starMap .sm-stage{position:relative;aspect-ratio:1000/460;background:radial-gradient(ellipse 55% 60% at 18% 12%,var(--sm),transparent 70%),radial-gradient(ellipse 50% 55% at 88% 85%,rgba(140,90,220,.5),transparent 70%),radial-gradient(ellipse 60% 50% at 62% 30%,rgba(60,100,230,.38),transparent 70%),linear-gradient(160deg,#060a22,#0f1544 55%,#1b1043)}
@media(max-width:640px){#starMap .sm-stage{aspect-ratio:1000/700}}
#starMap svg{position:absolute;inset:0;width:100%;height:100%;display:block}
#starMap .sm-top{position:absolute;left:0;right:0;top:0;z-index:2;display:flex;align-items:center;gap:10px;padding:12px 14px;pointer-events:none}
#starMap .sm-top b{font:700 18px/1.2 var(--kai,serif);letter-spacing:.08em;text-shadow:0 0 14px rgba(160,190,255,.7)}
#starMap .sm-top span{font-size:12.5px;opacity:.78}
#starMap .sm-tg{margin-left:auto;pointer-events:auto;border:0;border-radius:999px;padding:4px 11px;font-size:12px;color:#eaf0ff;background:rgba(255,255,255,.12);backdrop-filter:blur(6px)}
#starMap .sm-cap{display:flex;align-items:center;gap:10px;min-height:46px;padding:8px 14px;font-size:13.5px;background:rgba(6,9,30,.82);border-top:1px solid rgba(255,255,255,.08)}
#starMap .sm-cap .t{flex:1;min-width:0}
#starMap .sm-cap button{border:0;border-radius:999px;padding:6px 13px;font-weight:600;background:#ffd98a;color:#3a2800;white-space:nowrap}
#starMap.col .sm-stage,#starMap.col .sm-cap{display:none}
#starMap .ln{stroke:rgba(165,185,255,.42);stroke-width:1.4;stroke-dasharray:3 7;fill:none}
#starMap .ln.on{stroke:#ffd98a;stroke-width:2.2;stroke-dasharray:none;filter:drop-shadow(0 0 5px rgba(255,200,100,.85))}
#starMap .dc{stroke:rgba(170,190,255,.16);stroke-width:1.2;fill:none}
#starMap .st{cursor:pointer;outline:none}
#starMap .core{fill:#8091c8;opacity:.75}
#starMap .halo,#starMap .spark,#starMap .selring,#starMap .ring{display:none}
#starMap .s1 .core{fill:#d6e4ff;opacity:1;filter:drop-shadow(0 0 4px #9bb8ff)}
#starMap .s1 .halo{display:block;fill:rgba(160,190,255,.2)}
#starMap .s2 .core{fill:#fff6d8;opacity:1}
#starMap .s2 .halo{display:block;fill:rgba(255,205,110,.28)}
#starMap .s2 .spark{display:block;fill:#ffe6a6;filter:drop-shadow(0 0 6px #ffc65a);transform-box:fill-box;transform-origin:center;animation:smTw 3.4s var(--d) ease-in-out infinite}
#starMap .sel .selring{display:block;fill:none;stroke:#fff;stroke-width:1.6;stroke-dasharray:4 4}
#starMap .nova .spark{animation:smNova 1.3s ease-out both,smTw 3.4s 1.3s ease-in-out infinite}
#starMap .nova .ring{display:block;fill:none;stroke:#ffd98a;stroke-width:2;transform-box:fill-box;transform-origin:center;animation:smRing 1.3s ease-out both}
#starMap .bg{animation:smBg 4s var(--d) ease-in-out infinite}
#starMap .sm-shoot{position:absolute;left:62%;top:6%;width:120px;height:2px;border-radius:2px;background:linear-gradient(90deg,transparent,#fff);opacity:0;transform:rotate(28deg);z-index:1;animation:smShoot 11s 3s infinite}
@keyframes smTw{0%,100%{transform:scale(.82);opacity:.85}50%{transform:scale(1.12);opacity:1}}
@keyframes smNova{0%{transform:scale(0) rotate(-90deg)}60%{transform:scale(2.1) rotate(10deg)}100%{transform:scale(1)}}
@keyframes smRing{from{transform:scale(.3);opacity:1}to{transform:scale(4);opacity:0}}
@keyframes smBg{0%,100%{opacity:.25}50%{opacity:1}}
@keyframes smShoot{0%{opacity:0;translate:0 0}3%{opacity:1}12%{opacity:0;translate:-260px 140px}100%{opacity:0;translate:-260px 140px}}
@media(prefers-reduced-motion:reduce){#starMap *{animation:none!important}}
@media print{#starMap{display:none}}
`;document.head.appendChild(st)})();
(function(){
const W=1000,CX=500,CY=230,PI=Math.PI,rad=d=>d*PI/180;
const samp=(f,n)=>{const a=[];for(let i=0;i<=n;i++)a.push(f(i/n));return a};
const rot=(p,d)=>{const c=Math.cos(rad(d)),s=Math.sin(rad(d));return p.map(([x,y])=>[CX+(x-CX)*c-(y-CY)*s,CY+(x-CX)*s+(y-CY)*c])};
const bez=(a,b,c)=>samp(t=>[(1-t)*(1-t)*a[0]+2*(1-t)*t*b[0]+t*t*c[0],(1-t)*(1-t)*a[1]+2*(1-t)*t*b[1]+t*t*c[1]],24);
const ell=(rx,ry,deg,a0=0,a1=360)=>rot(samp(t=>[CX+rx*Math.cos(rad(a0+(a1-a0)*t)),CY+ry*Math.sin(rad(a0+(a1-a0)*t))],120),deg);
const SH={
 bio:()=>({name:"DNA 双螺旋",helix:1}),
 kim:()=>({name:"烧瓶",path:[[430,40],[430,170],[250,410],[750,410],[570,170],[570,40]],deco:[[[330,300],[670,300]],[[410,40],[590,40]]],dots:[[470,350,10],[535,325,6],[575,372,8],[430,370,5]]}),
 fiz:()=>({name:"原子轨道",path:ell(390,125,-22),closed:1,deco:[ell(390,125,38),ell(390,125,98)],dots:[[500,230,15]]}),
 mat:()=>({name:"函数曲线",path:samp(u=>{const v=2*u-1;return[80+840*u,CY-170*(2.3*v*v*v-1.3*v)]},200),deco:[[[50,CY],[950,CY]],[[500,40],[500,425]]]}),
 am:()=>({name:"对数螺线",path:samp(t=>{const th=3.4*PI*t,r=36*Math.exp(.16*th);return[CX+r*Math.cos(th)*1.3,CY+r*Math.sin(th)]},300),deco:[[[60,CY],[940,CY]],[[CX,20],[CX,440]]]}),
 sej:()=>({name:"新月",path:ell(195,195,0,40,320),deco:[samp(t=>[CX+65+160*Math.cos(rad(55+250*t)),CY+160*Math.sin(rad(55+250*t))],80)],dots:[[690,230,12],[760,170,5],[780,300,4]]}),
 bi:()=>({name:"翻开的书",path:[[130,385],[130,120]].concat(bez([130,120],[310,55],[500,150]),bez([500,150],[690,55],[870,120]),[[870,385]]),deco:[[[500,150],[500,405]],bez([130,385],[310,430],[500,405]).concat(bez([500,405],[690,430],[870,385]))]}),
 bm:()=>({name:"朱槿 · 国花",path:samp(t=>{const th=4*PI*t,r=190*Math.cos(2.5*th);return[CX+r*Math.cos(th)*1.15,CY+r*Math.sin(th)]},400),closed:1,dots:[[500,230,12]]}),
 bc:()=>({name:"太极",path:ell(195,195,-90),closed:1,deco:[samp(t=>[500-95*Math.cos(rad(-90+180*t)),135+95*Math.sin(rad(-90+180*t))],40).concat(samp(t=>[500+95*Math.cos(rad(-90+180*t)),325+95*Math.sin(rad(-90+180*t))],40))],dots:[[560,135,12],[440,325,12]]}),
 sains:()=>({name:"火箭",path:rot([[500,25],[570,140],[570,290],[650,360],[570,335],[530,395],[470,395],[430,335],[350,360],[430,290],[430,140]],55),closed:1,dots:[[500,150,0]]}),
 moral:()=>({name:"爱心",path:samp(t=>{const a=2*PI*t;return[CX+16*Math.pow(Math.sin(a),3)*13,CY+10-(13*Math.cos(a)-5*Math.cos(2*a)-2*Math.cos(3*a)-Math.cos(4*a))*13]},300),closed:1})
};
function resample(p,N,closed){const q=closed?p.concat([p[0]]):p,cum=[0];for(let i=1;i<q.length;i++)cum.push(cum[i-1]+Math.hypot(q[i][0]-q[i-1][0],q[i][1]-q[i-1][1]));const L=cum[cum.length-1],out=[];let j=1;for(let i=0;i<N;i++){const d=L*i/(closed?N:Math.max(N-1,1));while(j<q.length-1&&cum[j]<d)j++;const s=cum[j]-cum[j-1]||1,t=Math.min(1,Math.max(0,(d-cum[j-1])/s));out.push([q[j-1][0]+(q[j][0]-q[j-1][0])*t,q[j-1][1]+(q[j][1]-q[j-1][1])*t])}return out}
function rng(s){let a=0;for(const c of s)a=(a*31+c.charCodeAt(0))|0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const pl=p=>"M"+p.map(v=>v[0].toFixed(1)+" "+v[1].toFixed(1)).join("L");
const LS=(k,v)=>{try{return v===undefined?JSON.parse(localStorage.getItem(k)):localStorage.setItem(k,JSON.stringify(v))}catch(e){return null}};
function build(sid,cs){
  const s=subj(sid),N=cs.length,R=rng(sid),sh=(SH[sid]||SH.moral)();let pts,deco=sh.deco||[],closed=!!sh.closed;
  if(sh.helix){const A=125,k=2*PI*2.1/860,st=[];pts=[];for(let i=0;i<N;i++){const x=70+860*i/Math.max(N-1,1);pts.push([x,CY+(i%2?-1:1)*A*Math.sin(k*(x-70))])}
    const s1=samp(t=>[70+860*t,CY+A*Math.sin(k*860*t)],160),s2=samp(t=>[70+860*t,CY-A*Math.sin(k*860*t)],160);deco=[s1,s2];for(let x=84;x<930;x+=29){const y=A*Math.sin(k*(x-70));deco.push([[x,CY+y],[x,CY-y]])}}
  else pts=resample(sh.path,N,closed);
  const seen=LS("sm_lit_"+sid),lit=[];
  let g=`<defs><radialGradient id="smMW"><stop offset="0" stop-color="#cfd9ff" stop-opacity=".30"/><stop offset="1" stop-color="#cfd9ff" stop-opacity="0"/></radialGradient></defs><ellipse cx="520" cy="215" rx="640" ry="85" fill="url(#smMW)" transform="rotate(-18 520 215)"/>`;
  for(let i=0;i<190;i++){const band=i<120,u=R()*2-1,off=(R()+R()+R()-1.5)*90,a=rad(-18),x=520+u*620*Math.cos(a)-off*Math.sin(a)+0,y=215+u*620*Math.sin(a)+off*Math.cos(a),bx=band?x:R()*W,by=band?y:R()*460;g+=`<circle class="${R()<.18?"bg":""}" style="--d:${(R()*4).toFixed(1)}s" cx="${bx.toFixed(0)}" cy="${by.toFixed(0)}" r="${(.5+R()*(band?.9:1.5)).toFixed(1)}" fill="#fff" opacity="${(.25+R()*.6).toFixed(2)}"/>`}
  deco.forEach(d=>g+=`<path class="dc" d="${pl(d)}"/>`);(sh.dots||[]).forEach(d=>{if(d[2])g+=`<circle cx="${d[0]}" cy="${d[1]}" r="${d[2]}" fill="rgba(170,190,255,.12)" stroke="rgba(170,190,255,.22)"/>`});
  const stt=cs.map(c=>S.done[c.k]?2:S.notes[c.k]?1:0);
  for(let i=0;i<N-(closed?0:1);i++){const a=pts[i],b=pts[(i+1)%N];g+=`<path class="ln ${stt[i]==2&&stt[(i+1)%N]==2?"on":""}" d="M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}"/>`}
  cs.forEach((c,i)=>{const [x,y]=pts[i],t=stt[i];if(t==2)lit.push(c.k);const nova=t==2&&seen&&!seen.includes(c.k);
    g+=`<g class="st s${t}${nova?" nova":""}" data-i="${i}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})" style="--d:${(R()*3).toFixed(1)}s" tabindex="0" role="button" aria-label="${esc(c.t)}"><circle class="halo" r="24"/><circle class="ring" r="10"/><path class="spark" d="M0-17L3-3 17 0 3 3 0 17-3 3-17 0-3-3Z"/><circle class="core" r="${t==2?5.5:t?5:3.6}"/><circle class="selring" r="21"/><circle r="28" fill="transparent"/></g>`});
  LS("sm_lit_"+sid,lit);
  return{g,N,done:stt.filter(x=>x==2).length,name:sh.name,s}
}
let sel=null;
function mount(sid,searching){
  const old=document.getElementById("starMap"),list=document.getElementById("chapList");if(old)old.remove();
  if(searching||!list)return;
  const cs=chapsOf(sid).filter(c=>c.core);if(cs.length<3)return;
  const b=build(sid,cs),el=document.createElement("section");el.id="starMap";el.dataset.sid=sid;if(LS("sm_col"))el.className="col";
  const full=b.done===b.N;
  el.innerHTML=`<div class="sm-stage" style="--sm:${b.s.color}b0"><i class="sm-shoot"></i><svg viewBox="0 0 ${W} 460" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${esc(b.s.name)}章节星座图">${b.g}</svg><div class="sm-top"><b>${esc(b.s.name.split(" ")[0])} 星座</b><span>${esc(b.name)} · ${b.done}/${b.N} 颗已点亮</span><button class="sm-tg" type="button">${el.className?"展开":"收起"}</button></div></div><div class="sm-cap"><span class="t">${full?"✨ 星座完成！全部章节都点亮了":"点一颗星，看看是哪一章。金色 = 已复习，蓝色 = 有 AI 笔记，灰色 = 还没开始"}</span></div>`;
  list.parentNode.insertBefore(el,list);sel=null;
  el.querySelector(".sm-tg").onclick=()=>{const c=el.classList.toggle("col");LS("sm_col",c||null);el.querySelector(".sm-tg").textContent=c?"展开":"收起"};
  const pick=g=>{const i=+g.dataset.i,c=cs[i];el.querySelectorAll(".st.sel").forEach(x=>x.classList.remove("sel"));g.classList.add("sel");
    const st=S.done[c.k]?"已复习 ✓":S.notes[c.k]?"有 AI 笔记":"还没开始";
    const cap=el.querySelector(".sm-cap");cap.innerHTML=`<span class="t"><b>${esc(c.t)}</b><br><span style="opacity:.7">${st}</span></span><button type="button">看这一章</button>`;
    cap.querySelector("button").onclick=()=>{const d=document.querySelector('details.chap[data-k="'+(window.CSS&&CSS.escape?CSS.escape(c.k):c.k)+'"]');if(d){d.open=true;d.scrollIntoView({behavior:"smooth",block:"start"})}}};
  el.addEventListener("click",e=>{const g=e.target.closest&&e.target.closest(".st");if(g)pick(g)});
  el.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){const g=e.target.closest&&e.target.closest(".st");if(g){e.preventDefault();pick(g)}}});
}
document.addEventListener("change",e=>{const t=e.target;if(t&&t.matches&&t.matches("[data-done]")){const m=document.getElementById("starMap");if(m)setTimeout(()=>mount(m.dataset.sid,false),0)}});
window.StarMap={mount};
try{if(document.getElementById("chapList")&&!nQ)mount(S.sub,false)}catch(e){}
})();
