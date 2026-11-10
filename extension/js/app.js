import { loadSettings, saveSettings, onSettingsChanged, DEFAULTS, uid } from './settings.js';
import { mediaDB } from './db.js';
import { EFFECTS } from './effects.js';
import { WallpaperRenderer, parseYoutubeId } from './wallpaper.js';
import { Widgets, WIDGET_LABELS } from './widgets.js';

const $ = s => document.querySelector(s);
const el = (tag, props = {}, ...kids) => {
  const n = Object.assign(document.createElement(tag), props);
  n.append(...kids);
  return n;
};

let settings = await loadSettings();
let lastSaved = JSON.stringify(settings);
let currentId = pickWallpaperId();

const renderer = new WallpaperRenderer($('#bg'));
const widgets = new Widgets(() => settings, immediate => commit(immediate));

function pickWallpaperId() {
  const list = settings.wallpapers;
  if (!list.length) return null;
  if (settings.randomOnNewTab && list.length > 1) {
    return list[Math.floor(Math.random() * list.length)].id;
  }
  return list.some(w => w.id === settings.activeId) ? settings.activeId : list[0].id;
}
const currentWallpaper = () => settings.wallpapers.find(w => w.id === currentId) || null;

function commit(immediate = false) {
  lastSaved = JSON.stringify(settings);
  saveSettings(settings, immediate);
}

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('show'), 2200);
}

async function showWallpaper(id) {
  currentId = id;
  settings.activeId = id;
  commit(true);
  await renderer.render(currentWallpaper(), settings.display);
  renderLibrary();
  renderEffectEditor();
}

// ---------- 初次渲染 ----------
await renderer.render(currentWallpaper(), settings.display);
widgets.render();

document.addEventListener('visibilitychange', () => {
  if (!settings.display.pauseWhenHidden) return;
  document.hidden ? renderer.pause() : renderer.resume();
});

// 其他分頁改了設定 → 同步
onSettingsChanged(async next => {
  const json = JSON.stringify(next);
  if (json === lastSaved) return;
  const prevWp = JSON.stringify(currentWallpaper());
  settings = { ...structuredClone(DEFAULTS), ...next };
  lastSaved = json;
  if (!settings.wallpapers.some(w => w.id === currentId)) currentId = pickWallpaperId();
  if (JSON.stringify(currentWallpaper()) !== prevWp) {
    await renderer.render(currentWallpaper(), settings.display);
  } else {
    renderer.applyDisplay(settings.display);
  }
  widgets.render();
  if (!$('#panel').hidden) renderPanel();
});

// ---------- 編輯模式 ----------
function setEditing(on) {
  widgets.setEditing(on);
  if (on) $('#panel').hidden = true;
  else commit(true);
}
$('#btn-edit').onclick = () => setEditing(true);
$('#btn-edit2').onclick = () => setEditing(true);
$('#edit-done').onclick = () => setEditing(false);

// ---------- 設定面板 ----------
$('#btn-settings').onclick = () => { $('#panel').hidden = false; renderPanel(); };
$('#panel-close').onclick = () => { $('#panel').hidden = true; };
addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (widgets.editing) setEditing(false);
  else $('#panel').hidden = true;
});
document.querySelectorAll('.tab').forEach(tab => {
  tab.onclick = () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t === tab));
    document.querySelectorAll('.tab-body').forEach(b => { b.hidden = b.dataset.body !== tab.dataset.tab; });
  };
});

function renderPanel() {
  renderLibrary();
  renderEffectEditor();
  renderLook();
  renderWidgetTab();
  renderShortcutEditor();
}

// ----- 桌布庫 -----
let thumbUrls = [];
const KIND_LABEL = { file: '檔案', url: '網址', youtube: 'YouTube', effect: '動畫' };

