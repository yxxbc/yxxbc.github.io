// 深色模式切换
(function () {
  const root = document.documentElement;
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const btn = document.getElementById('theme-toggle');

  const saved = () => {
    try { return localStorage.getItem('theme'); } catch (e) { return null; }
  };

  if (btn) {
    btn.addEventListener('click', () => {
      const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      try { localStorage.setItem('theme', next); } catch (e) {}
    });
  }

  // 没手动选过时，跟随系统
  media.addEventListener('change', (e) => {
    if (!saved()) root.dataset.theme = e.matches ? 'dark' : 'light';
  });
})();

// 窄屏默认收起目录
(function () {
  const toc = document.querySelector('.toc details');
  if (toc && !window.matchMedia('(min-width: 1240px)').matches) toc.open = false;
})();

// 代码块复制按钮
document.querySelectorAll('.prose .highlight').forEach((block) => {
  const code = block.querySelector('pre code');
  if (!code || !navigator.clipboard) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'copy';
  btn.textContent = '复制';
  btn.addEventListener('click', () => {
    navigator.clipboard.writeText(code.innerText).then(() => {
      btn.textContent = '已复制';
      setTimeout(() => { btn.textContent = '复制'; }, 1500);
    });
  });
  block.appendChild(btn);
});

// 目录高亮当前小节
(function () {
  const links = document.querySelectorAll('.toc a[href^="#"]');
  if (!links.length || !('IntersectionObserver' in window)) return;
  const map = new Map();
  links.forEach((a) => {
    const el = document.getElementById(decodeURIComponent(a.hash.slice(1)));
    if (el) map.set(el, a);
  });
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      links.forEach((a) => a.classList.remove('active'));
      map.get(entry.target).classList.add('active');
    });
  }, { rootMargin: '-80px 0px -70% 0px' });
  map.forEach((_, el) => observer.observe(el));
})();

// 搜索
(function () {
  const box = document.querySelector('.search');
  if (!box) return;
  const input = document.getElementById('search-input');
  const status = document.getElementById('search-status');
  const results = document.getElementById('search-results');
  let index = null;

  const escape = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  function mark(text, words) {
    const re = new RegExp(`(${words.map(escapeRe).join('|')})`, 'gi');
    // split 带捕获组时，奇数位是命中的词
    return text.split(re).map((part, i) => (i % 2 ? `<mark>${escape(part)}</mark>` : escape(part))).join('');
  }

  function snippet(post, words) {
    if (post.description) return post.description;
    const lower = post.content.toLowerCase();
    const at = Math.max(0, lower.indexOf(words[0]));
    return (at > 30 ? '…' : '') + post.content.slice(Math.max(0, at - 30), at + 90);
  }

  function render() {
    const q = input.value.trim().toLowerCase();
    const url = new URL(location.href);
    if (q) url.searchParams.set('q', input.value.trim()); else url.searchParams.delete('q');
    history.replaceState(null, '', url);

    if (!q) { results.innerHTML = ''; status.textContent = `共 ${index.length} 篇文章`; return; }
    const words = q.split(/\s+/);
    const hits = index
      .map((p) => {
        const title = p.title.toLowerCase();
        const body = `${p.description} ${p.categories.join(' ')} ${p.content}`.toLowerCase();
        if (!words.every((w) => title.includes(w) || body.includes(w))) return null;
        const score = words.reduce((s, w) => s + (title.includes(w) ? 10 : 0) + (p.description.toLowerCase().includes(w) ? 3 : 0), 0);
        return { p, score };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);

    status.textContent = hits.length ? `找到 ${hits.length} 篇` : '没有找到，换个词试试';
    results.innerHTML = hits.map(({ p }) => `
      <article class="post-item">
        <a class="post-item-link" href="${p.url}">
          <div class="post-item-text">
            <h3>${mark(p.title, words)}</h3>
            <p>${mark(snippet(p, words), words)}</p>
            <div class="meta"><time>${p.date}</time></div>
          </div>
        </a>
      </article>`).join('');
  }

  fetch(box.dataset.index)
    .then((r) => r.json())
    .then((data) => {
      index = data;
      input.value = new URLSearchParams(location.search).get('q') || '';
      input.addEventListener('input', render);
      render();
      input.focus();
    })
    .catch(() => { status.textContent = '搜索索引加载失败，请刷新重试'; });
})();
