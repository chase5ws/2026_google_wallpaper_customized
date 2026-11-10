// 新分頁上的元件：時鐘、日期、搜尋、捷徑、便條。編輯模式下可拖拽與縮放。
const $ = s => document.querySelector(s);

export const WIDGET_LABELS = {
  clock: '時鐘', date: '日期', search: '搜尋框', shortcuts: '常用網站', note: '便條',
};

const ENGINES = {
  google: 'https://www.google.com/search?q=',
  bing: 'https://www.bing.com/search?q=',
  duckduckgo: 'https://duckduckgo.com/?q=',
  yahoo: 'https://tw.search.yahoo.com/search?p=',
};

export function faviconUrl(pageUrl) {
  const u = new URL(chrome.runtime.getURL('/_favicon/'));
  u.searchParams.set('pageUrl', pageUrl);
  u.searchParams.set('size', '64');
  return u.toString();
}

export class Widgets {
  constructor(getSettings, onChange) {
    this.get = getSettings;
    this.onChange = onChange;
    this.editing = false;
    this.els = {};
    document.querySelectorAll('.widget').forEach(el => { this.els[el.dataset.id] = el; });
    this.bindSearch();
    this.bindNote();
    this.bindDrag();
    this.tick();
    setInterval(() => this.tick(), 1000);
  }

  render() {
    const s = this.get();
    for (const [id, el] of Object.entries(this.els)) {
      const w = s.widgets[id];
      if (!w) continue;
      el.hidden = !w.visible;
      this.place(el, w);
    }
    this.renderShortcuts();
    const note = $('#note-text');
    if (document.activeElement !== note) note.value = s.widgets.note.text || '';
    this.tick();
  }

  place(el, w) {
    el.style.left = `${w.x}%`;
    el.style.top = `${w.y}%`;
    el.style.setProperty('--scale', w.scale);
  }

  tick() {
    const s = this.get?.();
    if (!s) return;
    const now = new Date();
    $('#clock-text').textContent = now.toLocaleTimeString('zh-TW', {
      hour: '2-digit', minute: '2-digit',
      second: s.clock.seconds ? '2-digit' : undefined,
      hour12: s.clock.hour12,
    });
    $('#date-text').textContent = now.toLocaleDateString('zh-TW', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
    });
  }

  renderShortcuts() {
    const box = $('#shortcuts-list');
    box.replaceChildren();
    for (const sc of this.get().shortcuts) {
      const a = document.createElement('a');
      a.className = 'shortcut';
      a.href = sc.url;
      a.title = sc.url;
      const img = document.createElement('img');
      img.src = faviconUrl(sc.url);
      img.alt = '';
      const span = document.createElement('span');
      span.textContent = sc.title;
      a.append(img, span);
      box.append(a);
    }
  }

  bindSearch() {
    $('#search-form').addEventListener('submit', e => {
      e.preventDefault();
      const q = $('#search-input').value.trim();
      if (!q) return;
      if (/^https?:\/\/\S+$/i.test(q)) { location.href = q; return; }
      const engine = this.get().search.engine;
      if (engine === 'default' && chrome.search?.query) {
        chrome.search.query({ text: q, disposition: 'CURRENT_TAB' });
      } else {
        location.href = (ENGINES[engine] || ENGINES.google) + encodeURIComponent(q);
      }
    });
  }

  bindNote() {
    $('#note-text').addEventListener('input', e => {
      this.get().widgets.note.text = e.target.value;
      this.onChange();
    });
  }

  setEditing(on) {
    this.editing = on;
    document.body.classList.toggle('editing', on);
  }

  bindDrag() {
    let drag = null;
    const snap = v => (Math.abs(v - 50) < 1.2 ? 50 : Math.round(v * 10) / 10);

    for (const [id, el] of Object.entries(this.els)) {
      el.querySelector('.widget-hide')?.addEventListener('click', e => {
        e.stopPropagation();
        this.get().widgets[id].visible = false;
        this.render();
        this.onChange(true);
      });

      el.addEventListener('pointerdown', e => {
        if (!this.editing || e.button !== 0 || e.target.closest('.widget-hide')) return;
        e.preventDefault();
        el.setPointerCapture(e.pointerId);
        const w = this.get().widgets[id];
        drag = { id, el, startX: e.clientX, startY: e.clientY, x: w.x, y: w.y };
        el.classList.add('dragging');
      });

      el.addEventListener('pointermove', e => {
        if (!drag || drag.el !== el) return;
        const w = this.get().widgets[id];
        const nx = drag.x + ((e.clientX - drag.startX) / innerWidth) * 100;
        const ny = drag.y + ((e.clientY - drag.startY) / innerHeight) * 100;
        w.x = Math.max(0, Math.min(100, snap(nx)));
        w.y = Math.max(0, Math.min(100, snap(ny)));
        document.body.classList.toggle('snap-x', w.x === 50);
        document.body.classList.toggle('snap-y', w.y === 50);
        this.place(el, w);
      });

      const end = () => {
        if (!drag || drag.el !== el) return;
        el.classList.remove('dragging');
        document.body.classList.remove('snap-x', 'snap-y');
        drag = null;
        this.onChange(true);
      };
      el.addEventListener('pointerup', end);
      el.addEventListener('pointercancel', end);

      el.addEventListener('wheel', e => {
        if (!this.editing) return;
        e.preventDefault();
        const w = this.get().widgets[id];
        w.scale = Math.max(0.4, Math.min(3, Math.round((w.scale - e.deltaY * 0.001) * 100) / 100));
        this.place(el, w);
        this.onChange();
      }, { passive: false });
    }
  }
}
