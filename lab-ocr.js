/* 拍照识字：Tesseract.js（Apache-2.0）。在浏览器里把课本、错题、黑板照片转成文字，图片不会上传到任何服务器。
   识别库和语言数据只在你点「开始识别」时才下载（中文数据比较大，建议用 Wi-Fi）。 */
(function(){
const LIB="https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
const LANG=[["中文 + 英文","chi_sim+eng"],["马来文 + 英文","msa+eng"],["只有英文","eng"]];
const CSS=`.lab-ocr .oc-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:8px}
.lab-ocr select{min-width:140px}
.lab-ocr img{max-width:100%;max-height:220px;border-radius:10px;border:1px solid var(--line);display:none;margin-bottom:8px}
.lab-ocr textarea{width:100%;min-height:150px}
.lab-ocr .oc-msg{font-size:13px;min-height:20px;color:var(--muted)}`;
function render(host){
  if(!document.getElementById("oc-css")){const s=document.createElement("style");s.id="oc-css";s.textContent=CSS;document.head.appendChild(s)}
  host.classList.add("lab-ocr");
  host.innerHTML=`<div class="oc-row"><input type="file" accept="image/*" class="oc-f"><select class="oc-l" aria-label="语言">${LANG.map(l=>`<option value="${l[1]}">${l[0]}</option>`).join("")}</select></div>
  <img class="oc-img" alt="预览"><div class="oc-row"><button type="button" class="btn small pri" data-a="go">🔍 开始识别</button><button type="button" class="btn small" data-a="copy">复制文字</button><button type="button" class="btn small" data-a="clr">清空</button></div>
  <div class="oc-msg" role="status">选一张照片。第一次识别要下载语言数据（中文约十几 MB），建议用 Wi-Fi。</div>
  <textarea class="oc-t" placeholder="识别出的文字会出现在这里，可以直接修改。"></textarea>
  <p class="fine muted" style="margin:8px 0 0">照片只在你的浏览器里处理。手写字、反光、歪斜的照片识别会不准，识别后请对照检查。识别库：Tesseract.js。</p>`;
  const f=host.querySelector(".oc-f"),im=host.querySelector(".oc-img"),msg=host.querySelector(".oc-msg"),t=host.querySelector(".oc-t"),l=host.querySelector(".oc-l");
  let busy=false,url=null;
  f.onchange=()=>{const x=f.files&&f.files[0];if(url)URL.revokeObjectURL(url);if(!x){im.style.display="none";return}url=URL.createObjectURL(x);im.src=url;im.style.display="block"};
  async function go(){
    const x=f.files&&f.files[0];if(busy)return;if(!x){msg.textContent="先选一张照片。";return}
    busy=true;msg.textContent="加载识别库…";
    try{await window.Labs.lib(LIB);
      const r=await window.Tesseract.recognize(x,l.value,{logger:m=>{if(m.status)msg.textContent=(m.status==="recognizing text"?"识别中 ":"准备中（"+m.status+"） ")+(m.progress?Math.round(m.progress*100)+"%":"")}});
      t.value=(r.data.text||"").trim();msg.textContent=t.value?"识别完成，请对照原图检查。":"没有识别到文字，换一张更清楚、更正的照片试试。"}
    catch(e){msg.textContent="识别失败（可能没有网络，或语言数据没下载成功）。联网后再试一次。"}
    busy=false;
  }
  host.addEventListener("click",e=>{const a=e.target.closest("[data-a]");if(!a)return;
    if(a.dataset.a==="go")go();
    if(a.dataset.a==="clr"){t.value="";msg.textContent=""}
    if(a.dataset.a==="copy"){if(!t.value)return;(navigator.clipboard?navigator.clipboard.writeText(t.value):Promise.reject()).then(()=>{msg.textContent="已复制"}).catch(()=>{t.select();document.execCommand&&document.execCommand("copy");msg.textContent="已复制"})}});
}
Labs.reg("ocr",{render});
})();
