/* =========================================================
   SeuQR — Painel (QR Codes, Faturamento, Configurações)
   Modo demonstração: sessão e dados ficam no localStorage.
   Ao ligar no backend, troque load/save por chamadas à API.
   ========================================================= */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const page = document.body.dataset.page;
  const fmt = new Intl.NumberFormat('pt-BR');
  const brl = (n) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- Sessão ---------- */
  const SESSION_KEY = 'seuqr.session';
  const read = (k, fallback) => {
    try { const v = JSON.parse(localStorage.getItem(k)); return v ?? fallback; } catch { return fallback; }
  };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sem storage */ } };
  let session = read(SESSION_KEY, null);
  if (!session) { location.replace(`/login/?next=${encodeURIComponent(location.pathname)}`); return; }
  const saveSession = (patch) => { session = { ...session, ...patch }; write(SESSION_KEY, session); };

  const PLANS = {
    starter: { name: 'Starter', price: 0, limit: 3, features: ['Até 3 QR Codes', 'Redirecionamento dinâmico', 'Estatísticas básicas'] },
    pro: { name: 'Pro', price: 49, limit: Infinity, features: ['QR Codes ilimitados', 'Estatísticas avançadas', 'Prioridade no suporte'] },
    business: { name: 'Business', price: 149, limit: Infinity, features: ['Tudo do Pro', 'Múltiplos usuários', 'Insights personalizados'] },
  };
  const plan = () => PLANS[session.plan] || PLANS.starter;

  /* ---------- QR Codes (por e-mail, neste navegador) ---------- */
  const QR_KEY = `seuqr.qrs:${session.email || 'demo'}`;
  const seed = () => ([
    { id: 'q1', name: 'Cardápio — Unidade Centro', slug: 'menu-centro', dest: 'cardapio.com/almoco', active: true, scans: [12, 18, 9, 22, 17, 30, 26], older: 1184 },
    { id: 'q2', name: 'Promoção de sexta', slug: 'promo-sexta', dest: 'loja.com/promo-sexta', active: false, scans: [4, 0, 6, 3, 8, 2, 0], older: 96 },
  ]);
  let qrs = read(QR_KEY, null);
  if (!Array.isArray(qrs)) { qrs = seed(); write(QR_KEY, qrs); }
  const saveQrs = () => write(QR_KEY, qrs);
  const sum = (a) => a.reduce((x, y) => x + y, 0);

  /* ---------- Aviso flutuante ---------- */
  const toastEl = $('[data-toast]');
  let toastTimer;
  const toast = (msg) => {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-visible'), 2400);
  };

  /* ---------- Barra lateral (igual nas três telas) ---------- */
  const ICON = {
    qrs: '<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><path d="M14 14h2.5v2.5H14zM18 18h2.5v2.5H18z"/>',
    billing: '<rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="M2.5 10h19M6.5 15h4"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  };
  const initials = (name) => (name || 'Você').split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  function renderSide() {
    const side = $('[data-side]');
    if (!side) return;
    const link = (key, href, label) => `<a href="${href}"${page === key ? ' aria-current="page"' : ''}><svg viewBox="0 0 24 24" aria-hidden="true">${ICON[key]}</svg>${label}</a>`;
    const p = plan();
    const used = qrs.length;
    const limitTxt = p.limit === Infinity ? `${used} QR Codes · ilimitado` : `${used} de ${p.limit} QR Codes`;
    const pct = p.limit === Infinity ? 100 : Math.min(100, (used / p.limit) * 100);
    side.innerHTML = `
      <a href="/" class="dash-logo" aria-label="SeuQR, página inicial"><img src="/assets/seuqr-logo-white.svg" alt="SeuQR" width="110" height="32"></a>
      <nav class="dash-nav" aria-label="Painel">
        ${link('qrs', '/dashboard/', 'QR Codes')}
        ${link('billing', '/billing/', 'Faturamento')}
        ${link('settings', '/settings/', 'Configurações')}
      </nav>
      <div class="dash-plan">
        <span class="eyebrow">Seu plano</span>
        <strong>${esc(p.name)}</strong>
        <div class="dash-plan__bar"><i style="width:${pct}%"></i></div>
        <small>${limitTxt}</small>
        ${session.plan === 'business' ? '' : `<a href="/checkout/?plan=${session.plan === 'pro' ? 'business' : 'pro'}" class="btn btn--light dash-plan__btn">Fazer upgrade</a>`}
      </div>
      <div class="dash-user">
        <span class="dash-avatar">${esc(initials(session.name))}</span>
        <div><strong>${esc(session.name || 'Você')}</strong><small>${esc(session.email || '')}</small></div>
        <button type="button" class="dash-logout" data-logout aria-label="Sair" title="Sair">
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
  const qrUrl = (q) => `https://seuqr.com/q/${q.slug}`;

  function downloadPng(q) {
    const svg = qrSvg(qrUrl(q));
    if (!svg) return toast('Não foi possível gerar o QR agora.');
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
        a.download = `seuqr-${q.slug}.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        toast('PNG baixado');
      }, 'image/png');
    };
    img.src = url;
  }

  /* ---------- Validação simples (usa os estilos de auth.css) ---------- */
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

  /* =========================================================
     Tela: QR Codes
     ========================================================= */
  if (page === 'qrs') {
    const list = $('[data-qr-list]');
    const empty = $('[data-empty]');
    const search = $('[data-search]');
    const firstName = (session.name || 'você').split(' ')[0];
    $('[data-user-first]').textContent = firstName;

    const renderStats = () => {
      const active = qrs.filter((q) => q.active);
      $('[data-stat="active"]').textContent = fmt.format(active.length);
      $('[data-stat="today"]').textContent = fmt.format(sum(qrs.map((q) => q.scans[6] || 0)));
      $('[data-stat="week"]').textContent = fmt.format(sum(qrs.map((q) => sum(q.scans))));
      $('[data-stat="total"]').textContent = fmt.format(sum(qrs.map((q) => sum(q.scans) + (q.older || 0))));
    };

    const card = (q) => {
      const max = Math.max(1, ...q.scans);
      const bars = q.scans.map((s) => `<i style="height:${Math.max(8, (s / max) * 100)}%"></i>`).join('');
      return `
      <article class="qr-item${q.active ? '' : ' is-paused'}" data-id="${esc(q.id)}">
        <div class="qr-item__top">
          <div class="qr-item__qr" role="img" aria-label="QR Code de ${esc(q.name)}">${qrSvg(qrUrl(q))}</div>
          <div style="min-width:0">
            <h3 title="${esc(q.name)}">${esc(q.name)}</h3>
            <span class="qr-item__slug mono">seuqr.com/q/${esc(q.slug)}</span>
            <div class="qr-item__meta">
              <span class="status ${q.active ? 'status--on' : 'status--off'}"><i></i>${q.active ? 'Ativo' : 'Pausado'}</span>
              <span class="qr-item__scans"><b>${fmt.format(sum(q.scans))}</b> scans/7 dias</span>
            </div>
          </div>
        </div>
        <div class="qr-item__dest">
          <label for="dest-${esc(q.id)}">Destino</label>
          <form class="dest-edit" data-dest-form>
            <input id="dest-${esc(q.id)}" value="${esc(q.dest)}" data-dest spellcheck="false" autocomplete="off">
            <button type="submit" class="btn btn--dark" disabled>Salvar</button>
          </form>
        </div>
        <div class="spark" aria-hidden="true">${bars}</div>
        <div class="qr-item__actions">
          <label class="switch"><input type="checkbox" data-toggle ${q.active ? 'checked' : ''}><span></span>${q.active ? 'Ativo' : 'Pausado'}</label>
          <button type="button" class="icon-btn" data-png title="Baixar PNG"><svg viewBox="0 0 16 16"><path d="M8 2v8M4.5 6.5 8 10l3.5-3.5M3 13h10"/></svg>PNG</button>
          <button type="button" class="icon-btn" data-copy title="Copiar link do QR"><svg viewBox="0 0 16 16"><rect x="5" y="5" width="9" height="9" rx="2"/><path d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2h-6A1.5 1.5 0 0 0 2 3.5v6A1.5 1.5 0 0 0 3.5 11H5"/></svg>Link</button>
          <button type="button" class="icon-btn icon-btn--danger" data-delete aria-label="Excluir QR" title="Excluir"><svg viewBox="0 0 16 16"><path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5"/></svg></button>
        </div>
      </article>`;
    };

    const render = () => {
      const term = search.value.trim().toLowerCase();
      const shown = qrs.filter((q) => !term || `${q.name} ${q.dest} ${q.slug}`.toLowerCase().includes(term));
      list.innerHTML = shown.map(card).join('');
      empty.hidden = qrs.length > 0;
      if (term && !shown.length) list.innerHTML = `<p class="dash-empty">Nada encontrado para “${esc(term)}”.</p>`;
      renderStats();
      renderSide();
    };
    // O gerador de QR vem de CDN com defer; renderiza assim que estiver disponível
    if (typeof window.qrcode === 'function') render(); else window.addEventListener('load', render);
    search.addEventListener('input', render);

    const byId = (el) => qrs.find((q) => q.id === el.closest('[data-id]').dataset.id);

    list.addEventListener('input', (e) => {
      if (!e.target.matches('[data-dest]')) return;
      const q = byId(e.target);
      e.target.form.querySelector('button').disabled = !e.target.value.trim() || e.target.value.trim() === q.dest;
    });
    list.addEventListener('submit', (e) => {
      if (!e.target.matches('[data-dest-form]')) return;
      e.preventDefault();
      const input = $('[data-dest]', e.target);
      const q = byId(input);
      q.dest = input.value.trim();
      saveQrs();
      e.target.querySelector('button').disabled = true;
      toast('Destino atualizado · o QR impresso continua valendo');
    });
    list.addEventListener('change', (e) => {
      if (!e.target.matches('[data-toggle]')) return;
      const q = byId(e.target);
      q.active = e.target.checked;
      saveQrs();
      render();
      toast(q.active ? 'QR ativado' : 'QR pausado: quem escanear verá um aviso');
    });
    list.addEventListener('click', async (e) => {
      const btn = e.target.closest('button');
      if (!btn || !btn.closest('[data-id]')) return;
      const q = byId(btn);
      if (btn.matches('[data-png]')) downloadPng(q);
      if (btn.matches('[data-copy]')) {
        try { await navigator.clipboard.writeText(qrUrl(q)); toast('Link do QR copiado'); } catch { toast(qrUrl(q)); }
      }
      if (btn.matches('[data-delete]') && confirm(`Excluir “${q.name}”? Quem escanear esse QR não será mais redirecionado.`)) {
        qrs = qrs.filter((x) => x !== q);
        saveQrs();
        render();
        toast('QR excluído');
      }
    });

    /* Novo QR */
    const modal = $('[data-modal]');
    const form = $('[data-create-form]');
    const nameIn = $('#qr-name');
    const slugIn = $('#qr-slug');
    const destIn = $('#qr-dest');
    const limitAlert = $('[data-limit-alert]');
    const submit = $('button[type="submit"]', form);
    let slugTouched = false;
    const slugify = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

    const openModal = () => {
      form.reset();
      slugTouched = false;
      $$('.f-group', form).forEach((g) => g.classList.remove('is-invalid'));
      const p = plan();
      const full = qrs.length >= p.limit;
      limitAlert.classList.toggle('is-visible', full);
      limitAlert.innerHTML = full ? `O plano ${esc(p.name)} permite até ${p.limit} QR Codes. <a class="link" href="/checkout/?plan=pro">Fazer upgrade para o Pro</a> para criar mais.` : '';
      submit.disabled = full;
      modal.showModal();
      if (!full) nameIn.focus();
    };
    $$('[data-new-qr]').forEach((b) => b.addEventListener('click', openModal));
    $('[data-close]', form).addEventListener('click', () => modal.close());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.close(); });
    nameIn.addEventListener('input', () => { if (!slugTouched) slugIn.value = slugify(nameIn.value); });
    slugIn.addEventListener('input', () => { slugTouched = true; slugIn.value = slugify(slugIn.value); });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const slugErr = $('[data-slug-error]');
      slugErr.textContent = 'Use de 2 a 40 letras minúsculas, números ou hífen.';
      const unique = () => {
        if (qrs.some((q) => q.slug === slugIn.value.trim())) {
          slugErr.textContent = 'Esse link já está em uso. Escolha outro.';
          setInvalid(slugIn, true);
          return false;
        }
        return true;
      };
      if (!validate(form, unique)) return;
      qrs.unshift({
        id: `q${Date.now().toString(36)}`,
        name: nameIn.value.trim(),
        slug: slugIn.value.trim(),
        dest: destIn.value.trim(),
        active: true,
        scans: [0, 0, 0, 0, 0, 0, 0],
        older: 0,
      });
      saveQrs();
      modal.close();
      search.value = '';
      render();
      toast('QR criado! Baixe o PNG e imprima sem medo.');
    });
  }

  /* =========================================================
     Tela: Faturamento
     ========================================================= */
  if (page === 'billing') {
    const p = plan();
    $('[data-cur-name]').textContent = p.name;
    $('[data-cur-price]').textContent = p.price ? `${brl(p.price)}/mês · cobrança mensal` : 'Grátis';
    $('[data-cur-features]').innerHTML = p.features.map((f) => `<li>${esc(f)}</li>`).join('');
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
        location.reload();
      }
    });

    const pays = session.payments || [];
    const table = $('[data-history]');
    if (pays.length) {
      table.hidden = false;
      $('[data-history-empty]').hidden = true;
      $('tbody', table).innerHTML = pays.slice().reverse().map((x) => `
        <tr>
          <td>${new Date(x.date).toLocaleDateString('pt-BR')}</td>
          <td>${esc((PLANS[x.plan] || {}).name || x.plan)}</td>
          <td>${x.method === 'pix' ? 'Pix' : 'Cartão'}</td>
          <td>${brl(x.amount)}</td>
        </tr>`).join('');
    }
  }

  /* =========================================================
     Tela: Configurações
     ========================================================= */
  if (page === 'settings') {
    const profile = $('[data-profile-form]');
    profile.name.value = session.name || '';
    profile.email.value = session.email || '';
    profile.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!validate(profile)) return;
      const oldKey = QR_KEY;
      const email = profile.email.value.trim();
      saveSession({ name: profile.name.value.trim(), email });
      // Os QRs ficam guardados por e-mail: leva junto ao trocar o e-mail
      const newKey = `seuqr.qrs:${email}`;
      if (newKey !== oldKey) { write(newKey, qrs); try { localStorage.removeItem(oldKey); } catch { /* sem storage */ } }
      renderSide();
      toast('Perfil atualizado');
    });

    const pw = $('[data-password-form]');
    pw.addEventListener('submit', (e) => {
      e.preventDefault();
      const match = () => {
        const ok = pw.password.value === pw.confirm.value;
        setInvalid(pw.confirm, !ok);
        return ok;
      };
      if (!validate(pw, match)) return;
      pw.reset();
      toast('Senha atualizada (demonstração)');
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
