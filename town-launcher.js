/* 知识小镇入口按钮：放在小宠物上方。点击时才加载 ktart.js + town.js（平时不占流量）。 */
(function(){
if(document.getElementById("ktBtn"))return;
var st=document.createElement("style");
st.textContent='#ktBtn{position:fixed;right:16px;bottom:112px;z-index:31;display:flex;align-items:center;gap:6px;padding:8px 14px 8px 10px;background:linear-gradient(#fff6dd,#ffe0a0);border:3px solid #e2a14c;border-radius:99px;box-shadow:0 4px 0 #c98a3a,0 8px 14px rgba(0,0,0,.18);cursor:pointer;font:900 15px ui-rounded,system-ui,"PingFang SC","Microsoft YaHei",sans-serif;color:#9a5a14;-webkit-tap-highlight-color:transparent;transition:transform .1s}#ktBtn:active{transform:translateY(3px);box-shadow:0 1px 0 #c98a3a}#ktBtn span{font-size:20px}#ktBtn[hidden]{display:none}@media(max-width:640px){#ktBtn{bottom:92px;padding:6px 12px 6px 8px;font-size:14px}}@media print{#ktBtn{display:none}}';
document.head.appendChild(st);
var b=document.createElement("button");b.id="ktBtn";b.type="button";b.setAttribute("aria-label","打开知识小镇");b.innerHTML='<span>🏡</span>小镇';
document.body.appendChild(b);
var V="2026-10-19v",loading=0;
function load(src){return new Promise(function(ok,no){var s=document.createElement("script");s.src=src+"?v="+V;s.onload=ok;s.onerror=function(){no(new Error(src))};document.head.appendChild(s)})}
b.onclick=function(){if(loading)return;
 if(window.KT&&KT.open){KT.open();return}
 loading=1;b.querySelector("span").textContent="⏳";
 (window.KTArt?Promise.resolve():load("ktart.js")).then(function(){return load("town.js")}).then(function(){loading=0;b.querySelector("span").textContent="🏡";KT.open()}).catch(function(e){loading=0;b.querySelector("span").textContent="🏡";alert("小镇文件没加载成功："+e.message+"\n请检查 ktart.js 和 town.js 是否已上传到网站根目录。")})};
})();
