// 把一張「桌布設定」渲染到 #bg 容器
import { mediaDB } from './db.js';
import { EffectRunner } from './effects.js';

const VIDEO_EXT = /\.(mp4|webm|ogv|ogg|mov|m4v)(\?|#|$)/i;

export function parseYoutubeId(input) {
  if (!input) return null;
  const s = input.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  try {
    const u = new URL(s);
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1, 12) || null;
    if (u.searchParams.get('v')) return u.searchParams.get('v');
    const m = u.pathname.match(/\/(embed|shorts|live)\/([\w-]{11})/);
    if (m) return m[2];
  } catch { /* not a url */ }
  return null;
}

export class WallpaperRenderer {
  constructor(root) {
    this.root = root;
    this.objectUrl = null;
    this.effect = null;
    this.media = null;
    this.token = 0;
  }

  clear() {
    this.effect?.stop();
    this.effect = null;
    this.media = null;
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = null;
    this.root.replaceChildren();
  }

  async render(wp, display) {
    const token = ++this.token;
    this.clear();
    if (!wp) return;
    this.root.dataset.type = wp.type;
    this.applyDisplay(display);

    if (wp.type === 'effect') {
      const c = document.createElement('canvas');
      this.root.append(c);
      this.effect = new EffectRunner(c);
      this.effect.set(wp.effect, wp.opts);
      this.effect.start();
      return;
    }

    if (wp.type === 'youtube') {
      const id = wp.ytId;
      const f = document.createElement('iframe');
      const q = new URLSearchParams({
        autoplay: 1, mute: 1, loop: 1, playlist: id, controls: 0,
        playsinline: 1, rel: 0, iv_load_policy: 3, disablekb: 1, enablejsapi: 1,
      });
      f.src = `https://www.youtube-nocookie.com/embed/${id}?${q}`;
      f.allow = 'autoplay; encrypted-media';
      f.referrerPolicy = 'strict-origin-when-cross-origin';
      f.className = 'yt';
      f.tabIndex = -1;
      this.root.append(f);
      this.media = { kind: 'yt', el: f };
      return;
    }

    let src, mime = wp.mime || '';
    if (wp.type === 'file') {
      const blob = await mediaDB.get(wp.id);
      if (token !== this.token) return;
      if (!blob) { this.root.textContent = '找不到這個檔案，請重新上傳'; return; }
      this.objectUrl = URL.createObjectURL(blob);
      src = this.objectUrl;
      mime = blob.type || mime;
    } else {
      src = wp.url;
    }

    const isVideo = wp.mediaKind === 'video'
      || (wp.mediaKind !== 'image' && (mime.startsWith('video/') || VIDEO_EXT.test(src)));

    if (isVideo) {
      const v = document.createElement('video');
      Object.assign(v, { src, autoplay: true, loop: true, playsInline: true, muted: display.muted });
      v.defaultMuted = display.muted;
      v.playbackRate = display.speed;
      v.addEventListener('loadedmetadata', () => { v.playbackRate = display.speed; });
      v.play().catch(() => { v.muted = true; v.play().catch(() => {}); });
      this.root.append(v);
      this.media = { kind: 'video', el: v };
    } else {
      const img = document.createElement('img');
      img.src = src;
      img.alt = '';
      img.decoding = 'async';
      this.root.append(img);
      this.media = { kind: 'img', el: img };
    }
  }

  applyDisplay(d) {
    this.root.style.setProperty('--fit', d.fit);
    this.root.style.setProperty('--blur', `${d.blur}px`);
    this.root.style.setProperty('--blur-scale', 1 + d.blur / 150);
    document.documentElement.style.setProperty('--dim', d.dim);
    if (this.media?.kind === 'video') {
      this.media.el.muted = d.muted;
      this.media.el.playbackRate = d.speed;
    }
  }

  pause() {
    this.effect?.stop();
    if (this.media?.kind === 'video') this.media.el.pause();
    if (this.media?.kind === 'yt') this.ytCommand('pauseVideo');
  }

  resume() {
    this.effect?.start();
    if (this.media?.kind === 'video') this.media.el.play().catch(() => {});
    if (this.media?.kind === 'yt') this.ytCommand('playVideo');
  }

  ytCommand(func) {
    this.media.el.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args: [] }), '*');
  }
}
