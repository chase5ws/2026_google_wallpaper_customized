// 設定存放在 chrome.storage.local（媒體檔另外放 IndexedDB）
const KEY = 'settings';

export const DEFAULTS = {
  version: 1,
  wallpapers: [
    { id: 'fx-aurora', name: '極光', type: 'effect', effect: 'aurora',
      opts: { color1: '#6a5cff', color2: '#00d4c8', speed: 1, density: 1 } },
    { id: 'fx-particles', name: '粒子網路', type: 'effect', effect: 'particles',
      opts: { color1: '#8ab4ff', color2: '#0b1020', speed: 1, density: 1 } },
    { id: 'fx-stars', name: '星空穿越', type: 'effect', effect: 'starfield',
      opts: { color1: '#ffffff', color2: '#05060f', speed: 1, density: 1 } },
  ],
  activeId: 'fx-aurora',
  randomOnNewTab: false,
  display: { fit: 'cover', dim: 0.15, blur: 0, speed: 1, muted: true, pauseWhenHidden: true },
  clock: { hour12: false, seconds: false },
  search: { engine: 'default' },
  shortcuts: [
    { title: 'Google', url: 'https://www.google.com' },
    { title: 'YouTube', url: 'https://www.youtube.com' },
    { title: 'GitHub', url: 'https://github.com' },
    { title: 'Gmail', url: 'https://mail.google.com' },
  ],
  // x / y = 元件中心點在視窗中的百分比位置
  widgets: {
    clock:     { visible: true, x: 50, y: 30, scale: 1 },
    date:      { visible: true, x: 50, y: 41, scale: 1 },
    search:    { visible: true, x: 50, y: 52, scale: 1 },
    shortcuts: { visible: true, x: 50, y: 66, scale: 1 },
    note:      { visible: false, x: 85, y: 15, scale: 1, text: '在這裡寫點什麼…' },
  },
};

function merge(base, extra) {
  if (Array.isArray(base) || typeof base !== 'object' || base === null) {
    return extra === undefined ? base : extra;
  }
  const out = { ...base };
  for (const k of Object.keys(extra || {})) {
    out[k] = (k in base) ? merge(base[k], extra[k]) : extra[k];
  }
  return out;
}

export async function loadSettings() {
  const data = await chrome.storage.local.get(KEY);
  return merge(structuredClone(DEFAULTS), data[KEY] || {});
}

let saveTimer = null;
export function saveSettings(settings, immediate = false) {
  clearTimeout(saveTimer);
  const run = () => chrome.storage.local.set({ [KEY]: settings });
  if (immediate) return run();
  saveTimer = setTimeout(run, 250);
}

export function onSettingsChanged(cb) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[KEY]) cb(changes[KEY].newValue);
  });
}

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
