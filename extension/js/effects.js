// 內建程式動畫（canvas）。每個特效：init(state,w,h,opts,ctx) / frame(state,ctx,w,h,t,dt,opts,mouse)
export const EFFECTS = {
  aurora: { label: '極光流動', defaults: { color1: '#6a5cff', color2: '#00d4c8' } },
  particles: { label: '粒子網路（滑鼠互動）', defaults: { color1: '#8ab4ff', color2: '#0b1020' } },
  starfield: { label: '星空穿越', defaults: { color1: '#ffffff', color2: '#05060f' } },
  matrix: { label: '駭客任務數字雨', defaults: { color1: '#3cff7a', color2: '#000000' } },
  rain: { label: '窗外雨夜', defaults: { color1: '#a8c8ff', color2: '#0a1220' } },
  waves: { label: '海浪線條', defaults: { color1: '#ff7eb3', color2: '#1a1033' } },
};

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const rgba = (hex, a) => { const [r, g, b] = hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; };
const rand = (a, b) => a + Math.random() * (b - a);

const impl = {
  aurora: {
    init(s, w, h) {
      s.blobs = Array.from({ length: 6 }, (_, i) => ({
        ph: rand(0, Math.PI * 2), sp: rand(0.15, 0.4), r: rand(0.35, 0.6), mix: i / 5,
      }));
    },
    frame(s, ctx, w, h, t, dt, o) {
      ctx.fillStyle = '#05050d';
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      const [r1, g1, b1] = hexToRgb(o.color1), [r2, g2, b2] = hexToRgb(o.color2);
      for (const b of s.blobs) {
        const tt = t * b.sp * o.speed + b.ph;
        const x = w * (0.5 + 0.38 * Math.sin(tt * 0.9));
        const y = h * (0.5 + 0.32 * Math.cos(tt * 0.7 + b.ph));
        const R = Math.max(w, h) * b.r;
        const c = [r1 + (r2 - r1) * b.mix, g1 + (g2 - g1) * b.mix, b1 + (b2 - b1) * b.mix].map(Math.round);
        const gr = ctx.createRadialGradient(x, y, 0, x, y, R);
        gr.addColorStop(0, `rgba(${c},0.55)`);
        gr.addColorStop(1, `rgba(${c},0)`);
        ctx.fillStyle = gr;
        ctx.fillRect(0, 0, w, h);
      }
      ctx.globalCompositeOperation = 'source-over';
    },
  },

  particles: {
    init(s, w, h, o) {
      const n = Math.round((w * h) / 14000 * o.density);
      s.p = Array.from({ length: Math.min(n, 400) }, () => ({
        x: rand(0, w), y: rand(0, h), vx: rand(-0.3, 0.3), vy: rand(-0.3, 0.3),
      }));
    },
    frame(s, ctx, w, h, t, dt, o, m) {
      ctx.fillStyle = o.color2;
      ctx.fillRect(0, 0, w, h);
      const k = dt * 60 * o.speed, link = 130 * (window.devicePixelRatio || 1);
      for (const p of s.p) {
        if (m.active) {
          const dx = p.x - m.x, dy = p.y - m.y, d2 = dx * dx + dy * dy;
          if (d2 < 22000) { const f = 0.6 / Math.sqrt(d2 + 1); p.vx += dx * f * 0.05; p.vy += dy * f * 0.05; }
        }
        p.vx *= 0.995; p.vy *= 0.995;
        p.x += p.vx * k; p.y += p.vy * k;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
      }
      ctx.lineWidth = 1;
      for (let i = 0; i < s.p.length; i++) {
        const a = s.p[i];
        for (let j = i + 1; j < s.p.length; j++) {
          const b = s.p[j], dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy);
          if (d < link) {
            ctx.strokeStyle = rgba(o.color1, (1 - d / link) * 0.5);
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
        ctx.fillStyle = rgba(o.color1, 0.9);
        ctx.beginPath(); ctx.arc(a.x, a.y, 2, 0, Math.PI * 2); ctx.fill();
      }
    },
  },

  starfield: {
    init(s, w, h, o) {
      s.stars = Array.from({ length: Math.round(600 * o.density) }, () => ({
        x: rand(-1, 1), y: rand(-1, 1), z: rand(0.05, 1),
      }));
    },
    frame(s, ctx, w, h, t, dt, o) {
      ctx.fillStyle = rgba(o.color2, 0.35);
      ctx.fillRect(0, 0, w, h);
      const cx = w / 2, cy = h / 2, f = Math.max(w, h) * 0.5;
      ctx.fillStyle = o.color1;
      for (const st of s.stars) {
        st.z -= dt * 0.25 * o.speed;
        if (st.z <= 0.02) { st.x = rand(-1, 1); st.y = rand(-1, 1); st.z = 1; }
        const x = cx + (st.x / st.z) * f * 0.5, y = cy + (st.y / st.z) * f * 0.5;
        if (x < 0 || x > w || y < 0 || y > h) continue;
        const r = (1 - st.z) * 2.6;
        ctx.globalAlpha = Math.min(1, (1 - st.z) * 1.4);
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
  },

  matrix: {
    init(s, w, h, o, ctx) {
      s.size = Math.round(16 * (window.devicePixelRatio || 1));
      s.cols = Math.ceil(w / s.size);
      s.drops = Array.from({ length: s.cols }, () => rand(-50, 0));
      s.chars = 'アイウエオカキクケコサシスセソタチツテト0123456789ABCDEF';
      ctx.fillStyle = o.color2; ctx.fillRect(0, 0, w, h);
    },
    frame(s, ctx, w, h, t, dt, o) {
      s.acc = (s.acc || 0) + dt * o.speed;
      if (s.acc < 0.05) return;
      s.acc = 0;
      ctx.fillStyle = rgba(o.color2, 0.08);
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = o.color1;
      ctx.font = `${s.size}px monospace`;
      for (let i = 0; i < s.cols; i++) {
        if (Math.random() > o.density) continue;
        const ch = s.chars[(Math.random() * s.chars.length) | 0];
        ctx.fillText(ch, i * s.size, s.drops[i] * s.size);
        if (s.drops[i] * s.size > h && Math.random() > 0.975) s.drops[i] = 0;
        s.drops[i]++;
      }
    },
  },

  rain: {
    init(s, w, h, o) {
      s.drops = Array.from({ length: Math.round(500 * o.density) }, () => ({
        x: rand(0, w), y: rand(0, h), l: rand(10, 30), v: rand(8, 16),
      }));
    },
    frame(s, ctx, w, h, t, dt, o) {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, o.color2); g.addColorStop(1, '#000');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = rgba(o.color1, 0.45);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      const k = dt * 60 * o.speed, dpr = window.devicePixelRatio || 1;
      for (const d of s.drops) {
        d.y += d.v * k * dpr; d.x -= d.v * k * 0.15;
        if (d.y > h) { d.y = -d.l; d.x = rand(0, w + 100); }
        ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - d.l * 0.15, d.y + d.l * dpr);
      }
      ctx.stroke();
    },
  },

  waves: {
    init() {},
    frame(s, ctx, w, h, t, dt, o) {
      ctx.fillStyle = o.color2; ctx.fillRect(0, 0, w, h);
      const lines = Math.round(18 * o.density);
      ctx.lineWidth = 1.5;
      for (let i = 0; i < lines; i++) {
        const p = i / lines;
        ctx.strokeStyle = rgba(o.color1, 0.15 + p * 0.6);
        ctx.beginPath();
        for (let x = 0; x <= w; x += 8) {
          const y = h * (0.35 + p * 0.5)
            + Math.sin(x * 0.004 + t * o.speed * (0.6 + p) + i) * 40 * (1 + p)
            + Math.sin(x * 0.011 - t * o.speed * 0.8) * 12;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    },
  },
};

export class EffectRunner {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.mouse = { x: 0, y: 0, active: false };
    this.running = false;
    this._onResize = () => this.resize();
    this._onMove = e => {
      const d = window.devicePixelRatio || 1;
      this.mouse.x = e.clientX * d; this.mouse.y = e.clientY * d; this.mouse.active = true;
    };
    this._onLeave = () => { this.mouse.active = false; };
  }
  set(effect, opts) {
    this.effect = impl[effect] ? effect : 'aurora';
    this.opts = { ...EFFECTS[this.effect].defaults, speed: 1, density: 1, ...opts };
    this.resize();
  }
  resize() {
    const d = Math.min(window.devicePixelRatio || 1, 2);
    this.w = this.canvas.width = Math.round(innerWidth * d);
    this.h = this.canvas.height = Math.round(innerHeight * d);
    this.state = {};
    impl[this.effect].init(this.state, this.w, this.h, this.opts, this.ctx);
  }
  start() {
    if (this.running) return;
    this.running = true;
    addEventListener('resize', this._onResize);
    addEventListener('pointermove', this._onMove);
    document.addEventListener('pointerleave', this._onLeave);
    this.last = performance.now();
    const loop = now => {
      if (!this.running) return;
      const dt = Math.min((now - this.last) / 1000, 0.1);
      this.last = now;
      impl[this.effect].frame(this.state, this.ctx, this.w, this.h, now / 1000, dt, this.opts, this.mouse);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }
  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    removeEventListener('resize', this._onResize);
    removeEventListener('pointermove', this._onMove);
    document.removeEventListener('pointerleave', this._onLeave);
  }
}
