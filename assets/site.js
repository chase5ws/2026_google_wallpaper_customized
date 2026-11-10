// 介紹網頁：直接重用擴充功能裡的動畫程式（extension/js/effects.js）
import { EFFECTS, EffectRunner } from '../extension/js/effects.js';

const $ = s => document.querySelector(s);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

const runner = new EffectRunner($('#fx'));
let current = 'aurora';
const state = {};

function apply(effect) {
  current = effect;
  const opts = state[effect] ||= { ...EFFECTS[effect].defaults, speed: reduced ? 0.2 : 1, density: 1 };
  runner.set(effect, opts);
  $('#c1').value = opts.color1;
  $('#c2').value = opts.color2;
  $('#spd').value = opts.speed;
  $('#den').value = opts.density;
  document.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-checked', c.dataset.fx === effect));
}

$('#chips').append(...Object.entries(EFFECTS).map(([k, v]) => {
  const b = document.createElement('button');
  b.className = 'chip';
  b.dataset.fx = k;
  b.role = 'radio';
  b.textContent = v.label.replace(/（.*）/, '');
  b.onclick = () => apply(k);
  return b;
}));

for (const [id, key] of [['c1', 'color1'], ['c2', 'color2'], ['spd', 'speed'], ['den', 'density']]) {
  $('#' + id).addEventListener('input', e => {
    const o = state[current];
    o[key] = e.target.type === 'range' ? Number(e.target.value) : e.target.value;
    key === 'density' ? runner.set(current, o) : Object.assign(runner.opts, o);
  });
}

apply('aurora');
runner.start();

// 畫面捲離首屏或分頁隱藏時暫停動畫
let heroVisible = true;
const sync = () => (heroVisible && !document.hidden ? runner.start() : runner.stop());
new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting; sync(); }, { threshold: 0.05 })
  .observe($('.hero'));
document.addEventListener('visibilitychange', sync);

// 假時鐘
const tick = () => {
  const d = new Date();
  $('#hero-time').textContent = d.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false });
  $('#hero-date').textContent = d.toLocaleDateString('zh-TW', { month: 'long', day: 'numeric', weekday: 'long' });
};
tick();
setInterval(tick, 1000);

// 截圖切換
const CAPS = {
  aurora: '安裝後打開新分頁，預設就是會流動的極光。',
  panel: '左上角齒輪打開設定：管理桌布庫、調動畫顏色、上傳影片、貼 YouTube 連結。',
  edit: '左上角箭頭進入編輯模式：拖拽移動、滾輪縮放、✕ 隱藏，靠近中線自動吸附。',
  matrix: '內建 6 種動畫，數字雨、星空、雨夜、海浪…都能自訂顏色。',
};
document.querySelectorAll('[data-shot]').forEach(t => {
  t.onclick = () => {
    document.querySelectorAll('[data-shot]').forEach(x => x.classList.toggle('active', x === t));
    $('#shot').src = `assets/screens/${t.dataset.shot}.webp`;
    $('#shot-cap').textContent = CAPS[t.dataset.shot];
  };
});
