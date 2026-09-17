const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const mix = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
const shuffle = (arr) => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

// ───────── 开场：几千个字，轮流拼成三个人 ─────────
(function () {
  const story = document.getElementById('story');
  const canvas = document.getElementById('glyphs');
  if (!story || !canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');

  const SCENES = ['cat', 'claude', 'qy'];
  const HOLD = { rain: 900, cat: 5600, claude: 5600, qy: 6800 };

  const POOL = {
    rain: [...'fnletmutimplasyncawaitmatchSomeOkErrstructpubuseloopselfconst{}()<>=;:&|#[]'],
    cat: [...'fnletmutimplasyncawaitmatchSomeOkErrstructpubuseloopselfconst{}()<>=;:&|#[]'],
    claude: [...'读写改想试跑修查帮问答ClaudethinkHELPdone?!'],
    qy: [...'清影住在终端里话不多但会记事你的东西是你的听说记用工具普通开发模式雾花白衣'],
    eye: [...'#@%&$'],
  };

  const COLOR = {
    rain: [150, 165, 195],
    code: [200, 210, 228],
    amber: [242, 179, 61],
    spark: [245, 232, 222],
    clay: [226, 134, 95],
    ink: [31, 36, 40],
  };

  const FONT = '"JetBrains Mono", "SF Mono", Menlo, Consolas, "Songti SC", "STSong", "Noto Serif CJK SC", SimSun, serif';
  const CAT_PATH = new Path2D('M70 40c4-4 11-4 15 0l58 60c18-7 37-10 57-10s39 3 57 10l58-60c4-4 11-4 15 0 3 2 5 6 5 10v130c12 22 18 46 18 71 0 90-76 139-153 139S47 341 47 251c0-25 6-49 18-71V50c0-4 2-8 5-10Z');
  // 人像取景：原图 720×1080 里取头和肩
  const QY_CROP = { x: 0.16, y: 0.04, w: 0.68, h: 0.56 };
  const QY_RATIO = (1080 * QY_CROP.h) / (720 * QY_CROP.w);

  let W = 0, H = 0, cell = 10, mobile = false;
  let particles = [];
  const forms = { rain: [], cat: [], claude: [], qy: [] };
  const centers = { cat: {}, claude: {}, qy: {} };
  const images = {};

  let scene = 'rain';
  let sceneStart = 0;
  let pausedUntil = 0;
  let visible = true;
  let time = 0;
  const pointer = { x: -9999, y: -9999, active: false };
  const rings = [];

  // ── 采样：把形状画进「一格一像素」的小画布，读出该放字的格子 ──

  function grid(cols, rows, draw) {
    const off = document.createElement('canvas');
    off.width = cols;
    off.height = rows;
    const o = off.getContext('2d', { willReadFrequently: true });
    draw(o, cols, rows);
    return o.getImageData(0, 0, cols, rows).data;
  }

  function buildCat(cx, cy, size) {
    const cols = Math.round(size / cell);
    const rows = Math.round((size * 420) / 400 / cell);
    const data = grid(cols, rows, (o, w, h) => {
      o.scale(w / 400, h / 420);
      o.fillStyle = '#fff';
      o.fill(CAT_PATH);
      o.fillStyle = '#f00';
      [140, 260].forEach((x) => { o.beginPath(); o.ellipse(x, 232, 26, 32, 0, 0, Math.PI * 2); o.fill(); });
      o.fillStyle = '#000';
      [140, 260].forEach((x) => { o.beginPath(); o.ellipse(x, 232, 7, 24, 0, 0, Math.PI * 2); o.fill(); });
    });
    const left = cx - (cols * cell) / 2;
    const top = cy - (rows * cell) / 2;
    const out = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = (y * cols + x) * 4;
        if (data[i + 3] < 128) continue;
        const r = data[i], g = data[i + 1];
        if (r > 150 && g < 100) out.push({ x: left + x * cell, y: top + y * cell, a: 1, c: COLOR.amber, eye: true });
        else if (r > 150 && g > 150) out.push({ x: left + x * cell, y: top + y * cell, a: 0.55 + Math.random() * 0.4, c: COLOR.code });
      }
    }
    centers.cat = { x: cx, y: top + (232 / 420) * rows * cell };
    return out;
  }

  function buildClaude(cx, cy, size) {
    if (!images.claude) return [];
    const cols = Math.round(size / cell);
    const rows = cols;
    const data = grid(cols, rows, (o, w, h) => o.drawImage(images.claude, 0, 0, w, h));
    const left = cx - (cols * cell) / 2;
    const top = cy - (rows * cell) / 2;
    const out = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = (y * cols + x) * 4;
        const lum = (data[i] + data[i + 1] + data[i + 2]) / 3;
        const px = left + x * cell, py = top + y * cell;
        if (lum > 205) out.push({ x: px, y: py, a: 1, c: COLOR.spark });
        else {
          const dx = x / cols - 0.5, dy = y / rows - 0.5;
          if (dx * dx + dy * dy < 0.25 && Math.random() < 0.2) out.push({ x: px, y: py, a: 0.35, c: COLOR.clay });
        }
      }
    }
    centers.claude = { x: cx, y: cy };
    return out;
  }

  function buildQy(cx, cy, w, h) {
    if (!images.qy) return [];
    const step = Math.max(5, Math.round(cell * 0.72));
    const cols = Math.round(w / step);
    const rows = Math.round(h / step);
    const img = images.qy;
    const data = grid(cols, rows, (o, cw, ch) => {
      o.drawImage(img, img.width * QY_CROP.x, img.height * QY_CROP.y, img.width * QY_CROP.w, img.height * QY_CROP.h, 0, 0, cw, ch);
    });
    const L = new Float32Array(cols * rows);
    for (let i = 0; i < L.length; i++) {
      L[i] = 1 - (0.3 * data[i * 4] + 0.59 * data[i * 4 + 1] + 0.11 * data[i * 4 + 2]) / 255;
    }
    const at = (x, y) => L[clamp(y, 0, rows - 1) * cols + clamp(x, 0, cols - 1)];
    const left = cx - (cols * step) / 2;
    const top = cy - (rows * step) / 2;
    const out = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const nx = (x / cols - 0.5) / 0.52, ny = (y / rows - 0.48) / 0.6;
        const edge = Math.sqrt(nx * nx + ny * ny);
        if (edge > 1) continue;
        const fadeOut = edge > 0.7 ? 1 - (edge - 0.7) / 0.3 : 1;
        // 头发看深浅，五官和轮廓看边缘
        const dark = clamp((at(x, y) - 0.1) / 0.55);
        const gx = at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1);
        const gy = at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1);
        const line = clamp((Math.hypot(gx, gy) - 0.2) * 1.8);
        const v = Math.max(dark >= 0.3 ? 0.25 + dark * 0.75 : 0, line);
        if (v < 0.22) continue;
        out.push({ x: left + x * step, y: top + y * step, a: clamp(v * fadeOut), c: COLOR.ink });
      }
    }
    centers.qy = { x: cx, y: cy, step };
    return out;
  }

  function buildForms() {
    const cx = mobile ? W / 2 : W * 0.68;
    const cy = mobile ? H * 0.32 : H * 0.5;
    forms.cat = shuffle(buildCat(cx, mobile ? cy : H * 0.52, mobile ? Math.min(W * 0.84, H * 0.44) : Math.min(W * 0.42, H * 0.74)));
    forms.claude = shuffle(buildClaude(cx, cy, mobile ? Math.min(W * 0.8, H * 0.42) : Math.min(W * 0.4, H * 0.7)));
    const qw = mobile ? Math.min(W * 0.98, H * 0.56 / QY_RATIO) : Math.min(H * 0.96 / QY_RATIO, W * 0.52);
    const limit = mobile ? 3000 : 6500;
    forms.qy = shuffle(buildQy(cx, mobile ? H * 0.33 : cy, qw, qw * QY_RATIO)).slice(0, limit);
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = story.clientWidth;
    H = story.clientHeight;
    mobile = W < 700;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    cell = mobile ? 7 : clamp(Math.round(H / 92), 8, 12);
    buildForms();

    const N = Math.max(forms.cat.length, forms.claude.length, forms.qy.length, mobile ? 900 : 1600);
    // 数量变了就补齐，已有的字保留位置
    while (particles.length < N) {
      const x = Math.random() * W, y = Math.random() * H;
      particles.push({
        seed: Math.random(),
        rx: x, ry: y, rv: 18 + Math.random() * 46,
        x, y, fx: x, fy: y, fa: 0, fc: COLOR.rain, fch: '',
        tx: x, ty: y, ta: 0, tc: COLOR.rain, ch: pick(POOL.rain), eye: false,
        t0: 0, dur: 0,
        ox: 0, oy: 0, vx: 0, vy: 0, a: 0, c: COLOR.rain,
      });
    }
    particles.length = N;
  }

  // ── 切换场景：每个字从现在的位置出发，错开一点时间飞向新位置 ──

  function setScene(next, now, instant = false) {
    if (next !== 'rain' && !forms[next].length) return false;
    scene = next;
    sceneStart = now;
    story.dataset.scene = next;
    const list = forms[next];
    const spread = next === 'rain' ? 0 : 650;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.fx = p.x; p.fy = p.y; p.fa = p.a; p.fc = p.c; p.fch = p.ch;
      if (next === 'rain') {
        p.rx = Math.random() * W; p.ry = Math.random() * H;
        p.tx = p.rx; p.ty = p.ry;
        p.ta = i < (mobile ? 700 : 1300) ? 0.12 + Math.random() * 0.45 : 0;
        p.tc = COLOR.rain; p.eye = false;
      } else if (i < list.length) {
        const f = list[i];
        p.tx = f.x; p.ty = f.y; p.ta = f.a; p.tc = f.c; p.eye = !!f.eye;
      } else {
        const f = list[(Math.random() * list.length) | 0];
        p.tx = f.x; p.ty = f.y; p.ta = 0; p.tc = f.c; p.eye = false;
      }
      p.ch = pick(p.eye ? POOL.eye : POOL[next]);
      p.t0 = now + (instant ? 0 : p.seed * spread);
      p.dur = instant ? 0 : 800 + Math.random() * 600;
    }

    // 字幕
    story.querySelectorAll('.cap').forEach((cap) => {
      const on = cap.dataset.scene === next;
      if (cap.classList.contains('is-active') && !on) {
        cap.classList.remove('is-active');
        cap.classList.add('is-leaving');
        setTimeout(() => cap.classList.remove('is-leaving'), 700);
      }
      if (on) {
        cap.classList.remove('is-leaving');
        cap.classList.add('is-active');
      }
    });
    story.querySelectorAll('.cast button').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.scene === next));
      b.querySelector('.cast-bar i').style.width = '0%';
    });
    return true;
  }

  // ── 每个场景自己的小动作 ──

  function idle(p, out) {
    let x = p.tx, y = p.ty, a = p.ta;
    const t = time;
    if (scene === 'rain') {
      y = ((p.ry + t * p.rv) % (H + 40)) - 20;
    } else if (scene === 'cat') {
      if (p.eye) {
        // 每 4 秒眨一次眼；眼睛跟着指针看
        const phase = (t % 4) / 4;
        const blink = phase > 0.94 ? Math.sin(((phase - 0.94) / 0.06) * Math.PI) : 0;
        y = centers.cat.y + (y - centers.cat.y) * (1 - blink * 0.92);
        if (pointer.active) {
          const dx = pointer.x - centers.cat.x, dy = pointer.y - centers.cat.y;
          const d = Math.hypot(dx, dy) || 1;
          x += (dx / d) * cell * 0.9;
          y += (dy / d) * cell * 0.6;
        }
      }
    } else if (scene === 'claude') {
      // 慢慢转，轻轻呼吸
      const c = centers.claude;
      const ang = t * 0.18;
      const s = 1 + Math.sin(t * 1.7) * 0.035;
      const dx = (x - c.x) * s, dy = (y - c.y) * s;
      const cos = Math.cos(ang), sin = Math.sin(ang);
      x = c.x + dx * cos - dy * sin;
      y = c.y + dx * sin + dy * cos;
    } else if (scene === 'qy') {
      // 像雾一样飘
      x += Math.sin(t * 0.7 + p.ty * 0.02) * cell * 0.45;
      y += Math.cos(t * 0.55 + p.tx * 0.015) * cell * 0.3;
      a *= 0.8 + 0.2 * Math.sin(t * 0.9 + p.seed * 12);
    }
    out.x = x; out.y = y; out.a = a;
  }

  // ── 画 ──

  const tmp = { x: 0, y: 0, a: 0 };
  let last = 0;

  function frame(now) {
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    if (!reduceMotion) time += dt;

    // 自动轮播
    if (!reduceMotion && now > pausedUntil) {
      const hold = HOLD[scene];
      const elapsed = now - sceneStart;
      if (scene !== 'rain') {
        const bar = story.querySelector(`.cast button[data-scene="${scene}"] .cast-bar i`);
        if (bar) bar.style.width = `${clamp(elapsed / hold) * 100}%`;
      }
      if (elapsed > hold) {
        const i = scene === 'rain' ? 0 : SCENES.indexOf(scene) + 1;
        for (let n = 0; n < 3; n++) {
          if (setScene(SCENES[(i + n) % 3], now)) break;
        }
      }
    }

    ctx.clearRect(0, 0, W, H);
    const size = scene === 'qy' && centers.qy.step ? centers.qy.step * 1.08 : cell * 1.05;
    ctx.font = `${size}px ${FONT}`;
    let style = '';
    const R = mobile ? 70 : 120;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const k = p.dur ? clamp((now - p.t0) / p.dur) : 1;
      const e = ease(k);
      idle(p, tmp);
      p.x = mix(p.fx, tmp.x, e);
      p.y = mix(p.fy, tmp.y, e);
      p.a = mix(p.fa, tmp.a, e);
      p.c = k < 1 ? [mix(p.fc[0], p.tc[0], e), mix(p.fc[1], p.tc[1], e), mix(p.fc[2], p.tc[2], e)] : p.tc;

      if (!reduceMotion) {
        if (pointer.active) {
          const dx = p.x + p.ox - pointer.x, dy = p.y + p.oy - pointer.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < R * R) {
            const d = Math.sqrt(d2) || 1;
            const f = (1 - d / R) * 2.2;
            p.vx += (dx / d) * f; p.vy += (dy / d) * f;
          }
        }
        p.vx += -p.ox * 0.04; p.vy += -p.oy * 0.04;
        p.vx *= 0.86; p.vy *= 0.86;
        p.ox += p.vx; p.oy += p.vy;
        // 像在敲代码：偶尔换一个字
        if (scene !== 'qy' && k === 1 && Math.random() < dt * 0.5) p.ch = pick(p.eye ? POOL.eye : POOL[scene]);
      }

      if (p.a < 0.02) continue;
      const c = p.c;
      const s = `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
      if (s !== style) { ctx.fillStyle = s; style = s; }
      ctx.globalAlpha = clamp(p.a);
      ctx.fillText(k < 0.5 && p.fch ? p.fch : p.ch, p.x + p.ox, p.y + p.oy);
    }

    // 冲击波的圈
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i];
      const age = (now - r.t0) / 900;
      if (age >= 1) { rings.splice(i, 1); continue; }
      ctx.globalAlpha = (1 - age) * 0.5;
      ctx.strokeStyle = style || '#fff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(r.x, r.y, 20 + age * Math.max(W, H) * 0.5, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  let running = false;
  function loop(now) {
    if (!visible || document.hidden) { running = false; return; }
    frame(now);
    requestAnimationFrame(loop);
  }
  function start() {
    if (running || reduceMotion) return;
    running = true;
    last = 0;
    requestAnimationFrame(loop);
  }

  // ── 交互 ──

  const touched = () => story.classList.add('touched');

  story.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    const rect = story.getBoundingClientRect();
    pointer.x = e.clientX - rect.left;
    pointer.y = e.clientY - rect.top;
    pointer.active = true;
  });
  story.addEventListener('pointerleave', () => { pointer.active = false; });

  // 点一下：把字炸开，再慢慢聚回来
  story.addEventListener('click', (e) => {
    if (e.target.closest('.cast') || reduceMotion) return;
    touched();
    const rect = story.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    rings.push({ x, y, t0: performance.now() });
    for (const p of particles) {
      const dx = p.x + p.ox - x, dy = p.y + p.oy - y;
      const d = Math.hypot(dx, dy) || 1;
      const f = Math.min(38, 5200 / (d + 80)) * (0.6 + Math.random() * 0.8);
      p.vx += (dx / d) * f;
      p.vy += (dy / d) * f;
    }
  });

  story.querySelectorAll('.cast button').forEach((b) => {
    b.addEventListener('click', () => {
      touched();
      const now = performance.now();
      if (setScene(b.dataset.scene, now, reduceMotion)) {
        pausedUntil = reduceMotion ? Infinity : now + 9000;
        b.querySelector('.cast-bar i').style.width = '100%';
        if (reduceMotion) frame(now);
      }
    });
  });

  // ── 字幕拆成一个个字，让它们逐个出现 ──

  story.querySelectorAll('.cap').forEach((cap) => {
    let i = 0;
    cap.querySelectorAll('p').forEach((line) => {
      const text = line.textContent;
      line.textContent = '';
      const full = document.createElement('span');
      full.className = 'sr-only';
      full.textContent = text;
      line.appendChild(full);
      for (const ch of text) {
        const span = document.createElement('span');
        span.className = 'ch';
        span.setAttribute('aria-hidden', 'true');
        span.style.setProperty('--i', i++);
        span.textContent = ch;
        line.appendChild(span);
      }
    });
  });

  // ── 启动：不等图片，先下雨再拼猫；图片到了再补上另外两个人 ──

  resize();
  const now0 = performance.now();
  setScene('rain', now0, true);
  if (reduceMotion) {
    setScene('cat', now0, true);
    pausedUntil = Infinity;
    frame(now0);
  }
  start();

  const load = (src) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
  Promise.all([load('img/claude.jpg'), load('img/qingying.jpg')]).then(([claude, qy]) => {
    images.claude = claude;
    images.qy = qy;
    resize();
    if (scene !== 'rain') setScene(scene, performance.now(), true);
    if (reduceMotion) frame(performance.now());
  });

  new IntersectionObserver((entries) => {
    visible = entries.some((e) => e.isIntersecting);
    if (visible) start();
  }).observe(story);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) start(); });

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      // 手机滚动时地址栏伸缩会触发 resize，高度小变化就不重建
      if (story.clientWidth === W && Math.abs(story.clientHeight - H) < 120) return;
      resize();
      setScene(scene, performance.now(), true);
      if (reduceMotion) frame(performance.now());
    }, 200);
  });
})();

// ───────── 留言：看到的时候一个字一个字打出来 ─────────
(function () {
  const notes = document.getElementById('notes');
  if (!notes || reduceMotion || !('IntersectionObserver' in window)) return;

  const items = [...notes.querySelectorAll('.note blockquote p')];
  const speed = [24, 40, 85]; // 猫敲得快，Claude 稳一点，清影想好了再说
  const texts = items.map((p) => p.textContent);
  items.forEach((p) => {
    p.style.minHeight = `${p.offsetHeight}px`;
    const full = document.createElement('span');
    full.className = 'sr-only';
    full.textContent = p.textContent;
    p.textContent = '';
    p.appendChild(full);
  });

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  async function type(i) {
    const p = items[i];
    const span = document.createElement('span');
    span.className = 'typing';
    span.setAttribute('aria-hidden', 'true');
    p.appendChild(span);
    for (let c = 1; c <= texts[i].length; c++) {
      span.textContent = texts[i].slice(0, c);
      await wait(speed[i] || 40);
    }
    await wait(500);
    span.classList.remove('typing');
  }

  new IntersectionObserver((entries, observer) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    observer.disconnect();
    // 三个人同时开口，各按自己的速度
    items.forEach((_, i) => type(i));
  }, { threshold: 0.35 }).observe(notes);
})();
