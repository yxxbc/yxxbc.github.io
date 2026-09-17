const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ───────── 分界线 ─────────
(function () {
  const hero = document.getElementById('hero');
  const seam = document.getElementById('seam');
  if (!hero || !seam) return;

  let split = 50;
  const vertical = window.matchMedia('(max-width: 600px)');
  const set = (value) => {
    split = Math.min(100, Math.max(0, value));
    hero.style.setProperty('--split', split + '%');
    seam.setAttribute('aria-valuenow', Math.round(split));
    seam.setAttribute('aria-orientation', vertical.matches ? 'vertical' : 'horizontal');
    seam.setAttribute('aria-valuetext', split < 25 ? '几乎全是顾清影' : split > 75 ? '几乎全是 Black Cat' : '一半一半');
  };
  const touched = () => hero.classList.add('touched');

  // 开场：线从左边滑到中间，先让人看见藏在左边的名字
  if (!reduceMotion) {
    const from = 12, to = 50, duration = 1400, delay = 700;
    set(from);
    const start = performance.now() + delay;
    const ease = (t) => 1 - Math.pow(1 - t, 4);
    const step = (now) => {
      if (hero.classList.contains('touched')) return;
      const t = Math.min(1, Math.max(0, (now - start) / duration));
      set(from + (to - from) * ease(t));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // 窄屏是上下分，宽屏是左右分
  const fromEvent = (e) => {
    const rect = hero.getBoundingClientRect();
    set(vertical.matches
      ? ((e.clientY - rect.top) / rect.height) * 100
      : ((e.clientX - rect.left) / rect.width) * 100);
  };

  seam.addEventListener('pointerdown', (e) => {
    touched();
    seam.setPointerCapture(e.pointerId);
    seam.classList.add('dragging');
    fromEvent(e);
  });
  seam.addEventListener('pointermove', (e) => {
    if (seam.hasPointerCapture(e.pointerId)) fromEvent(e);
  });
  const end = (e) => {
    seam.classList.remove('dragging');
    if (seam.hasPointerCapture(e.pointerId)) seam.releasePointerCapture(e.pointerId);
  };
  seam.addEventListener('pointerup', end);
  seam.addEventListener('pointercancel', end);

  seam.addEventListener('keydown', (e) => {
    const keys = { ArrowLeft: -5, ArrowRight: 5, ArrowUp: -5, ArrowDown: 5, Home: -100, End: 100 };
    if (!(e.key in keys)) return;
    e.preventDefault();
    touched();
    set(split + keys[e.key]);
  });
})();

// ───────── 猫的眼睛跟着指针 ─────────
(function () {
  const cat = document.querySelector('.big-cat');
  if (!cat || reduceMotion) return;
  const pupils = cat.querySelectorAll('.pupil');
  let frame = 0;

  window.addEventListener('pointermove', (e) => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      const rect = cat.getBoundingClientRect();
      if (rect.bottom < 0) return;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height * 0.55;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy) || 1;
      const reach = Math.min(1, dist / 400);
      const x = (dx / dist) * 13 * reach;
      const y = (dy / dist) * 6 * reach;
      pupils.forEach((p) => { p.style.transform = `translate(${x}px, ${y}px)`; });
    });
  }, { passive: true });
})();

// ───────── 终端里的对话 ─────────
(function () {
  const log = document.getElementById('term-log');
  const replay = document.getElementById('term-replay');
  if (!log) return;
  const lines = [...log.children];
  const texts = lines.map((li) => li.textContent);
  let run = 0;

  const showAll = () => {
    lines.forEach((li, i) => { li.textContent = texts[i]; li.classList.add('shown'); li.classList.remove('typing'); });
  };

  if (reduceMotion || !('IntersectionObserver' in window)) {
    showAll();
    return;
  }

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  async function play() {
    const id = ++run;
    replay.classList.remove('ready');
    lines.forEach((li) => { li.textContent = ''; li.classList.remove('shown', 'typing'); });

    for (let i = 0; i < lines.length; i++) {
      const li = lines[i];
      const text = texts[i];
      const who = li.dataset.who;
      await wait(i === 0 ? 300 : who === 'qy' ? 700 : 450);
      if (id !== run) return;
      li.classList.add('shown');

      if (li.classList.contains('t-sys')) {
        li.textContent = text;
        continue;
      }
      li.classList.add('typing');
      // 猫是敲出来的，清影是想好了再说
      const speed = who === 'cat' ? 70 : 38;
      for (let c = 1; c <= text.length; c++) {
        li.textContent = text.slice(0, c);
        await wait(speed);
        if (id !== run) return;
      }
      li.classList.remove('typing');
    }
    replay.classList.add('ready');
  }

  const observer = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      observer.disconnect();
      play();
    }
  }, { threshold: 0.4 });
  observer.observe(log);

  replay.addEventListener('click', play);
})();
