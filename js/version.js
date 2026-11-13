// 版本号的唯一来源。菜单底部、常见问题、评分统计都读 window.MOCHI_VERSION，不要在别处再写死版本号。
// 发新版时要同步三处：这里、package.json 的 version、sw.js 的 VER（mochi-v9-0-0）；`npm run check` 会检查它们是否一致。
// 打包 Android 时还要手动改 android/app/build.gradle 的 versionName / versionCode（Capacitor 不会读 package.json）。
window.MOCHI_VERSION = '9.9.1';
// 作者 Instagram：菜单底部（menu.js）和常见问题页底部都用这个函数生成链接，要改链接只改这里。
window.MOCHI_IG = 'https://www.instagram.com/stz_0506/';
window.mochiCreatorLink = function () {
  var l = window.LANG || 'en', a = document.createElement('a');
  a.href = window.MOCHI_IG; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.className = 'mochi-by';
  a.textContent = ({ zh: '作者 Instagram：@stz_0506', en: 'Created by @stz_0506 on Instagram', ms: 'Dicipta oleh @stz_0506 di Instagram' })[l] || 'Created by @stz_0506 on Instagram';
  return a;
};
