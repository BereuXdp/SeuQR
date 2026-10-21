/* =========================================================
   SeuQR — Painel (área logada)
   Telas: Dashboard, QR Codes, Novo/Editar QR, Billing, Configurações
   Modo demonstração: sessão e dados ficam no localStorage.
   Ao ligar no backend, troque read/write e as funções de QR por chamadas à API.
   ========================================================= */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const page = document.body.dataset.page;
  const params = new URLSearchParams(location.search);
  const fmt = new Intl.NumberFormat('pt-BR');
  const brl = (n) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  const DAY = 86400000;
  const SHORT_BASE = 'seuqr.com/q/';

  /* ---------- Armazenamento ---------- */
  const read = (k, fallback) => {
    try { const v = JSON.parse(localStorage.getItem(k)); return v ?? fallback; } catch { return fallback; }
  };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sem storage */ } };

  /* ---------- Sessão ---------- */
  const SESSION_KEY = 'seuqr.session';
  let session = read(SESSION_KEY, null);
  if (!session) { location.replace(`/login/?next=${encodeURIComponent(location.pathname + location.search)}`); return; }
  const saveSession = (patch) => { session = { ...session, ...patch }; write(SESSION_KEY, session); };

  const PLANS = {
    starter: { name: 'Starter', price: 0, limit: 3, features: ['Até 3 QR Codes', 'Redirecionamento dinâmico', 'Estatísticas básicas'] },
    pro: { name: 'Pro', price: 49, limit: Infinity, features: ['QR Codes ilimitados', 'Estatísticas avançadas', 'Prioridade no suporte'] },
    business: { name: 'Business', price: 149, limit: Infinity, features: ['Tudo do Pro', 'Múltiplos usuários', 'Insights personalizados'] },
  };
  const plan = () => PLANS[session.plan] || PLANS.starter;

  /* ---------- QR Codes (guardados por e-mail, neste navegador) ---------- */
  const qrKey = () => `seuqr.qrs:${session.email || 'demo'}`;
  const now = Date.now();
  const seed = () => ([
    { id: 'q1', name: 'Cardápio — Unidade Centro', slug: 'menu-centro', type: 'url', legacy: '', dest: 'https://cardapio.com/almoco', content: '', description: 'QR das mesas do salão.', active: true, scans: [12, 18, 9, 22, 17, 30, 26], older: 1184, month: 410, createdAt: now - 40 * DAY, updatedAt: now - 2 * 3600000 },
    { id: 'q2', name: 'Promoção de sexta', slug: 'promo-sexta', type: 'url', legacy: '', dest: 'https://loja.com/promo-sexta', content: '', description: '', active: false, scans: [4, 0, 6, 3, 8, 2, 0], older: 96, month: 54, createdAt: now - 20 * DAY, updatedAt: now - 3 * DAY },
  ]);
  const normalize = (q) => ({
    type: 'url', legacy: '', content: '', description: '', older: 0, month: 0,
    scans: [0, 0, 0, 0, 0, 0, 0], createdAt: now, updatedAt: now, ...q,
  });
  let qrs = read(qrKey(), null);
  if (!Array.isArray(qrs)) { qrs = seed(); write(qrKey(), qrs); }
  qrs = qrs.map(normalize);
  const saveQrs = () => write(qrKey(), qrs);
  const totalScans = (q) => sum(q.scans) + (q.older || 0);
  const monthScans = (q) => sum(q.scans) + (q.month || 0);

  /* ---------- Avisos (inclusive entre páginas) ---------- */
  const toastEl = $('[data-toast]');
  let toastTimer;
  const toast = (msg) => {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-visible'), 2600);
  };
  const flash = (msg) => { try { sessionStorage.setItem('seuqr.flash', msg); } catch { /* sem storage */ } };
  try {
    const f = sessionStorage.getItem('seuqr.flash');
    if (f) { sessionStorage.removeItem('seuqr.flash'); setTimeout(() => toast(f), 200); }
  } catch { /* sem storage */ }

  /* ---------- Barra lateral (igual em todas as telas) ---------- */
  const ICON = {
    overview: '<rect x="3.5" y="3.5" width="7" height="9" rx="2"/><rect x="13.5" y="3.5" width="7" height="5" rx="2"/><rect x="13.5" y="11.5" width="7" height="9" rx="2"/><rect x="3.5" y="15.5" width="7" height="5" rx="2"/>',
    qrs: '<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><path d="M14 14h2.5v2.5H14zM18 18h2.5v2.5H18z"/>',
    pricing: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.5"/>',
    billing: '<rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="M2.5 10h19M6.5 15h4"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  };
  const initials = (name) => (name || 'Você').split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  function renderSide() {
    const side = $('[data-side]');
    if (!side) return;
    const current = page === 'qr-form' ? 'qrs' : page;
    const link = (key, href, label) => `<a href="${href}"${current === key ? ' aria-current="page"' : ''} title="${label}"><svg viewBox="0 0 24 24" aria-hidden="true">${ICON[key]}</svg>${label}</a>`;
    const p = plan();
    const used = qrs.length;
    const pct = p.limit === Infinity ? 100 : Math.min(100, (used / p.limit) * 100);
    const upgrade = session.plan === 'business' ? ''
      : `<a href="/checkout/?plan=${session.plan === 'pro' ? 'business' : 'pro'}" class="btn btn--light dash-plan__btn">Fazer upgrade</a>`;
    side.innerHTML = `
      <a href="/" class="dash-logo" aria-label="SeuQR, página inicial"><img src="/assets/seuqr-logo-white.svg" alt="SeuQR" width="110" height="32"></a>
      <nav class="dash-nav" aria-label="Painel">
        ${link('overview', '/dashboard/', 'Dashboard')}
        ${link('qrs', '/qrcodes/', 'QR Codes')}
        ${link('pricing', '/pricing/', 'Planos')}
        ${link('billing', '/billing/', 'Billing')}
        ${link('settings', '/settings/', 'Configurações')}
      </nav>
      <div class="dash-plan">
        <span class="eyebrow">${p.price ? 'Seu plano' : 'Upgrade pronto'}</span>
        <strong>${esc(p.name)}</strong>
        ${p.price ? '' : '<p>Suba de plano para liberar QR Codes ilimitados e analytics avançado.</p>'}
        <div class="dash-plan__bar"><i style="width:${pct}%"></i></div>
        <small>${p.limit === Infinity ? `${used} QR Codes · ilimitado` : `${used} de ${p.limit} QR Codes`}</small>
        ${upgrade}
      </div>
      <div class="dash-user">
        <span class="dash-avatar">${esc(initials(session.name))}</span>
        <div><strong>${esc(session.name || 'Você')}</strong><small>${esc(session.email || '')}</small></div>
        <button type="button" class="dash-logout" data-logout aria-label="Sair da conta" title="Sair">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10"/></svg>
        </button>
      </div>`;
  }
  renderSide();

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-logout]')) {
      try { localStorage.removeItem(SESSION_KEY); } catch { /* sem storage */ }
      location.href = '/login/';
    }
  });

  /* ---------- Desenho do QR (mesmo estilo do site) ---------- */
  function qrSvg(text) {
    if (typeof window.qrcode !== 'function') return '';
    const qr = window.qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    const n = qr.getModuleCount();
    const m = 2;
    const size = n + m * 2;
    const inFinder = (r, c) => (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
    let mods = '';
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (inFinder(r, c) || !qr.isDark(r, c)) continue;
        mods += `<rect x="${c + m + 0.03}" y="${r + m + 0.03}" width=".94" height=".94" rx=".25"/>`;
      }
    }
    const finder = (r, c) => {
      const x = c + m, y = r + m;
      return `<path fill-rule="evenodd" d="M${x + 0.6} ${y}h3.8a2.6 2.6 0 0 1 2.6 2.6v3.8a.6.6 0 0 1-.6.6h-3.8a2.6 2.6 0 0 1-2.6-2.6v-3.8a.6.6 0 0 1 .6-.6z M${x + 1} ${y + 1}h3.4a1.6 1.6 0 0 1 1.6 1.6v3.4h-3.4a1.6 1.6 0 0 1-1.6-1.6z"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3" rx=".35"/>`;
    };
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="#fff"/><g fill="#0f1115">${finder(0, 0)}${finder(0, n - 7)}${finder(n - 7, 0)}${mods}</g></svg>`;
  }
  const shortUrl = (slug) => `https://${SHORT_BASE}${slug}`;
  // O gerador vem de CDN com defer; espera estar disponível
  const whenQrReady = (fn) => (typeof window.qrcode === 'function' ? fn() : window.addEventListener('load', fn));

  function downloadPng(slug) {
    const svg = qrSvg(shortUrl(slug));
    if (!svg) { toast('Não foi possível gerar o QR agora.'); return; }
    const img = new Image();
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1024;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, 1024, 1024);
      ctx.drawImage(img, 0, 0, 1024, 1024);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `seuqr-${slug}.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        toast('PNG baixado');
      }, 'image/png');
    };
    img.src = url;
  }
  const copyLink = async (slug) => {
    try { await navigator.clipboard.writeText(shortUrl(slug)); toast('Link do QR copiado'); } catch { toast(shortUrl(slug)); }
  };
  const deleteQr = (q) => {
    if (!confirm(`Excluir “${q.name}”? Quem escanear esse QR não será mais redirecionado.`)) return false;
    qrs = qrs.filter((x) => x.id !== q.id);
    saveQrs();
    return true;
  };

  /* ---------- Datas ---------- */
  const ago = (t) => {
    const s = Math.round((Date.now() - t) / 1000);
    if (s < 60) return 'agora';
    if (s < 3600) return `há ${Math.floor(s / 60)} min`;
    if (s < 86400) return `há ${Math.floor(s / 3600)} h`;
    if (s < 7 * 86400) return `há ${Math.floor(s / 86400)} d`;
    return new Date(t).toLocaleDateString('pt-BR');
  };
  const dayLabels = () => Array.from({ length: 7 }, (_, i) =>
    new Date(Date.now() - (6 - i) * DAY).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''));

  /* ---------- Validação (usa os estilos de auth.css) ---------- */
  const setInvalid = (input, bad) => {
    input.closest('.f-group').classList.toggle('is-invalid', bad);
    input.setAttribute('aria-invalid', String(bad));
  };
  const validField = (input) => {
    const v = input.value.trim();
    if (input.type === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
    if (input.pattern && v && !new RegExp(`^(?:${input.pattern})$`).test(v)) return false;
    return v.length >= (+input.getAttribute('minlength') || 1);
  };
  const validate = (form, extra = () => true) => {
    let first = null;
    $$('input[required]', form).forEach((i) => { const bad = !validField(i); setInvalid(i, bad); if (bad && !first) first = i; });
    if (!first && !extra()) first = form.querySelector('[aria-invalid="true"]');
    if (first) first.focus();
    return !first;
  };
  document.addEventListener('input', (e) => {
    const g = e.target.closest && e.target.closest('.f-group.is-invalid');
    if (g && validField(e.target)) setInvalid(e.target, false);
  });

  const statusBadge = (q) => `<span class="status ${q.active ? 'status--on' : 'status--off'}"><i></i>${q.active ? 'Ativo' : 'Pausado'}</span>`;
  const editUrl = (q) => `/qrcodes/new/?id=${encodeURIComponent(q.id)}`;

  /* =========================================================
     Dashboard (visão geral)
     ========================================================= */
  if (page === 'overview') {
    $('[data-user-first]').textContent = (session.name || 'você').split(' ')[0];
    $('[data-stat="total-qrs"]').textContent = fmt.format(qrs.length);
    $('[data-stat="active"]').textContent = fmt.format(qrs.filter((q) => q.active).length);
    $('[data-stat="total-scans"]').textContent = fmt.format(sum(qrs.map(totalScans)));
    $('[data-stat="month"]').textContent = fmt.format(sum(qrs.map(monthScans)));

    const days = Array.from({ length: 7 }, (_, i) => sum(qrs.map((q) => q.scans[i] || 0)));
    const max = Math.max(1, ...days);
    const labels = dayLabels();
    $('[data-week-chart]').innerHTML = days.map((v, i) =>
      `<div${i === 6 ? ' class="is-today"' : ''}><b>${fmt.format(v)}</b><i style="height:${Math.max(3, (v / max) * 100)}%"></i><span>${i === 6 ? 'hoje' : labels[i]}</span></div>`).join('');
    $('[data-week-total]').textContent = `${fmt.format(sum(days))} acessos na semana`;

    const recent = qrs.slice().sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5);
    $('[data-empty]').hidden = qrs.length > 0;
    whenQrReady(() => {
      $('[data-recent]').innerHTML = recent.map((q) => `
        <li><a href="${editUrl(q)}">
          <span class="recent-qr">${qrSvg(shortUrl(q.slug))}</span>
          <span style="min-width:0"><strong>${esc(q.name)}</strong><small>${statusBadge(q)} · ${esc(SHORT_BASE + q.slug)}</small></span>
          <span class="scans"><b>${fmt.format(sum(q.scans))}</b>7 dias</span>
        </a></li>`).join('');
    });
  }

  /* =========================================================
     QR Codes (lista)
     ========================================================= */
  if (page === 'qrs') {
    const tbody = $('[data-qr-rows]');
    const search = $('[data-search]');
    const empty = $('[data-empty]');
    const usage = () => {
      const p = plan();
      $('[data-usage]').textContent = `Plano atual: ${p.name} · ${qrs.length}/${p.limit === Infinity ? '∞' : p.limit} usados`;
    };

    const row = (q) => `
      <tr data-id="${esc(q.id)}">
        <td><div class="qr-cell">
          <span class="recent-qr">${qrSvg(shortUrl(q.slug))}</span>
          <div style="min-width:0"><a href="${editUrl(q)}">${esc(q.name)}</a><small class="mono">${esc(q.dest)}</small></div>
        </div></td>
        <td class="mono">/${esc(q.slug)}</td>
        <td><label class="switch" title="${q.active ? 'Pausar' : 'Ativar'}"><input type="checkbox" data-toggle ${q.active ? 'checked' : ''} aria-label="QR ativo"><span></span></label> ${statusBadge(q)}</td>
        <td class="num">${fmt.format(totalScans(q))}</td>
        <td class="date">${ago(q.updatedAt)}</td>
        <td><div class="row-actions">
          <a class="icon-btn" href="${editUrl(q)}" title="Editar" aria-label="Editar"><svg viewBox="0 0 16 16"><path d="M10.5 2.5l3 3L6 13H3v-3z"/></svg></a>
          <button type="button" class="icon-btn" data-png title="Baixar PNG" aria-label="Baixar PNG"><svg viewBox="0 0 16 16"><path d="M8 2v8M4.5 6.5 8 10l3.5-3.5M3 13h10"/></svg></button>
          <button type="button" class="icon-btn" data-copy title="Copiar link" aria-label="Copiar link"><svg viewBox="0 0 16 16"><rect x="5" y="5" width="9" height="9" rx="2"/><path d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2h-6A1.5 1.5 0 0 0 2 3.5v6A1.5 1.5 0 0 0 3.5 11H5"/></svg></button>
          <button type="button" class="icon-btn icon-btn--danger" data-delete title="Excluir" aria-label="Excluir"><svg viewBox="0 0 16 16"><path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5"/></svg></button>
        </div></td>
      </tr>`;

    const render = () => {
      const term = search.value.trim().toLowerCase();
      const shown = qrs.filter((q) => !term || `${q.name} ${q.slug} ${q.dest}`.toLowerCase().includes(term));
      tbody.innerHTML = shown.map(row).join('');
      empty.hidden = shown.length > 0;
      $('strong', empty).textContent = term ? `Nada encontrado para “${search.value.trim()}”` : 'Nenhum QR Code encontrado';
      usage();
      renderSide();
    };
    whenQrReady(render);
    search.addEventListener('input', render);

    const byRow = (el) => qrs.find((q) => q.id === el.closest('[data-id]').dataset.id);
    tbody.addEventListener('change', (e) => {
      if (!e.target.matches('[data-toggle]')) return;
      const q = byRow(e.target);
      q.active = e.target.checked;
      q.updatedAt = Date.now();
      saveQrs();
      render();
      toast(q.active ? 'QR ativado' : 'QR pausado: quem escanear verá um aviso');
    });
    tbody.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const q = byRow(btn);
      if (btn.matches('[data-png]')) downloadPng(q.slug);
      if (btn.matches('[data-copy]')) copyLink(q.slug);
      if (btn.matches('[data-delete]') && deleteQr(q)) { render(); toast('QR excluído'); }
    });
  }

  /* =========================================================
     Novo / Editar QR
     ========================================================= */
  if (page === 'qr-form') {
    const form = $('[data-qr-form]');
    const editing = params.get('id') ? qrs.find((q) => q.id === params.get('id')) : null;
    if (params.get('id') && !editing) { flash('Esse QR Code não existe mais.'); location.replace('/qrcodes/'); return; }

    const f = form.elements;
    const preview = $('[data-preview]');
    const previewUrl = $('[data-preview-url]');
    const shortEl = $('[data-short-url]');
    const limitAlert = $('[data-limit-alert]');
    let slugTouched = !!editing;
    const slugify = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

    if (editing) {
      document.title = 'Editar QR Code — SeuQR';
      $('[data-form-eyebrow]').textContent = 'Editar QR Code';
      $('[data-form-title]').textContent = editing.name;
      $('[data-submit]').textContent = 'Salvar alterações';
      $('[data-delete]').hidden = false;
      f.name.value = editing.name;
      f.slug.value = editing.slug;
      // O slug já pode estar impresso: não muda depois de criado
      f.slug.readOnly = true;
      f.slug.closest('.f-group').querySelector('.f-hint').insertAdjacentHTML('beforeend', ' · fixo depois de criado');
      f.type.value = editing.type;
      f.legacy.value = editing.legacy;
      f.dest.value = editing.dest;
      f.content.value = editing.content;
      f.description.value = editing.description;
      f.active.checked = editing.active;
    } else {
      const p = plan();
      if (qrs.length >= p.limit) {
        limitAlert.classList.add('is-visible');
        limitAlert.innerHTML = `O plano ${esc(p.name)} permite até ${p.limit} QR Codes. <a class="link" href="/checkout/?plan=pro">Fazer upgrade para o Pro</a> para criar mais.`;
        $('[data-submit]').disabled = true;
      }
    }

    const refresh = () => {
      const slug = f.slug.value.trim() || '…';
      shortEl.textContent = SHORT_BASE + slug;
      previewUrl.textContent = SHORT_BASE + slug;
      preview.innerHTML = qrSvg(shortUrl(f.slug.value.trim() || 'seu-qr'));
      preview.classList.toggle('is-paused', !f.active.checked);
    };
    whenQrReady(refresh);
    f.name.addEventListener('input', () => {
      if (!slugTouched) f.slug.value = slugify(f.name.value);
      refresh();
    });
    f.slug.addEventListener('input', () => { slugTouched = true; f.slug.value = slugify(f.slug.value); refresh(); });
    f.active.addEventListener('change', refresh);
    $('[data-preview-png]').addEventListener('click', () => {
      const slug = f.slug.value.trim();
      if (!slug) { setInvalid(f.slug, true); f.slug.focus(); return; }
      downloadPng(slug);
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const slugErr = $('[data-slug-error]');
      slugErr.textContent = 'Use de 2 a 40 letras minúsculas, números ou hífen.';
      const unique = () => {
        const taken = qrs.some((q) => q.slug === f.slug.value.trim() && q !== editing);
        if (taken) { slugErr.textContent = 'Esse slug já está em uso. Escolha outro.'; setInvalid(f.slug, true); }
        return !taken;
      };
      if (!validate(form, unique)) return;
      const data = {
        name: f.name.value.trim(),
        slug: f.slug.value.trim(),
        type: f.type.value,
        legacy: f.legacy.value.trim(),
        dest: f.dest.value.trim(),
        content: f.content.value.trim(),
        description: f.description.value.trim(),
        active: f.active.checked,
        updatedAt: Date.now(),
      };
      if (editing) {
        Object.assign(editing, data);
        flash('Alterações salvas · o QR impresso continua valendo');
      } else {
        qrs.unshift(normalize({ id: `q${Date.now().toString(36)}`, createdAt: Date.now(), ...data }));
        flash('QR criado! Baixe o PNG e imprima sem medo.');
      }
      saveQrs();
      location.href = '/qrcodes/';
    });

    $('[data-delete]').addEventListener('click', () => {
      if (editing && deleteQr(editing)) { flash('QR excluído'); location.href = '/qrcodes/'; }
    });
  }

  /* =========================================================
     Billing
     ========================================================= */
  if (page === 'billing') {
    const p = plan();
    $('[data-cur-name]').textContent = p.name;
    $('[data-cur-price]').textContent = p.price ? `${brl(p.price)}/mês · cobrança mensal` : 'Grátis';
    $('[data-cur-features]').innerHTML = p.features.map((x) => `<li>${esc(x)}</li>`).join('');
    const pct = p.limit === Infinity ? 100 : Math.min(100, (qrs.length / p.limit) * 100);
    $('[data-cur-bar]').style.width = `${pct}%`;
    $('[data-cur-usage]').textContent = p.limit === Infinity
      ? `${qrs.length} QR Codes · sem limite`
      : `${qrs.length} de ${p.limit} QR Codes usados`;

    const rows = $('[data-plan-rows]');
    rows.innerHTML = Object.entries(PLANS).map(([key, info]) => {
      const current = key === (session.plan || 'starter');
      let action;
      if (current) action = '<button type="button" class="btn btn--outline" disabled>Plano atual</button>';
      else if (key === 'starter') action = '<button type="button" class="btn btn--outline" data-downgrade>Voltar ao Starter</button>';
      else action = `<a class="btn btn--dark" href="/checkout/?plan=${key}">${info.price > p.price ? 'Fazer upgrade' : 'Trocar'}</a>`;
      return `<div class="plan-row${current ? ' is-current' : ''}"><div><b>${info.name}</b><small>${info.price ? `${brl(info.price)}/mês` : 'Grátis'}</small></div>${action}</div>`;
    }).join('');
    rows.addEventListener('click', (e) => {
      if (!e.target.closest('[data-downgrade]')) return;
      if (qrs.length > PLANS.starter.limit) {
        toast(`O Starter permite ${PLANS.starter.limit} QR Codes. Exclua alguns antes de voltar.`);
        return;
      }
      if (confirm('Voltar para o plano Starter (grátis)?')) {
        saveSession({ plan: 'starter' });
        flash('Plano alterado para Starter');
        location.reload();
      }
    });

    const pays = session.payments || [];
    if (pays.length) {
      const table = $('[data-history]');
      table.hidden = false;
      $('[data-history-empty]').hidden = true;
      $('tbody', table).innerHTML = pays.slice().reverse().map((x) => `
        <tr>
          <td>${new Date(x.date).toLocaleDateString('pt-BR')}</td>
          <td>${esc((PLANS[x.plan] || {}).name || x.plan)}</td>
          <td>${x.method === 'stripe' ? 'Stripe' : x.method === 'pix' ? 'Pix' : 'Cartão'}</td>
          <td>${brl(x.amount)}</td>
        </tr>`).join('');
    }
  }

  /* =========================================================
     Configurações
     ========================================================= */
  if (page === 'settings') {
    const p = plan();
    $('[data-settings-plan]').textContent = p.price ? `${p.name} · ${brl(p.price)}/mês` : `${p.name} · grátis`;
    const showEmail = () => { $('[data-settings-email]').textContent = session.email || 'você'; };
    showEmail();

    const profile = $('[data-profile-form]');
    profile.name.value = session.name || '';
    profile.email.value = session.email || '';
    profile.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!validate(profile)) return;
      const oldKey = qrKey();
      saveSession({ name: profile.name.value.trim(), email: profile.email.value.trim() });
      // Os QRs ficam guardados por e-mail: leva junto ao trocar o e-mail
      if (qrKey() !== oldKey) { write(qrKey(), qrs); try { localStorage.removeItem(oldKey); } catch { /* sem storage */ } }
      renderSide();
      showEmail();
      toast('Perfil atualizado');
    });

    $('[data-reset]').addEventListener('click', () => {
      if (!confirm('Apagar a sessão, o plano e os QR Codes de demonstração deste navegador?')) return;
      try {
        Object.keys(localStorage).filter((k) => k.startsWith('seuqr.')).forEach((k) => localStorage.removeItem(k));
      } catch { /* sem storage */ }
      location.href = '/';
    });
  }
})();
