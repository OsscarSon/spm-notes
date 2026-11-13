// 启动：渲染各页面 + 底部标签栏（课表 / 作业 / 学习 / 统计 / 更多）
draw();ttSel();rSt();rSp();rRm();rFx();rPer();rTT();rHw();rf();
var V=['tt','ss','wk','lf','hw','st','hs','sp','bt','di','se','sta','more'],SUB={se:1},GRP={ss:'hw',wk:'hw',lf:'hw',hw:'hw',st:'hw',hs:'sp',sp:'sp',bt:'sp',di:'sp'},LAST={hw:'hw',sp:'hs'};
function showView(v){
  V.forEach(function(k){document.getElementById('v-'+k).style.display=k===v?(k==='tt'?'':'flex'):'none'});
  var tab=SUB[v]?'more':GRP[v]||v;if(GRP[v])LAST[GRP[v]]=v;
  document.querySelectorAll('.tabbar button').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-v')===tab)});
  if(v==='sta'&&typeof drawStats==='function')drawStats();
  document.body.setAttribute('data-view',v);          // ＋ 按钮在页面最外层，靠它只在“课表”页显示
  if(window.fabClose)fabClose();
  window.scrollTo(0,0)}
document.querySelectorAll('.tabbar button').forEach(function(b){b.onclick=function(){var g=b.getAttribute('data-v');   // v9.7：从别的页面点“学习”→ 落在学习工作台；已经在学习分组里（作业 / 复习计划）就留在原处
  if(g==='hw'){showView(GRP[document.body.getAttribute('data-view')]==='hw'?LAST.hw:(window.mochiSpaceHome?mochiSpaceHome():'ss'));return}
  showView(LAST[g]||g)}});
// 学习 / 健康：每个分组顶部一条分段按钮（作业｜复习计划；健康空间｜运动｜美容｜饮食）。v9.9.1：点底部“健康”默认落在健康空间（LAST.sp='hs'），旧的运动 / 美容 / 饮食页面还在，从分段按钮或健康空间里的“打开原来的页面”进入
[[['ss','🏠 工作台'],['hw','📝 作业'],['st','📚 复习计划']],[['hs','🌿 健康空间'],['sp','🏃 运动'],['bt','💄 美容'],['di','🥗 饮食']]].forEach(function(g){g.forEach(function(it){if(it[0]==='hs')return;   // 健康空间自己有顶部标签（总览 / 运动 / 护肤 / 饮食与饮水），不需要这条分段按钮
  var s=document.getElementById('v-'+it[0]),bar=el('div','seg');g.forEach(function(o){var b=el('button',o[0]===it[0]?'on':null,o[1]);b.onclick=function(){showView(o[0])};bar.appendChild(b)});s.insertBefore(bar,s.firstChild)})});
// 运动 / 设置 在「更多」里：加一个返回键
['se'].forEach(function(k){var s=document.getElementById('v-'+k),b=el('button','back','‹ 更多');b.setAttribute('data-go','more');s.insertBefore(b,s.firstChild)});
document.querySelectorAll('[data-go]').forEach(function(b){b.onclick=function(){showView(b.getAttribute('data-go'))}});
// 向导里选了“拍照导入 / 添加第一节课”：重新载入后直接打开
(function(){
  var a=null;try{a=localStorage.getItem('mochi-sync-after');localStorage.removeItem('mochi-sync-after')}catch(e){}
  if(a==='photo')setTimeout(function(){openAI('photo')},300);else if(a==='lesson')setTimeout(function(){openLesson(null)},300);
  else if(!a&&(VM==='week'||WIDE.matches))setTimeout(wkScrollNow,80)})();