async function thumbMedia(wp) {
  if (wp.type === 'effect') {
    const o = wp.opts || {};
    return el('div', { style: `width:100%;height:100%;background:linear-gradient(135deg, ${o.color2}, ${o.color1})` });
  }
  if (wp.type === 'youtube') {
    return el('img', { src: `https://i.ytimg.com/vi/${wp.ytId}/mqdefault.jpg`, alt: '' });
  }
  let src = wp.url, mime = wp.mime || '';
  if (wp.type === 'file') {
    const blob = await mediaDB.get(wp.id);
    if (!blob) return el('div');
    src = URL.createObjectURL(blob);
    thumbUrls.push(src);
    mime = blob.type;
  }
  const video = wp.mediaKind === 'video' || (wp.mediaKind !== 'image' && (mime.startsWith('video/') || /\.(mp4|webm|mov|m4v|ogv)/i.test(src)));
  if (video) {
    const v = el('video', { src: src + '#t=1', muted: true, preload: 'metadata', playsInline: true });
    return v;
  }
  return el('img', { src, alt: '' });
}

async function renderLibrary() {
  thumbUrls.forEach(u => URL.revokeObjectURL(u));
  thumbUrls = [];
  const box = $('#library');
  const items = await Promise.all(settings.wallpapers.map(async wp => {
    const del = el('button', { className: 'del', title: '刪除', textContent: '✕' });
    del.onclick = e => { e.stopPropagation(); removeWallpaper(wp.id); };
    const card = el('button', { className: 'thumb' + (wp.id === currentId ? ' active' : ''), title: wp.name },
      await thumbMedia(wp),
      el('span', { className: 'kind', textContent: KIND_LABEL[wp.type] }),
      el('span', { className: 'label', textContent: wp.name }),
      del);
    card.onclick = () => showWallpaper(wp.id);
    return card;
  }));
  box.replaceChildren(...items);
  if (!items.length) box.append(el('p', { className: 'muted', textContent: '還沒有桌布，從下方新增一張吧。' }));
  $('#opt-random').checked = settings.randomOnNewTab;
}

$('#opt-random').onchange = e => { settings.randomOnNewTab = e.target.checked; commit(); };

async function removeWallpaper(id) {
  const wp = settings.wallpapers.find(w => w.id === id);
  settings.wallpapers = settings.wallpapers.filter(w => w.id !== id);
  if (wp?.type === 'file') await mediaDB.delete(id).catch(() => {});
  if (id === currentId) {
    await showWallpaper(settings.wallpapers[0]?.id ?? null);
  } else {
    commit(true);
    renderLibrary();
  }
  toast('已刪除桌布');
}

async function addWallpaper(wp) {
  settings.wallpapers.push(wp);
  await showWallpaper(wp.id);
}

