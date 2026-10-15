(() => {
  const root = document.documentElement;
  root.classList.remove('no-js');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ---------- Ano no rodapé ---------- */
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- Nav de vidro: destaque e nome da seção só ao clicar ---------- */
  const navEl = document.querySelector('.glass-nav');
  const pill = document.querySelector('.glass-nav__pill');
  const bubble = document.querySelector('.glass-nav__bubble');
  const navToast = document.querySelector('.glass-nav__toast');
  const navLinks = [...document.querySelectorAll('.glass-nav__link')];
  const isCompact = () => window.matchMedia('(max-width: 640px)').matches;
  let activeLink = null;
  let navToastTimer;

  const placeBubble = (link) => {
    // Item escondido (ex.: "Início" no mobile) não tem largura: esconde o destaque
    if (!link || !link.offsetWidth) { bubble.classList.remove('is-visible'); return; }
    bubble.style.left = `${link.offsetLeft}px`;
    bubble.style.width = `${link.offsetWidth}px`;
    bubble.classList.add('is-visible');
  };
  const markActive = (link) => navLinks.forEach((a) => {
    a.classList.toggle('is-active', a === link);
    if (a === link) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
  });

  // Mede a posição final do item (já expandido) sem animar e depois anima até lá,
  // assim o destaque e a expansão do nome andam juntos.
  const activate = (link, animate = true) => {
    if (!link) return;
    const prev = activeLink;
    navEl.classList.add('glass-nav--measure');
    markActive(link);
    const target = { left: link.offsetLeft, width: link.offsetWidth };
    if (animate && prev) {
      markActive(prev);
      void pill.offsetWidth; // aplica o estado anterior
      navEl.classList.remove('glass-nav--measure');
      void pill.offsetWidth;
      markActive(link);
    } else {
      navEl.classList.remove('glass-nav--measure');
    }
    activeLink = link;
    if (!link.offsetWidth && !target.width) { bubble.classList.remove('is-visible'); return; }
    bubble.style.left = `${target.left}px`;
    bubble.style.width = `${target.width}px`;
    bubble.classList.add('is-visible');
  };

  const showToast = (link) => {
    if (!isCompact() || !link.offsetWidth) return;
    navToast.textContent = link.querySelector('span').textContent;
    navToast.style.left = `${link.offsetLeft + link.offsetWidth / 2}px`;
    navToast.classList.add('is-visible');
    clearTimeout(navToastTimer);
    navToastTimer = setTimeout(() => navToast.classList.remove('is-visible'), 1800);
  };

  navLinks.forEach((a) => a.addEventListener('click', () => { activate(a); showToast(a); }));
  document.querySelector('.glass-nav__logo').addEventListener('click', () => activate(navLinks[0]));
  window.addEventListener('resize', () => placeBubble(activeLink));

  // Estado inicial: item da seção do link (#hash) ou "Início", sem animação
  const initial = navLinks.find((a) => a.getAttribute('href') === location.hash) || navLinks[0];
  activate(initial, false);
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => placeBubble(activeLink));

  /* ---------- Animate on scroll (estilo PrimeVue AnimateOnScroll) ----------
     Anima ao entrar na tela e some ao sair, repetindo a cada passagem. */
  const aosEls = document.querySelectorAll('[data-aos]');
  const REM = 0.25; // 1 unidade = 0.25rem, como no Tailwind
  const parseAos = (el) => {
    const vars = { '--aos-o': '0' };
    for (const t of el.dataset.aos.split(/\s+/)) {
      let m;
      if ((m = t.match(/^fade-in-(\d+)$/))) vars['--aos-o'] = +m[1] / 100;
      else if ((m = t.match(/^slide-in-from-([lrtb])-(\d+)$/))) {
        const d = `${+m[2] * REM}rem`;
        if (m[1] === 'l') vars['--aos-x'] = `-${d}`;
        if (m[1] === 'r') vars['--aos-x'] = d;
        if (m[1] === 't') vars['--aos-y'] = `-${d}`;
        if (m[1] === 'b') vars['--aos-y'] = d;
      } else if ((m = t.match(/^zoom-in-(\d+)$/))) vars['--aos-s'] = +m[1] / 100;
      else if ((m = t.match(/^spin-in-(-?\d+)$/))) vars['--aos-r'] = `${m[1]}deg`;
      else if ((m = t.match(/^duration-(\d+)$/))) vars['--aos-dur'] = `${m[1]}ms`;
    }
    for (const [k, v] of Object.entries(vars)) el.style.setProperty(k, v);
    // Escalonamento entre irmãos animados
    const siblings = [...el.parentElement.children].filter((c) => c.hasAttribute('data-aos'));
    el.style.setProperty('--aos-delay', `${Math.min(siblings.indexOf(el), 4) * 70}ms`);
  };
  aosEls.forEach(parseAos);
  root.classList.add('aos-ready');

  const leave = (el) => {
    el.classList.remove('aos-enter', 'is-in');
    el.classList.add('aos-leave');
  };
  const isOnScreen = (el) => {
    const r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight;
  };
  // Enquanto a entrada anima (zoom/slide), o elemento muda de tamanho e posição e
  // pode "sair" da tela por um instante. Ignorar a saída nesse intervalo evita o
  // ciclo entra/sai que fazia o bloco piscar; no fim, confere a posição real.
  const settle = (el) => {
    if (!el.aosAnimating) return;
    el.aosAnimating = false;
    clearTimeout(el.aosTimer);
    if (el.classList.contains('aos-enter') && !isOnScreen(el) && el.getBoundingClientRect().top > 0) leave(el);
  };
  aosEls.forEach((el) => el.addEventListener('animationend', (e) => {
    if (e.target === el && e.animationName === 'aos-enter') settle(el);
  }));

  const aosIO = new IntersectionObserver((entries) => {
    entries.forEach(({ target, isIntersecting, intersectionRatio, boundingClientRect }) => {
      const entered = target.classList.contains('aos-enter');
      if (!entered && isIntersecting && intersectionRatio >= 0.2) {
        target.classList.remove('aos-leave');
        target.classList.add('aos-enter', 'is-in');
        if (!reduceMotion) {
          target.aosAnimating = true;
          // Garantia caso o animationend não dispare
          const total = (parseFloat(target.style.getPropertyValue('--aos-dur')) || 750)
            + (parseFloat(target.style.getPropertyValue('--aos-delay')) || 0);
          clearTimeout(target.aosTimer);
          target.aosTimer = setTimeout(() => settle(target), total + 150);
        }
      } else if (entered && !isIntersecting && !target.aosAnimating && boundingClientRect.top > 0) {
        leave(target);
      }
    });
  }, { threshold: [0, 0.2] });
  aosEls.forEach((el) => aosIO.observe(el));

  /* ---------- QR Code real, com marcadores no estilo da logo ---------- */
  function renderQR(el, text, color = '#0f1115') {
    if (!el || typeof window.qrcode !== 'function') return;
    const qr = window.qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    const n = qr.getModuleCount();
    const m = 1; // margem
    const size = n + m * 2;
    const inFinder = (r, c) => (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);

    let modules = '';
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (inFinder(r, c) || !qr.isDark(r, c)) continue;
        // Módulos quase encostados: espaços maiores atrapalham a leitura em alguns leitores
        modules += `<rect x="${c + m + 0.03}" y="${r + m + 0.03}" width=".94" height=".94" rx=".25"/>`;
      }
    }
    const finder = (r, c) => {
      const x = c + m, y = r + m;
      // Mesmo desenho da logo: cantos pequenos em cima-esq/baixo-dir, grandes nos outros dois
      return `<path fill-rule="evenodd" d="M${x + 0.6} ${y}h3.8a2.6 2.6 0 0 1 2.6 2.6v3.8a.6.6 0 0 1-.6.6h-3.8a2.6 2.6 0 0 1-2.6-2.6v-3.8a.6.6 0 0 1 .6-.6z M${x + 1} ${y + 1}h3.4a1.6 1.6 0 0 1 1.6 1.6v3.4h-3.4a1.6 1.6 0 0 1-1.6-1.6z"/>`
        + `<rect x="${x + 2}" y="${y + 2}" width="3" height="3" rx=".35"/>`;
    };
    el.innerHTML = `<svg viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" shape-rendering="geometricPrecision"><g fill="${color}">${finder(0, 0)}${finder(0, n - 7)}${finder(n - 7, 0)}${modules}</g></svg>`;
  }
  renderQR(document.getElementById('hero-qr'), 'https://seuqr.com');
  renderQR(document.getElementById('graph-qr'), 'https://seuqr.com');

  /* ---------- Hero interativo ---------- */
  const hero = document.querySelector('.hero');
  const dest = document.getElementById('dest-url');
  const heroToast = document.getElementById('dest-toast');
  const heroToastText = heroToast.querySelector('[data-toast-text]');
  const chips = [...document.querySelectorAll('.dest-chips button')];
  const scanBtn = document.getElementById('scan-btn');
  const heroQR = document.getElementById('hero-qr');
  const statFmt = new Intl.NumberFormat('pt-BR');

  // Barra do dia de hoje (seg = 0 … dom = 6)
  const heroBars = [...document.querySelectorAll('.mockup .bars i')];
  const todayBar = heroBars[(new Date().getDay() + 6) % 7];
  todayBar.classList.add('is-today');

  const showHeroToast = (msg) => {
    heroToastText.textContent = msg;
    heroToast.classList.remove('is-visible');
    void heroToast.offsetWidth;
    heroToast.classList.add('is-visible');
  };
  const setChips = (url) => chips.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.url === url)));

  // Digitação animada (cancelável se a pessoa começar a interagir)
  let typingId = 0;
  async function typeTo(url) {
    const id = ++typingId;
    if (reduceMotion) { dest.value = url; return true; }
    while (dest.value.length) {
      if (id !== typingId) return false;
      dest.value = dest.value.slice(0, -1);
      await sleep(22);
    }
    await sleep(180);
    for (const ch of url) {
      if (id !== typingId) return false;
      dest.value += ch;
      await sleep(45);
    }
    return true;
  }

  async function applyDest(url, typed) {
    if (typed) {
      if (!(await typeTo(url))) return;
    } else {
      typingId++;
      dest.value = url;
    }
    setChips(url);
    showHeroToast('Destino atualizado · o QR impresso continua valendo');
  }

  const bumpStat = (key) => {
    const el = document.querySelector(`[data-stat="${key}"]`);
    el.dataset.count = String(+el.dataset.count + 1);
    el.textContent = statFmt.format(+el.dataset.count);
    el.classList.remove('is-bump');
    void el.offsetWidth;
    el.classList.add('is-bump');
  };

  let scanning = false;
  async function scan() {
    if (scanning) return;
    scanning = true;
    scanBtn.disabled = true;
    heroQR.classList.remove('is-scanning');
    void heroQR.offsetWidth;
    heroQR.classList.add('is-scanning');
    await sleep(reduceMotion ? 100 : 900);
    const url = dest.value.trim() || 'seuqr.com';
    bumpStat('today');
    bumpStat('week');
    const h = Math.min(parseFloat(todayBar.style.getPropertyValue('--h')) + 4, 96);
    todayBar.style.setProperty('--h', `${h}%`);
    showHeroToast(`Scan registrado · abrindo ${url}`);
    await sleep(300);
    heroQR.classList.remove('is-scanning');
    scanBtn.disabled = false;
    scanning = false;
  }

  // Demonstração automática até a pessoa interagir (e só com o hero visível)
  let autoplay = true;
  let heroVisible = false;
  new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting; }, { threshold: 0.25 })
    .observe(document.querySelector('.hero-stage'));
  const stopAutoplay = () => { autoplay = false; };
  async function demo() {
    const presets = chips.map((c) => c.dataset.url);
    let i = 0;
    await sleep(2400);
    while (autoplay) {
      if (!heroVisible) { await sleep(500); continue; }
      i = (i + 1) % presets.length;
      await applyDest(presets[i], true);
      if (!autoplay) break;
      await sleep(700);
      if (!autoplay) break;
      await scan();
      await sleep(3400);
    }
  }
  demo();

  chips.forEach((c) => c.addEventListener('click', () => {
    stopAutoplay();
    applyDest(c.dataset.url, false);
  }));
  scanBtn.addEventListener('click', () => { stopAutoplay(); scan(); });
  let destTimer;
  dest.addEventListener('focus', () => { stopAutoplay(); typingId++; });
  dest.addEventListener('input', () => {
    stopAutoplay();
    typingId++;
    setChips(dest.value.trim());
    clearTimeout(destTimer);
    destTimer = setTimeout(() => {
      showHeroToast('Destino atualizado · o QR impresso continua valendo');
    }, 500);
  });
  dest.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); scan(); }
  });

  // Inclinação 3D do painel + brilho que segue o cursor (só com mouse)
  const tilt = document.querySelector('.hero-tilt');
  const spot = document.querySelector('.hero__spot');
  if (!reduceMotion && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    let raf = 0;
    let px = 0;
    let py = 0;
    let rect = hero.getBoundingClientRect();
    const refresh = () => { rect = hero.getBoundingClientRect(); };
    window.addEventListener('scroll', refresh, { passive: true });
    window.addEventListener('resize', refresh);
    hero.addEventListener('pointerenter', () => { refresh(); spot.classList.add('is-on'); });
    hero.addEventListener('pointermove', (e) => {
      px = e.clientX;
      py = e.clientY;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const x = px - rect.left;
        const y = py - rect.top;
        const nx = x / rect.width - 0.5;
        const ny = y / rect.height - 0.5;
        tilt.style.transform = `rotateX(${(-ny * 5).toFixed(2)}deg) rotateY(${(nx * 7).toFixed(2)}deg)`;
        spot.style.transform = `translate3d(${x.toFixed(0)}px, ${y.toFixed(0)}px, 0)`;
      });
    });
    hero.addEventListener('pointerleave', () => {
      tilt.style.transform = '';
      spot.classList.remove('is-on');
    });
  }

  /* ---------- Pausa animações infinitas das seções fora da tela ---------- */
  const pauseIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => e.target.classList.toggle('is-offscreen', !e.isIntersecting));
  }, { rootMargin: '150px 0px' });
  document.querySelectorAll('main > section').forEach((sec) => pauseIO.observe(sec));

  /* ---------- Contadores dos stats ---------- */
  const fmt = new Intl.NumberFormat('pt-BR');
  const counters = document.querySelectorAll('[data-count]');
  const countIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      countIO.unobserve(e.target);
      if (reduceMotion) return;
      const start = performance.now();
      const dur = 1400;
      const tick = (t) => {
        const p = Math.min((t - start) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 4);
        e.target.textContent = fmt.format(Math.round(+e.target.dataset.count * eased));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }, { threshold: 0.6 });
  counters.forEach((c) => countIO.observe(c));

  /* ---------- Grafo: destino ativo alternando ---------- */
  const graph = document.getElementById('graph');
  if (graph) {
    const nodes = graph.querySelectorAll('.node');
    const paths = graph.querySelectorAll('.graph__lines path');
    let active = 0;
    const setActive = (i) => {
      nodes.forEach((n, k) => n.classList.toggle('is-active', k === i));
      paths.forEach((p, k) => p.classList.toggle('is-active', k === i));
    };
    setActive(active);
    let timer;
    const start = () => { timer = setInterval(() => setActive(active = (active + 1) % nodes.length), 2600); };
    const stop = () => clearInterval(timer);
    new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop())).observe(graph);
    nodes.forEach((n, i) => n.addEventListener('mouseenter', () => { stop(); setActive(active = i); }));
    graph.addEventListener('mouseleave', () => { stop(); start(); });
  }
})();
