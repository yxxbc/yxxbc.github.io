// 开场：几千个字，从雨变成猫，变成 Claude，再变成清影。进度跟着滚动走。

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

(function () {
  const story = document.getElementById('story');
  const canvas = document.getElementById('glyphs');
  if (!story || !canvas || !canvas.getContext) return;

  const ctx = canvas.getContext('2d');
  const stage = canvas.parentElement;
  const caps = [...story.querySelectorAll('.cap')].map((el) => ({
    el,
    from: parseFloat(el.dataset.from),
    to: parseFloat(el.dataset.to),
  }));

  // 各段用的字
  const CODE = [...'fnletmutimplasyncawaitmatchSomeOkErrstructpubuseloopselfconst{}()<>=;:&|#[]'];
  const CLAUDE = [...'读写改想试跑修查帮问答ClaudeHELPthinkdone?!'];
  const QY = [...'清影住在终端里话不多但会记事你的东西是你的听说记用工具普通开发模式雾花白衣'];

  // 颜色
  const C = {
    night: [13, 19, 32],
    dawn: [42, 28, 25],
    mist: [237, 237, 232],
    rain: [150, 165, 195],
    code: [190, 200, 220],
    amber: [242, 179, 61],
    clay: [226, 134, 95],
    ink: [31, 36, 40],
    moon: [223, 227, 234],
    dawnText: [242, 229, 220],
  };

  // 时间线（滚动进度 0~1）
  const T = {
    cat: [0.08, 0.27],
    claude: [0.40, 0.54],
    qy: [0.66, 0.84],
  };

  // 人像取景区域的高宽比（原图 720×1080 取 68% 宽、56% 高）
  const QY_RATIO = (1080 * 0.56) / (720 * 0.68);

  const CAT_PATH = new Path2D('M70 40c4-4 11-4 15 0l58 60c18-7 37-10 57-10s39 3 57 10l58-60c4-4 11-4 15 0 3 2 5 6 5 10v130c12 22 18 46 18 71 0 90-76 139-153 139S47 341 47 251c0-25 6-49 18-71V50c0-4 2-8 5-10Z');

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const mix = (a, b, t) => a + (b - a) * t;
  const mixRGB = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];
  const shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  const load = (src) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

  let W = 0, H = 0, cell = 10, particles = [];
  let progress = 0, visible = true, time = 0;
  const pointer = { x: -9999, y: -9999, active: false };
  let images = {};

  // 把一个形状画进「一格一个像素」的小画布，再读出哪些格子该放字
  function sample(cols, rows, draw, test) {
    const off = document.createElement('canvas');
    off.width = cols;
    off.height = rows;
    const o = off.getContext('2d', { willReadFrequently: true });
    draw(o, cols, rows);
    const data = o.getImageData(0, 0, cols, rows).data;
    const out = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = (y * cols + x) * 4;
        const hit = test(data[i], data[i + 1], data[i + 2], data[i + 3], x, y);
        if (hit) out.push({ gx: x, gy: y, ...hit });
      }
    }
    return out;
  }

  function place(points, cx, cy, cols, rows, step = cell) {
    const left = Math.round(cx - (cols * step) / 2);
    const top = Math.round(cy - (rows * step) / 2);
    return points.map((p) => ({ ...p, x: left + p.gx * step, y: top + p.gy * step }));
  }

  function buildCat(cx, cy, size) {
    const cols = Math.round(size / cell);
    const rows = Math.round((size * 420) / 400 / cell);
    const pts = sample(cols, rows, (o, w, h) => {
      o.scale(w / 400, h / 420);
      o.fillStyle = '#fff';
      o.fill(CAT_PATH);
      o.fillStyle = '#f00';
      o.beginPath(); o.ellipse(140, 232, 26, 32, 0, 0, Math.PI * 2); o.fill();
      o.beginPath(); o.ellipse(260, 232, 26, 32, 0, 0, Math.PI * 2); o.fill();
      o.fillStyle = '#000';
      o.beginPath(); o.ellipse(140, 232, 7, 24, 0, 0, Math.PI * 2); o.fill();
      o.beginPath(); o.ellipse(260, 232, 7, 24, 0, 0, Math.PI * 2); o.fill();
    }, (r, g, b, a) => {
      if (a < 128) return null;
      if (r > 150 && g < 100) return { a: 1, color: C.amber, big: true };
      if (r > 150 && g > 150) return { a: 0.7 + Math.random() * 0.3, color: C.code };
      return null;
    });
    return place(pts, cx, cy, cols, rows);
  }

  function buildClaude(cx, cy, size) {
    if (!images.claude) return [];
    const cols = Math.round(size / cell);
    const rows = cols;
    const pts = sample(cols, rows, (o, w, h) => {
      o.drawImage(images.claude, 0, 0, w, h);
    }, (r, g, b, a, x, y) => {
      const lum = (r + g + b) / 3;
      if (lum > 205) return { a: 1, color: C.dawnText, big: true };
      // 头像的底色只留一个淡淡的圆
      const dx = x / cols - 0.5, dy = y / rows - 0.5;
      if (dx * dx + dy * dy < 0.25 && Math.random() < 0.18) return { a: 0.3, color: C.clay };
      return null;
    });
    return place(pts, cx, cy, cols, rows);
  }

  function buildQy(cx, cy, w, h) {
    if (!images.qy) return [];
    // 人像要细一点，字排得更密
    const step = Math.max(5, Math.round(cell * 0.72));
    const cols = Math.round(w / step);
    const rows = Math.round(h / step);
    const img = images.qy;

    const off = document.createElement('canvas');
    off.width = cols;
    off.height = rows;
    const o = off.getContext('2d', { willReadFrequently: true });
    // 只取头和肩，脸大一些才认得出来
    const sx = img.width * 0.16, sy = img.height * 0.04;
    const sw = img.width * 0.68, sh = img.height * 0.56;
    o.drawImage(img, sx, sy, sw, sh, 0, 0, cols, rows);
    const data = o.getImageData(0, 0, cols, rows).data;

    // 亮度，0 是白，1 是黑
    const L = new Float32Array(cols * rows);
    for (let i = 0; i < L.length; i++) {
      L[i] = 1 - (0.3 * data[i * 4] + 0.59 * data[i * 4 + 1] + 0.11 * data[i * 4 + 2]) / 255;
    }
    const at = (x, y) => L[clamp(y, 0, rows - 1) * cols + clamp(x, 0, cols - 1)];

    const pts = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        // 边缘渐隐，只留人
        const nx = (x / cols - 0.5) / 0.52, ny = (y / rows - 0.48) / 0.6;
        const edge = Math.sqrt(nx * nx + ny * ny);
        if (edge > 1) continue;
        const fadeOut = edge > 0.7 ? 1 - (edge - 0.7) / 0.3 : 1;

        // 头发靠深浅，五官和轮廓靠边缘（Sobel）
        const dark = clamp((at(x, y) - 0.1) / 0.55);
        const gx = at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1);
        const gy = at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1);
        const line = clamp((Math.hypot(gx, gy) - 0.2) * 1.8);

        const v = Math.max(dark >= 0.3 ? 0.25 + dark * 0.75 : 0, line);
        if (v < 0.22) continue;
        pts.push({ gx: x, gy: y, a: clamp(v * fadeOut), color: C.ink, small: true });
      }
    }
    return place(pts, cx, cy, cols, rows, step);
  }

  function build() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = stage.clientWidth;
    H = stage.clientHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const mobile = W < 700;
    cell = mobile ? 7 : clamp(Math.round(H / 92), 8, 12);

    let cat, claude, qy;
    if (mobile) {
      const cy = H * 0.34;
      cat = buildCat(W / 2, cy, Math.min(W * 0.86, H * 0.46));
      claude = buildClaude(W / 2, cy, Math.min(W * 0.8, H * 0.42));
      const qw = Math.min(W * 0.98, H * 0.6 / QY_RATIO);
      qy = buildQy(W / 2, H * 0.36, qw, qw * QY_RATIO);
    } else {
      const cx = W * 0.67;
      cat = buildCat(cx, H * 0.52, Math.min(W * 0.44, H * 0.76));
      claude = buildClaude(cx, H * 0.5, Math.min(W * 0.4, H * 0.7));
      const qw = Math.min(H * 0.96 / QY_RATIO, W * 0.52);
      qy = buildQy(cx, H * 0.5, qw, qw * QY_RATIO);
    }

    const limit = mobile ? 3200 : 7000;
    if (qy.length > limit) qy = shuffle(qy).slice(0, limit);
    const N = Math.max(cat.length, claude.length, qy.length, 400);
    shuffle(cat); shuffle(claude); shuffle(qy);

    const slot = (list, i) => {
      if (i < list.length) return list[i];
      if (!list.length) return { x: W / 2, y: H / 2, a: 0, color: C.code };
      return { ...list[(Math.random() * list.length) | 0], a: 0 };
    };

    particles = new Array(N);
    for (let i = 0; i < N; i++) {
      const k = slot(cat, i);
      const c = slot(claude, i);
      const q = slot(qy, i);
      const rx = Math.random() * W;
      const ry = Math.random() * H;
      particles[i] = {
        s: Math.random(),
        rx, ry,
        rv: 14 + Math.random() * 40,
        ra: i < 900 ? 0.12 + Math.random() * 0.4 : 0,
        k, c, q,
        chR: pick(CODE), chK: pick(CODE), chC: pick(CLAUDE), chQ: pick(QY),
        x: rx, y: ry, ox: 0, oy: 0, vx: 0, vy: 0,
      };
    }
  }

  function readProgress() {
    const rect = story.getBoundingClientRect();
    const total = story.offsetHeight - window.innerHeight;
    progress = clamp(-rect.top / (total || 1));
  }

  function phase(p, [a, b], s) {
    return ease(clamp(((p - a) / (b - a)) * 1.5 - s * 0.5));
  }

  let lastP = -1, moving = true;
  function frame(dt, force = false) {
    const p = progress;
    // 没滚动、没指针、字也停稳了，就不用重画（开头下雨时一直要画）
    if (!force && p === lastP && !pointer.active && !moving && p > T.cat[1]) return;
    lastP = p;
    if (!reduceMotion) time += dt;
    let maxMove = 0;

    // 背景：夜 → 晨 → 雾
    const toDawn = ease(clamp((p - T.claude[0]) / (T.claude[1] - T.claude[0])));
    const toMist = ease(clamp((p - T.qy[0]) / (T.qy[1] - T.qy[0])));
    const bg = mixRGB(mixRGB(C.night, C.dawn, toDawn), C.mist, toMist);
    const capColor = mixRGB(mixRGB(C.moon, C.dawnText, toDawn), C.ink, toMist);
    stage.style.background = `rgb(${bg.map(Math.round)})`;
    story.style.setProperty('--cap-color', `rgb(${capColor.map(Math.round)})`);
    story.classList.toggle('started', p > 0.01);

    // 字幕
    const fade = 0.022;
    for (const cap of caps) {
      const o = clamp((p - cap.from) / fade) * clamp((cap.to - p) / fade);
      cap.el.style.opacity = o.toFixed(3);
      cap.el.style.visibility = o > 0 ? 'visible' : 'hidden';
      const shift = ((1 - o) * 14).toFixed(1);
      cap.el.style.transform = W < 700 ? `translateY(${shift}px)` : `translateY(calc(-50% + ${shift}px))`;
    }

    ctx.clearRect(0, 0, W, H);
    const fontSize = cell * 1.05;
    const fontSmall = `${fontSize}px "JetBrains Mono", "Noto Serif SC", monospace`;
    const fontBig = `700 ${fontSize * 1.1}px "JetBrains Mono", "Noto Serif SC", monospace`;
    const fontFine = `${Math.max(5, Math.round(cell * 0.72)) * 1.05}px "Noto Serif SC", serif`;
    let currentFont = '';
    let currentStyle = '';
    const R = W < 700 ? 60 : 110;

    for (let i = 0; i < particles.length; i++) {
      const pt = particles[i];
      const u1 = phase(p, T.cat, pt.s);
      const u2 = phase(p, T.claude, pt.s);
      const u3 = phase(p, T.qy, pt.s);

      // 雨：慢慢往下飘
      const ry = ((pt.ry + time * pt.rv) % (H + 40)) - 20;

      const tx = mix(mix(mix(pt.rx, pt.k.x, u1), pt.c.x, u2), pt.q.x, u3);
      const ty = mix(mix(mix(ry, pt.k.y, u1), pt.c.y, u2), pt.q.y, u3);
      const a = mix(mix(mix(pt.ra, pt.k.a, u1), pt.c.a, u2), pt.q.a, u3);
      if (a < 0.02) { pt.x = tx; pt.y = ty; continue; }

      if (reduceMotion) {
        pt.x = tx; pt.y = ty;
      } else {
        const mx = (tx - pt.x) * 0.22, my = (ty - pt.y) * 0.22;
        pt.x += mx; pt.y += my;
        const m = Math.abs(mx) + Math.abs(my) + Math.abs(pt.vx) + Math.abs(pt.vy);
        if (m > maxMove) maxMove = m;
        // 指针把字推开，松手后弹回
        if (pointer.active) {
          const dx = pt.x + pt.ox - pointer.x;
          const dy = pt.y + pt.oy - pointer.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < R * R) {
            const d = Math.sqrt(d2) || 1;
            const f = (1 - d / R) * 2.4;
            pt.vx += (dx / d) * f;
            pt.vy += (dy / d) * f;
          }
        }
        pt.vx += -pt.ox * 0.06; pt.vy += -pt.oy * 0.06;
        pt.vx *= 0.82; pt.vy *= 0.82;
        pt.ox += pt.vx; pt.oy += pt.vy;
      }

      const col = mixRGB(mixRGB(mixRGB(C.rain, pt.k.color, u1), pt.c.color, u2), pt.q.color, u3);
      const big = (u1 > 0.5 && u2 < 0.5 && pt.k.big) || (u2 > 0.5 && u3 < 0.5 && pt.c.big);
      const font = u3 > 0.5 && pt.q.small ? fontFine : big ? fontBig : fontSmall;
      if (font !== currentFont) { ctx.font = font; currentFont = font; }
      ctx.globalAlpha = clamp(a);
      const style = `rgb(${col[0] | 0},${col[1] | 0},${col[2] | 0})`;
      if (style !== currentStyle) { ctx.fillStyle = style; currentStyle = style; }
      const ch = u3 > 0.5 ? pt.chQ : u2 > 0.5 ? pt.chC : u1 > 0.5 ? pt.chK : pt.chR;
      ctx.fillText(ch, pt.x + pt.ox, pt.y + pt.oy);
    }
    ctx.globalAlpha = 1;
    moving = maxMove > 0.05;
  }

  let last = performance.now();
  let running = false;
  function loop(now) {
    if (!visible) { running = false; return; }
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    readProgress();
    frame(dt);
    requestAnimationFrame(loop);
  }
  function start() {
    if (running) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(loop);
  }

  async function init() {
    const [claude, qy] = await Promise.all([load('img/claude.jpg'), load('img/qingying.jpg')]);
    images = { claude, qy };
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    build();
    readProgress();
    frame(0, true);
    start();
  }

  new IntersectionObserver((entries) => {
    visible = entries.some((e) => e.isIntersecting);
    if (visible && particles.length) start();
  }).observe(story);

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { build(); readProgress(); frame(0, true); }, 150);
  });

  stage.addEventListener('pointermove', (e) => {
    const rect = stage.getBoundingClientRect();
    pointer.x = e.clientX - rect.left;
    pointer.y = e.clientY - rect.top;
    pointer.active = true;
  });
  stage.addEventListener('pointerleave', () => { pointer.active = false; });

  init();
})();