// 檔案上傳
async function addFiles(files) {
  const ok = [...files].filter(f => /^(video|image)\//.test(f.type));
  if (!ok.length) { toast('只支援影片或圖片檔'); return; }
  for (const f of ok) {
    const id = uid();
    await mediaDB.put(id, f);
    settings.wallpapers.push({ id, name: f.name.replace(/\.[^.]+$/, ''), type: 'file', mime: f.type });
  }
  await showWallpaper(settings.wallpapers.at(-1).id);
  toast(`已加入 ${ok.length} 個檔案`);
}
$('#file-input').onchange = e => { addFiles(e.target.files); e.target.value = ''; };

let dragDepth = 0;
const hasFiles = e => [...(e.dataTransfer?.types || [])].includes('Files');
addEventListener('dragenter', e => { if (hasFiles(e)) { dragDepth++; document.body.classList.add('dragover'); } });
addEventListener('dragleave', e => { if (hasFiles(e) && --dragDepth <= 0) { dragDepth = 0; document.body.classList.remove('dragover'); } });
addEventListener('dragover', e => { if (hasFiles(e)) e.preventDefault(); });
addEventListener('drop', e => {
  if (!hasFiles(e)) return;
  e.preventDefault();
  dragDepth = 0;
  document.body.classList.remove('dragover');
  addFiles(e.dataTransfer.files);
});

// 網址
$('#url-add').onclick = () => {
  const url = $('#url-input').value.trim();
  try { new URL(url); } catch { toast('網址格式不正確'); return; }
  if (parseYoutubeId(url) && /youtu/.test(url)) { toast('這是 YouTube 連結，請貼到下方 YouTube 欄位'); return; }
  const kind = $('#url-kind').value;
  const name = decodeURIComponent(new URL(url).pathname.split('/').pop() || new URL(url).hostname);
  addWallpaper({ id: uid(), name, type: 'url', url, mediaKind: kind === 'auto' ? undefined : kind });
  $('#url-input').value = '';
};

// YouTube
$('#yt-add').onclick = () => {
  const ytId = parseYoutubeId($('#yt-input').value);
  if (!ytId) { toast('找不到 YouTube 影片 ID'); return; }
  addWallpaper({ id: uid(), name: `YouTube ${ytId}`, type: 'youtube', ytId });
  $('#yt-input').value = '';
};

// 內建動畫
$('#fx-select').append(...Object.entries(EFFECTS).map(([k, v]) => el('option', { value: k, textContent: v.label })));
$('#fx-add').onclick = () => {
  const effect = $('#fx-select').value;
  addWallpaper({
    id: uid(), name: EFFECTS[effect].label.replace(/（.*）/, ''), type: 'effect', effect,
    opts: { ...EFFECTS[effect].defaults, speed: 1, density: 1 },
  });
};

function renderEffectEditor() {
  const wp = currentWallpaper();
  const box = $('#effect-editor');
  box.hidden = wp?.type !== 'effect';
  if (box.hidden) return;
  $('#fx-color1').value = wp.opts.color1;
  $('#fx-color2').value = wp.opts.color2;
  $('#fx-speed').value = wp.opts.speed;
  $('#fx-density').value = wp.opts.density;
}
for (const key of ['color1', 'color2', 'speed', 'density']) {
  $(`#fx-${key}`).addEventListener('input', e => {
    const wp = currentWallpaper();
    if (wp?.type !== 'effect') return;
    wp.opts[key] = e.target.type === 'range' ? Number(e.target.value) : e.target.value;
    if (key === 'speed' || key.startsWith('color')) Object.assign(renderer.effect.opts, wp.opts);
    else renderer.effect.set(wp.effect, wp.opts);
    commit();
  });
  $(`#fx-${key}`).addEventListener('change', () => renderLibrary());
}

// ----- 外觀 -----
function renderLook() {
  const d = settings.display;
  $('#opt-fit').value = d.fit;
  $('#opt-dim').value = d.dim;
  $('#opt-blur').value = d.blur;
  $('#opt-speed').value = d.speed;
  $('#opt-muted').checked = d.muted;
  $('#opt-pause').checked = d.pauseWhenHidden;
  $('#out-dim').textContent = `${Math.round(d.dim * 100)}%`;
  $('#out-blur').textContent = `${d.blur}px`;
  $('#out-speed').textContent = `${d.speed}x`;
}
const lookInputs = { fit: 'opt-fit', dim: 'opt-dim', blur: 'opt-blur', speed: 'opt-speed', muted: 'opt-muted', pauseWhenHidden: 'opt-pause' };
for (const [key, id] of Object.entries(lookInputs)) {
  $(`#${id}`).addEventListener('input', e => {
    const t = e.target;
    settings.display[key] = t.type === 'checkbox' ? t.checked : t.type === 'range' ? Number(t.value) : t.value;
    renderer.applyDisplay(settings.display);
    renderLook();
    commit();
  });
}

// ----- 元件 -----
function renderWidgetTab() {
  const box = $('#widget-toggles');
  box.replaceChildren(...Object.entries(WIDGET_LABELS).map(([id, label]) => {
    const cb = el('input', { type: 'checkbox', checked: settings.widgets[id].visible });
    cb.onchange = () => { settings.widgets[id].visible = cb.checked; widgets.render(); commit(); };
    return el('label', { className: 'row' }, cb, label);
  }));
  $('#opt-12h').checked = settings.clock.hour12;
  $('#opt-seconds').checked = settings.clock.seconds;
  $('#opt-engine').value = settings.search.engine;
}
$('#opt-12h').onchange = e => { settings.clock.hour12 = e.target.checked; widgets.tick(); commit(); };
$('#opt-seconds').onchange = e => { settings.clock.seconds = e.target.checked; widgets.tick(); commit(); };
$('#opt-engine').onchange = e => { settings.search.engine = e.target.value; commit(); };
$('#btn-reset-layout').onclick = () => {
  for (const [id, w] of Object.entries(DEFAULTS.widgets)) {
    Object.assign(settings.widgets[id], { x: w.x, y: w.y, scale: w.scale });
  }
  widgets.render();
  commit(true);
  toast('版面已重設');
};

// ----- 捷徑 -----
function renderShortcutEditor() {
  const box = $('#shortcut-editor');
  box.replaceChildren(...settings.shortcuts.map((sc, i) => {
    const title = el('input', { type: 'text', value: sc.title, placeholder: '名稱' });
    const url = el('input', { type: 'url', value: sc.url, placeholder: 'https://' });
    const del = el('button', { textContent: '✕', title: '刪除' });
    title.oninput = () => { sc.title = title.value; widgets.renderShortcuts(); commit(); };
    url.onchange = () => {
      let v = url.value.trim();
      if (v && !/^[a-z]+:\/\//i.test(v)) v = 'https://' + v;
      sc.url = url.value = v;
      widgets.renderShortcuts();
      commit();
    };
    del.onclick = () => { settings.shortcuts.splice(i, 1); renderShortcutEditor(); widgets.renderShortcuts(); commit(); };
    return el('div', { className: 'sc-row' }, title, url, del);
  }));
}
$('#sc-add').onclick = () => {
  settings.shortcuts.push({ title: '新網站', url: 'https://' });
  renderShortcutEditor();
  widgets.renderShortcuts();
  commit();
  $('#shortcut-editor').lastElementChild?.querySelector('input[type=url]')?.focus();
};

// ----- 資料 -----
$('#btn-export').onclick = () => {
  const data = { ...settings, wallpapers: settings.wallpapers.filter(w => w.type !== 'file') };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = el('a', { href: URL.createObjectURL(blob), download: 'live-wallpaper-settings.json' });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};
$('#import-input').onchange = async e => {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f) return;
  try {
    const data = JSON.parse(await f.text());
    const files = settings.wallpapers.filter(w => w.type === 'file');
    settings = { ...structuredClone(DEFAULTS), ...data };
    settings.wallpapers = [...(data.wallpapers || []), ...files];
    currentId = pickWallpaperId();
    commit(true);
    await renderer.render(currentWallpaper(), settings.display);
    widgets.render();
    renderPanel();
    toast('設定已匯入');
  } catch {
    toast('檔案格式不正確');
  }
};
let resetArmed = false;
$('#btn-reset').onclick = async () => {
  if (!resetArmed) {
    resetArmed = true;
    $('#btn-reset').textContent = '再按一次確認重設';
    setTimeout(() => { resetArmed = false; $('#btn-reset').textContent = '全部重設'; }, 3000);
    return;
  }
  for (const w of settings.wallpapers) if (w.type === 'file') await mediaDB.delete(w.id).catch(() => {});
  settings = structuredClone(DEFAULTS);
  currentId = pickWallpaperId();
  commit(true);
  await renderer.render(currentWallpaper(), settings.display);
  widgets.render();
  renderPanel();
  toast('已全部重設');
};
