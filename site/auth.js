/* =========================================================
   SeuQR — Login, cadastro e checkout
   ========================================================= */
(() => {
  /* ---------------------------------------------------------
     INTEGRAÇÃO COM O BACKEND
     Enquanto DEMO = true, nada é enviado: o envio é simulado.
     Para ligar na API, troque DEMO para false e ajuste submitTo()
     (cada <form> tem o endpoint em data-endpoint).
     Pagamento: feito na página da Stripe (Checkout). O SeuQR não
     recebe dados de cartão. Configure UMA das opções em STRIPE.
     --------------------------------------------------------- */
  const DEMO = true;

  const STRIPE = {
    // Opção A (recomendada): o backend cria a Checkout Session e devolve { url }.
    //   success_url: https://seuqr.com/welcome/?plan={plano}&paid=1&session_id={CHECKOUT_SESSION_ID}
    //   cancel_url:  https://seuqr.com/checkout/?plan={plano}&canceled=1
    //   Ative o plano pelo webhook checkout.session.completed, não pela volta do navegador.
    checkoutEndpoint: '/api/billing/checkout',
    // Opção B (sem servidor): Payment Links criados no painel da Stripe.
    //   Ex.: pro: 'https://buy.stripe.com/xxxx'. Se preenchido, é usado no lugar da opção A.
    paymentLinks: { pro: '', business: '' },
  };

  async function submitTo(endpoint, payload) {
    if (DEMO) {
      await sleep(900);
      return { ok: true, demo: true };
    }
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Não foi possível concluir. Tente de novo.');
    return { ok: true, ...data };
  }

  const PLANS = {
    starter: { name: 'Starter', price: 0 },
    pro: {
      name: 'Pro',
      price: 49,
      desc: 'Para negócios que precisam editar campanhas em tempo real.',
      features: ['QR Codes ilimitados', 'Estatísticas avançadas', 'Prioridade no suporte'],
    },
    business: {
      name: 'Business',
      price: 149,
      desc: 'Governança, times e mais previsibilidade para operações maiores.',
      features: ['Tudo do Pro', 'Múltiplos usuários', 'Insights personalizados'],
    },
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const brl = (n) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const params = new URLSearchParams(location.search);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  /* ---------- QR (mesmo estilo do site) ---------- */
  function renderQR(el, text) {
    if (!el || typeof window.qrcode !== 'function') return;
    const qr = window.qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    const n = qr.getModuleCount();
    const m = 1;
    const size = n + m * 2;
    const inFinder = (r, c) => (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
    let modules = '';
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (inFinder(r, c) || !qr.isDark(r, c)) continue;
        modules += `<rect x="${c + m + 0.03}" y="${r + m + 0.03}" width=".94" height=".94" rx=".25"/>`;
      }
    }
    const finder = (r, c) => {
      const x = c + m, y = r + m;
      return `<path fill-rule="evenodd" d="M${x + 0.6} ${y}h3.8a2.6 2.6 0 0 1 2.6 2.6v3.8a.6.6 0 0 1-.6.6h-3.8a2.6 2.6 0 0 1-2.6-2.6v-3.8a.6.6 0 0 1 .6-.6z M${x + 1} ${y + 1}h3.4a1.6 1.6 0 0 1 1.6 1.6v3.4h-3.4a1.6 1.6 0 0 1-1.6-1.6z"/>`
        + `<rect x="${x + 2}" y="${y + 2}" width="3" height="3" rx=".35"/>`;
    };
    el.innerHTML = `<svg viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg"><g fill="#0f1115">${finder(0, 0)}${finder(0, n - 7)}${finder(n - 7, 0)}${modules}</g></svg>`;
  }
  $$('[data-qr]').forEach((el) => renderQR(el, el.dataset.qr));

  /* ---------- Texto que alterna no painel de marca ---------- */
  $$('[data-cycle]').forEach((el) => {
    const words = el.dataset.cycle.split('|');
    let i = 0;
    el.style.transition = 'opacity .3s, transform .3s';
    setInterval(async () => {
      i = (i + 1) % words.length;
      if (reduceMotion) { el.textContent = words[i]; return; }
      el.style.opacity = '0';
      el.style.transform = 'translateY(-6px)';
      await sleep(300);
      el.textContent = words[i];
      el.style.transform = 'translateY(6px)';
      requestAnimationFrame(() => { el.style.opacity = '1'; el.style.transform = 'none'; });
    }, 2600);
  });

  /* ---------- Mostrar/ocultar senha ---------- */
  $$('[data-toggle-pw]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = btn.parentElement.querySelector('input');
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.setAttribute('aria-label', show ? 'Ocultar senha' : 'Mostrar senha');
      btn.innerHTML = show
        ? '<svg viewBox="0 0 24 24"><path d="M3 3l18 18M10.6 6.1A10 10 0 0 1 12 6c6 0 9.5 6 9.5 6a17 17 0 0 1-3 3.6M6.6 6.7C3.9 8.4 2.5 12 2.5 12S6 18 12 18c1.6 0 3-.4 4.3-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>'
        : '<svg viewBox="0 0 24 24"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/></svg>';
      input.focus();
    });
  });

  /* ---------- Força da senha ---------- */
  $$('[data-strength]').forEach((input) => {
    const group = input.closest('.f-group');
    const bar = $('.strength', group);
    const label = $('[data-strength-label]', group);
    const texts = ['Use letras, números e símbolos.', 'Senha fraca', 'Senha razoável', 'Senha boa', 'Senha forte'];
    input.addEventListener('input', () => {
      const v = input.value;
      let s = 0;
      if (v.length >= 8) s++;
      if (/[a-z]/.test(v) && /[A-Z]/.test(v)) s++;
      if (/\d/.test(v)) s++;
      if (/[^A-Za-z0-9]/.test(v) || v.length >= 14) s++;
      if (!v) s = 0;
      bar.dataset.level = String(s);
      label.textContent = texts[s];
    });
  });

  /* ---------- Validação ---------- */
  function isValid(input) {
    const v = input.value.trim();
    const rule = input.dataset.validate;
    if (input.type === 'checkbox') return !input.required || input.checked;
    if (input.type === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
    if (rule === 'required' || input.required) {
      const min = +input.getAttribute('minlength') || 1;
      return v.length >= min;
    }
    return true;
  }
  const setInvalid = (input, bad) => {
    const group = input.closest('.f-group');
    if (group) group.classList.toggle('is-invalid', bad);
    input.setAttribute('aria-invalid', String(bad));
  };
  const fieldsOf = (form) => $$('input', form).filter((i) =>
    (i.required || i.dataset.validate) && !i.closest('[hidden]'));

  function validate(form) {
    let first = null;
    fieldsOf(form).forEach((input) => {
      const bad = !isValid(input);
      setInvalid(input, bad);
      if (bad && !first) first = input;
    });
    if (first) first.focus();
    return !first;
  }
  // Valida ao sair do campo e limpa o erro enquanto digita
  document.addEventListener('focusout', (e) => {
    const input = e.target;
    if (!(input instanceof HTMLInputElement) || !(input.required || input.dataset.validate)) return;
    if (input.value) setInvalid(input, !isValid(input));
  });
  document.addEventListener('input', (e) => {
    const group = e.target.closest && e.target.closest('.f-group.is-invalid');
    if (group && isValid(e.target)) setInvalid(e.target, false);
  });
  document.addEventListener('change', (e) => {
    if (e.target.type === 'checkbox' && e.target.required) setInvalid(e.target, !e.target.checked);
  });

  /* ---------- Envio dos formulários ---------- */
  const showAlert = (form, msg, type = 'info') => {
    const box = $('.form-alert', form);
    if (!box) return;
    box.className = `form-alert form-alert--${type} is-visible`;
    box.textContent = msg;
  };
  const hideAlert = (form) => { const box = $('.form-alert', form); if (box) box.className = 'form-alert'; };
  const setLoading = (form, on) => {
    const btn = $('.btn--submit', form);
    btn.disabled = on;
    btn.classList.toggle('is-loading', on);
  };

  function handle(form, onSuccess) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAlert(form);
      if (!validate(form)) return;
      setLoading(form, true);
      try {
        const data = Object.fromEntries(new FormData(form));
        const result = await submitTo(form.dataset.endpoint, data);
        await onSuccess(result, data);
      } catch (err) {
        showAlert(form, err.message, 'error');
      } finally {
        setLoading(form, false);
      }
    });
  }

  /* ---------- Sessão de demonstração (só neste navegador) ---------- */
  const SESSION_KEY = 'seuqr.session';
  const readSession = () => {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)) || null; } catch { return null; }
  };
  const saveSession = (data) => {
    try { localStorage.setItem(SESSION_KEY, JSON.stringify({ ...readSession(), ...data, at: Date.now() })); } catch { /* navegador sem storage */ }
  };
  const nameFromEmail = (email) => {
    const base = (email || '').split('@')[0].replace(/[._-]+/g, ' ').trim();
    return base ? base.replace(/\b\w/g, (l) => l.toUpperCase()) : 'Você';
  };
  // Só aceita caminhos internos em ?next= (evita redirecionar para outro site)
  const nextPath = () => {
    const n = params.get('next');
    return n && n.startsWith('/') && !n.startsWith('//') ? n : '/dashboard/';
  };

  /* ---------- Login ---------- */
  const loginForm = $('#login-form');
  if (loginForm) {
    handle(loginForm, async (result, data) => {
      if (result.demo) {
        // Demonstração: qualquer e-mail e senha entram
        const prev = readSession();
        saveSession({
          email: data.email,
          name: prev && prev.email === data.email ? prev.name : nameFromEmail(data.email),
          plan: prev && prev.email === data.email ? prev.plan : 'starter',
        });
      }
      location.href = nextPath();
    });
  }

  /* ---------- Cadastro ---------- */
  const regForm = $('#register-form');
  if (regForm) {
    const label = $('[data-submit-label]', regForm);
    const radios = $$('input[name="plan"]', regForm);
    const syncLabel = () => {
      const plan = radios.find((r) => r.checked).value;
      label.textContent = plan === 'starter' ? 'Criar conta grátis' : `Continuar para pagamento · ${PLANS[plan].name}`;
    };
    const fromUrl = params.get('plan');
    const pre = radios.find((r) => r.value === fromUrl);
    if (pre) pre.checked = true;
    radios.forEach((r) => r.addEventListener('change', syncLabel));
    syncLabel();

    handle(regForm, async (result, data) => {
      // A conta começa no Starter; o plano pago só vale depois do pagamento
      if (result.demo) saveSession({ email: data.email, name: data.name.trim() || nameFromEmail(data.email), plan: 'starter' });
      if (data.plan !== 'starter') {
        location.href = `/checkout/?plan=${encodeURIComponent(data.plan)}`;
        return;
      }
      location.href = '/welcome/?plan=starter';
    });
  }

  /* ---------- Checkout (Stripe) ---------- */
  const coForm = $('#checkout-form');
  if (coForm) {
    let planKey = params.get('plan');
    if (planKey === 'starter') { location.replace('/register/?plan=starter'); return; }
    if (!PLANS[planKey]) planKey = 'pro';
    const plan = PLANS[planKey];
    const session = readSession();

    // Resumo
    $$('[data-plan-name], [data-plan-name-inline]').forEach((el) => { el.textContent = plan.name; });
    $('[data-plan-price]').innerHTML = `${brl(plan.price).replace(',00', '')}<small>/mês</small>`;
    $('[data-plan-desc]').textContent = plan.desc;
    $('[data-plan-features]').innerHTML = plan.features.map((f) => `<li>${f}</li>`).join('');
    $('[data-plan-subtotal]').textContent = brl(plan.price);
    $('[data-plan-total]').textContent = brl(plan.price);
    $$('[data-plan-link]').forEach((a) => { if (a.dataset.planLink === planKey) a.setAttribute('aria-current', 'true'); });
    $('[data-pay-label]').textContent = `Continuar para a Stripe · ${brl(plan.price).replace(',00', '')}/mês`;
    document.title = `Assinar ${plan.name} — SeuQR`;

    // Conta (sem sessão, primeiro cria a conta)
    if (!session) {
      $('[data-account-name]').textContent = 'Você ainda não entrou';
      $('[data-account-email]').textContent = 'Crie a conta ou entre para continuar';
      $('[data-account-initials]').textContent = '?';
      $('[data-account-change]').textContent = 'Entrar';
      $('[data-account-change]').href = `/login/?next=${encodeURIComponent(location.pathname + location.search)}`;
      $('[data-starter-link]').href = '/register/?plan=starter';
    } else {
      $('[data-account-name]').textContent = session.name || 'Você';
      $('[data-account-email]').textContent = session.email || '';
      $('[data-account-initials]').textContent = (session.name || 'Você').split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
      $('[data-account-change]').href = `/register/?plan=${planKey}`;
    }

    if (params.get('canceled')) showAlert(coForm, 'Pagamento cancelado na Stripe. Nada foi cobrado; você pode tentar de novo.', 'info');

    coForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAlert(coForm);
      if (!session) { location.href = `/register/?plan=${planKey}`; return; }
      setLoading(coForm, true);
      $('[data-pay-label]').textContent = 'Abrindo a Stripe…';
      try {
        // Opção B: Payment Link da Stripe (e-mail e conta já preenchidos)
        const link = STRIPE.paymentLinks[planKey];
        if (!DEMO && link) {
          const url = new URL(link);
          if (session.email) url.searchParams.set('prefilled_email', session.email);
          url.searchParams.set('client_reference_id', session.id || session.email || 'seuqr');
          location.href = url.toString();
          return;
        }
        // Opção A: Checkout Session criada pelo backend
        if (!DEMO) {
          const res = await submitTo(STRIPE.checkoutEndpoint, { plan: planKey });
          if (!res.url) throw new Error('Não foi possível abrir o pagamento agora. Tente de novo.');
          location.href = res.url;
          return;
        }
        // Demonstração: simula a ida e a volta da Stripe
        await sleep(1100);
        const prev = readSession();
        saveSession({
          plan: planKey,
          payments: [...((prev && prev.payments) || []), { date: Date.now(), plan: planKey, method: 'stripe', amount: plan.price }],
        });
        location.href = `/welcome/?plan=${planKey}&paid=1`;
      } catch (err) {
        showAlert(coForm, err.message, 'error');
        $('[data-pay-label]').textContent = `Continuar para a Stripe · ${brl(plan.price).replace(',00', '')}/mês`;
        setLoading(coForm, false);
      }
    });
  }

  /* ---------- Boas-vindas (depois do cadastro ou da Stripe) ---------- */
  if (document.body.classList.contains('welcome-page')) {
    const session = readSession() || {};
    const paid = params.get('paid') === '1';
    const key = PLANS[params.get('plan')] ? params.get('plan') : (session.plan || 'starter');
    const plan = PLANS[key];
    const first = (session.name || '').split(' ')[0];
    $('[data-welcome-plan]').textContent = `Plano ${plan.name}`;
    if (paid) {
      $('[data-welcome-title]').textContent = 'Assinatura ativada!';
      $('[data-welcome-text]').textContent = `${first ? `${first}, seu` : 'Seu'} plano ${plan.name} já está liberado: QR Codes ilimitados para as suas campanhas.`;
      $('[data-welcome-stripe]').hidden = false;
      document.title = 'Assinatura ativada — SeuQR';
    } else {
      $('[data-welcome-title]').textContent = first ? `Conta criada, ${first}!` : 'Conta criada!';
      $('[data-welcome-text]').textContent = 'Bem-vindo ao SeuQR. Seu plano Starter já está ativo, com até 3 QR Codes dinâmicos.';
      // Grátis não passa pelo pagamento
      $('[data-step-pay]').remove();
      $('[data-step-pay-line]').remove();
    }
  }
})();
