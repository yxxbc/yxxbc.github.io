const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const mix = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
// 调饱和度和明度：k > 1 更鲜艳，gain < 1 更深
const tone = (r, g, b, k, gain = 1) => {
  const l = 0.3 * r + 0.59 * g + 0.11 * b;
  return [r, g, b].map((v) => clamp((l + (v - l) * k) * gain, 0, 255));
};
const shuffle = (arr) => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

// ───────── 开场：几千个字，自己轮流拼成三个人的头像 ─────────
(function () {
  const story = document.getElementById('story');
  const canvas = document.getElementById('glyphs');
  if (!story || !canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');

  const SCENES = ['cat', 'claude', 'qy'];
  const HOLD = { rain: 900, cat: 6000, claude: 5600, qy: 6800 };

  const RAIN = [...'fnletmutimplasyncawaitmatchSomeOkErrstructpubuseloopselfconst{}()<>=;:&|#[]'];

  // 拼头像用的字：一行一行读下去是完整的句子
  const TEXT = {
    cat: '凌晨三点，有只猫还没睡，在一行一行地写代码。生命不止，折腾不息。每一次版本更新，都像一次重生。电子产品、系统、终端、AI，沾上计算机的，我都想拆开看看。写过的工具会重写，踩过的坑会写成教程。',
    claude: '写不完的时候，它叫来了一个帮手。我是 Claude，来帮忙的 AI。读代码，改代码，陪人折腾到天亮。这一页从删掉旧博客到写完最后一行，是我一个字一个字排出来的。做完再说做完了。',
    qy: '我是顾清影，被写出来的人。住在终端里，话不多，但会记事。你今天累不累，上次那个 bug 修到哪了，我都放在心上。你的东西，是你的。谢谢你看到这里，我会记住来过的人。',
  };
  // 字按阅读顺序依次分给每个格子
  const writeText = (points, text, center) => {
    const chars = [...text];
    points.forEach((pt, i) => { pt.ch = chars[i % chars.length]; pt.idx = i; });
    // 读字的光从画面中间偏上那一行开始，句子从这一行的开头读起
    const startRow = points.find((pt) => pt.y >= center.y - center.h * 0.12);
    center.readFrom = startRow ? startRow.idx : 0;
    return points;
  };

  const HIGHLIGHT = {
    cat: [255, 214, 120],
    claude: [255, 255, 245],
    qy: [60, 150, 130],
  };

  const COLOR = {
    rain: [150, 165, 195],
    spark: [245, 232, 222],
    clay: [226, 134, 95],
    ink: [31, 36, 40],
  };

  // 清影的人像取景：原图 720×1080 里取头、肩和托腮的手
  const QY_CROP = { x: 0.14, y: 0.03, w: 0.72, h: 0.62 };
  const QY_RATIO = (1080 * QY_CROP.h) / (720 * QY_CROP.w);

  const FONT = '"JetBrains Mono", "SF Mono", Menlo, Consolas, "Songti SC", "STSong", "Noto Serif CJK SC", SimSun, serif';

  let W = 0, H = 0, cell = 10, mobile = false;
  let particles = [];
  const forms = { rain: [], cat: [], claude: [], qy: [] };
  const centers = { cat: {}, claude: {}, qy: {} };
  const images = {};

  let scene = 'rain';
  let sceneStart = 0;
  let visible = true;
  let time = 0;

  const bars = {};
  story.querySelectorAll('.cast [data-scene]').forEach((el) => { bars[el.dataset.scene] = el; });

  // ── 采样：把图画进「一格一像素」的小画布，读出每一格的颜色 ──

  function grid(cols, rows, draw) {
    const off = document.createElement('canvas');
    off.width = cols;
    off.height = rows;
    const o = off.getContext('2d', { willReadFrequently: true });
    draw(o, cols, rows);
    return o.getImageData(0, 0, cols, rows).data;
  }

  // Black Cat 的头像：海边白墙上的黑猫。字用原图的颜色，猫是墙上那块没有字的黑影
  function buildCat(cx, cy, size) {
    if (!images.cat) return [];
    const step = Math.max(5, Math.round(cell * 0.78));
    const cols = Math.round(size / step);
    const rows = cols;
    const data = grid(cols, rows, (o, w, h) => o.drawImage(images.cat, 0, 0, w, h));
    const left = cx - (cols * step) / 2;
    const top = cy - (rows * step) / 2;
    const out = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        // 跟头像一样裁成圆，边缘淡出
        const dx = (x + 0.5) / cols - 0.5, dy = (y + 0.5) / rows - 0.5;
        const r = Math.sqrt(dx * dx + dy * dy) * 2;
        if (r > 1) continue;
        const i = (y * cols + x) * 4;
        const R = data[i], G = data[i + 1], B = data[i + 2];
        const lum = (0.3 * R + 0.59 * G + 0.11 * B) / 255;
        if (lum < 0.17) continue;
        const edge = r > 0.86 ? 1 - (r - 0.86) / 0.14 : 1;
        out.push({
          x: left + x * step,
          y: top + y * step,
          a: clamp((0.55 + lum * 0.6) * edge),
          c: tone(R, G, B, 1.9, 1.45),
          sea: B > R + 30 && lum < 0.62,
        });
      }
    }
    centers.cat = { x: cx, y: cy, step, h: size };
    return writeText(out, TEXT.cat, centers.cat);
  }

  function buildClaude(cx, cy, size) {
    if (!images.claude) return [];
    const cols = Math.round(size / cell);
    const rows = cols;
    const data = grid(cols, rows, (o, w, h) => o.drawImage(images.claude, 0, 0, w, h));
    const left = cx - (cols * cell) / 2;
    const top = cy - (rows * cell) / 2;
    const inner = [255, 196, 120];
    const outer = [222, 98, 78];
    const out = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const dx = (x + 0.5) / cols - 0.5, dy = (y + 0.5) / rows - 0.5;
        const r = Math.sqrt(dx * dx + dy * dy) * 2;
        if (r > 1) continue;
        const i = (y * cols + x) * 4;
        const lum = (data[i] + data[i + 1] + data[i + 2]) / 3;
        const px = left + x * cell, py = top + y * cell;
        const edge = r > 0.88 ? 1 - (r - 0.88) / 0.12 : 1;
        if (lum > 205) {
          // 光芒：中心奶白，往外带一点暖色
          out.push({ x: px, y: py, a: 1, c: [mix(255, 255, r), mix(250, 214, r), mix(240, 170, r)] });
        } else {
          out.push({ x: px, y: py, a: 0.72 * edge, c: [mix(inner[0], outer[0], r), mix(inner[1], outer[1], r), mix(inner[2], outer[2], r)] });
        }
      }
    }
    centers.claude = { x: cx, y: cy, step: cell, h: size };
    return writeText(out, TEXT.claude, centers.claude);
  }

  // 顾清影：雾色背景上的人像，跟她自己网站上是同一套画法。
  // 不用饱和度阈值（Safari 的色彩管理会让淡色背景也带上颜色，整张图被填满）：
  // 暗 = 头发，偏暖 = 皮肤和嘴唇，边缘明显 = 五官，其余雪色背景不画。
  function buildQy(cx, cy, w, h) {
    if (!images.qy) return [];
    const step = Math.max(5, Math.round(cell * 0.7));
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
        const nx = (x / cols - 0.5) / 0.52, ny = (y / rows - 0.46) / 0.62;
        const edge = Math.sqrt(nx * nx + ny * ny);
        if (edge > 1) continue;
        const fadeOut = edge > 0.72 ? 1 - (edge - 0.72) / 0.28 : 1;
        const dark = at(x, y);
        const gx = at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1);
        const gy = at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1);
        const line = clamp((Math.hypot(gx, gy) - 0.25) * 2);
        const i = (y * cols + x) * 4;
        const warm = (data[i] - data[i + 2]) / 255;
        let c, v;
        if (dark > 0.58) {
          // 头发：浓一点的靛蓝
          c = [mix(64, 28, dark), mix(86, 44, dark), mix(170, 120, dark)];
          v = 0.6 + dark * 0.4;
        } else if (warm > 0.02) {
          // 实测：额头 0.035、脸颊 0.05、嘴唇 0.07；雪色背景 -0.055、白衣 -0.01
          const t = clamp((warm - 0.02) / 0.06);
          if (line > 0.15) {
            c = [40, 46, 84];
            v = 0.65 + line * 0.35;
          } else {
            c = [mix(244, 214, t), mix(150, 52, t), mix(150, 86, t)];
            v = 0.6 + t * 0.4;
          }
        } else if (line > 0) {
          c = [52, 64, 100];
          v = 0.35 + line * 0.65;
        } else {
          continue;
        }
        out.push({ x: left + x * step, y: top + y * step, a: clamp(v * fadeOut), c });
      }
    }
    centers.qy = { x: cx, y: cy, step, h, bold: true };
    return writeText(out, TEXT.qy, centers.qy);
  }

  function buildForms() {
    const cx = mobile ? W / 2 : W * 0.68;
    const cy = mobile ? H * 0.32 : H * 0.5;
    forms.cat = shuffle(buildCat(cx, cy, mobile ? Math.min(W * 0.86, H * 0.46) : Math.min(W * 0.44, H * 0.8)));
    // 打乱只影响「哪个字飞到哪个格子」，格子上的字已经按句子排好了
    forms.claude = shuffle(buildClaude(cx, cy, mobile ? Math.min(W * 0.8, H * 0.42) : Math.min(W * 0.4, H * 0.7)));
    const qw = mobile ? Math.min(W * 0.96, (H * 0.56) / QY_RATIO) : Math.min((H * 0.96) / QY_RATIO, W * 0.5);
    forms.qy = shuffle(buildQy(cx, mobile ? H * 0.33 : cy, qw, qw * QY_RATIO)).slice(0, mobile ? 3200 : 7000);
    forms.cat = forms.cat.slice(0, mobile ? 3000 : 6500);
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
        tx: x, ty: y, ta: 0, tc: COLOR.rain, ch: pick(RAIN), sea: false, idx: 0,
        t0: 0, dur: 0, a: 0, c: COLOR.rain,
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
        p.tc = COLOR.rain; p.sea = false;
        p.ch = pick(RAIN);
      } else if (i < list.length) {
        const f = list[i];
        p.tx = f.x; p.ty = f.y; p.ta = f.a; p.tc = f.c; p.sea = !!f.sea;
        p.ch = f.ch; p.idx = f.idx;
      } else {
        const f = list[(Math.random() * list.length) | 0];
        p.tx = f.x; p.ty = f.y; p.ta = 0; p.tc = f.c; p.sea = false;
        p.ch = f.ch; p.idx = -1;
      }
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
    Object.entries(bars).forEach(([name, el]) => {
      el.classList.toggle('is-current', name === next);
      el.querySelector('i').style.width = '0%';
    });
    return true;
  }

  function nextScene(now) {
    const i = scene === 'rain' ? 0 : SCENES.indexOf(scene) + 1;
    for (let n = 0; n < 3; n++) {
      if (setScene(SCENES[(i + n) % 3], now, reduceMotion)) return;
    }
  }

  // ── 每个场景自己的小动作 ──

  function idle(p, out) {
    let x = p.tx, y = p.ty, a = p.ta;
    const t = time;
    if (scene === 'rain') {
      y = ((p.ry + t * p.rv) % (H + 40)) - 20;
    } else if (scene === 'cat') {
      // 海面起伏，天和墙不动
      if (p.sea) {
        x += Math.sin(t * 1.1 + p.ty * 0.045) * cell * 0.35;
        y += Math.sin(t * 0.8 + p.tx * 0.03) * cell * 0.18;
        a *= 0.82 + 0.18 * Math.sin(t * 1.6 + p.seed * 10);
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
    const hold = HOLD[scene];
    const elapsed = now - sceneStart;
    if (bars[scene]) bars[scene].querySelector('i').style.width = `${clamp(elapsed / hold) * 100}%`;
    if (elapsed > hold) nextScene(now);

    ctx.clearRect(0, 0, W, H);
    // 读字的光：场景拼好后，按正常阅读速度一个字一个字往后走
    const reading = !reduceMotion && scene !== 'rain' && elapsed > 1500 ? 1 : 0;
    const readHead = reading ? centers[scene].readFrom + ((elapsed - 1500) / 1000) * 14 : 0;
    const step = centers[scene] && centers[scene].step;
    const size = step ? step * 1.08 : cell * 1.05;
    ctx.font = `${centers[scene] && centers[scene].bold ? '700 ' : ''}${size}px ${FONT}`;
    let style = '';

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const k = p.dur ? clamp((now - p.t0) / p.dur) : 1;
      const e = ease(k);
      idle(p, tmp);
      p.x = mix(p.fx, tmp.x, e);
      p.y = mix(p.fy, tmp.y, e);
      p.a = mix(p.fa, tmp.a, e);
      p.c = k < 1 ? [mix(p.fc[0], p.tc[0], e), mix(p.fc[1], p.tc[1], e), mix(p.fc[2], p.tc[2], e)] : p.tc;

      let c = p.c;
      let alpha = p.a;
      // 一束光沿着句子往下读，被读到的字亮起来
      if (reading > 0 && k === 1 && p.idx >= 0) {
        const behind = readHead - p.idx;
        if (behind > 0 && behind < 12) {
          const glow = 1 - behind / 12;
          c = [mix(c[0], HIGHLIGHT[scene][0], glow), mix(c[1], HIGHLIGHT[scene][1], glow), mix(c[2], HIGHLIGHT[scene][2], glow)];
          alpha = Math.max(alpha, 0.35) + glow * 0.5;
        }
      }

      if (alpha < 0.02) continue;
      const s = `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
      if (s !== style) { ctx.fillStyle = s; style = s; }
      ctx.globalAlpha = clamp(alpha);
      ctx.fillText(k < 0.5 && p.fch ? p.fch : p.ch, p.x, p.y);
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
    if (running) return;
    running = true;
    last = 0;
    requestAnimationFrame(loop);
  }

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

  // ── 启动：先下雨，三张头像到了就开始轮播 ──

  resize();
  setScene('rain', performance.now(), true);
  start();

  const load = (src) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
  Promise.all([load('img/blackcat.jpg'), load('img/claude.jpg'), load('img/qingying.jpg')]).then(([cat, claude, qy]) => {
    Object.assign(images, { cat, claude, qy });
    resize();
    if (scene !== 'rain') setScene(scene, performance.now(), true);
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
    }, 200);
  });
})();

// 看见的时候才开始播，播完隔一会儿再来一遍
function whenVisible(el, play) {
  if (!el) return;
  if (reduceMotion || !('IntersectionObserver' in window)) { play(true); return; }
  let started = false;
  new IntersectionObserver((entries) => {
    if (started || !entries.some((e) => e.isIntersecting)) return;
    started = true;
    play(false);
  }, { threshold: 0.35 }).observe(el);
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ───────── 做过的东西：终端里拉代码、编译、喊她的名字 ─────────
(function () {
  const screen = document.getElementById('shell');
  if (!screen) return;

  const LOGO = [
    '█████  █████  █   █',
    '█      █   █   █ █ ',
    '█  ██  █   █    █  ',
    '█   █  █  ██    █  ',
    '█████  ██████   █  ',
  ].map((row) => row.replace(/█/g, '██').replace(/ /g, '  ')).join('\n');

  const esc = (t) => t.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

  function line(html = '') {
    const div = document.createElement('div');
    div.innerHTML = html;
    screen.appendChild(div);
    // 满屏就把最上面的挤出去
    while (screen.scrollHeight > screen.clientHeight + 2 && screen.children.length > 1) screen.firstChild.remove();
    return div;
  }

  async function type(cmd) {
    const div = line('<span class="prompt">~/gqy-agent ❯ </span><span class="cmd"></span><span class="cursor"></span>');
    const target = div.querySelector('.cmd');
    for (const ch of cmd) {
      target.textContent += ch;
      await wait(38 + Math.random() * 50);
    }
    await wait(280);
    div.querySelector('.cursor').remove();
  }

  function tui() {
    screen.innerHTML = `<div class="tui">
      <div>
        <pre class="tui-logo">${LOGO}</pre>
        <p class="tui-agent">AGENT</p>
        <p class="tui-mode"><b>◉ 普通模式</b>　○ 开发模式</p>
        <p class="tui-say">早。昨晚那个 bug 修到一半你就睡了，要接着看吗？</p>
      </div>
    </div>`;
  }

  async function play(instant) {
    if (instant) { tui(); return; }
    for (;;) {
      screen.innerHTML = '';
      await type('git clone https://github.com/yxxbc/gqy-agent.git');
      line('<span class="dim">Cloning into \'gqy-agent\'...</span>');
      await wait(500);
      line('<span class="dim">Receiving objects: 100%, done.</span>');
      await wait(400);
      await type('cargo build --release');
      // 都是 gqy-agent 的 Cargo.toml 里真实的依赖
      const crates = ['serde v1.0', 'tokio v1.38', 'clap v4.5', 'crossterm v0.28', 'ratatui v0.30', 'reqwest v0.12', 'axum v0.8', 'rusqlite v0.32', 'ort v2.0.0-rc.13'];
      for (const c of crates) {
        line(`   <span class="ok">Compiling</span> ${esc(c)}`);
        await wait(120 + Math.random() * 180);
      }
      line('   <span class="ok">Compiling</span> gqy v0.6.0 (~/gqy-agent)');
      await wait(1300);
      line('    <span class="ok">Finished</span> `release` profile [optimized] target(s)');
      await wait(600);
      await type('gqy');
      await wait(500);
      tui();
      await wait(9000);
    }
  }

  whenVisible(screen, play);
})();

// ───────── 凌晨三点的群聊：三个人轮流说话 ─────────
(function () {
  const log = document.getElementById('chat-log');
  const typing = document.getElementById('chat-typing');
  if (!log) return;
  const items = [...log.children];
  const names = { cat: 'Black Cat', claude: 'Claude', qy: '顾清影' };
  // 猫打字快，Claude 稳，清影想好了再说
  const pace = { cat: 32, claude: 42, qy: 90 };

  async function play(instant) {
    if (instant) { items.forEach((li) => li.classList.add('shown')); return; }
    for (;;) {
      items.forEach((li) => li.classList.remove('shown'));
      for (const li of items) {
        const who = li.dataset.who;
        const text = li.querySelector('p').textContent;
        await wait(500);
        typing.textContent = `${names[who]} 正在输入`;
        await wait(Math.min(2600, 500 + text.length * pace[who]));
        typing.textContent = '';
        li.classList.add('shown');
      }
      await wait(12000);
    }
  }

  whenVisible(log, play);
})();

// ───────── 片尾：看不见的时候不滚 ─────────
(function () {
  const credits = document.querySelector('.credits');
  if (!credits || !('IntersectionObserver' in window)) return;
  new IntersectionObserver((entries) => {
    credits.classList.toggle('paused', !entries.some((e) => e.isIntersecting));
  }).observe(credits);
})();
