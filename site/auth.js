/* =========================================================
   SeuQR — Login, cadastro e checkout
   ========================================================= */
(() => {
  /* ---------------------------------------------------------
     INTEGRAÇÃO COM O BACKEND
     Enquanto DEMO = true, nada é enviado: o envio é simulado.
     Para ligar na API, troque DEMO para false e ajuste submitTo()
     (cada <form> tem o endpoint em data-endpoint).
     Pagamento: os dados do cartão NUNCA devem ir direto para a
     nossa API — use o SDK/tokenização do gateway escolhido
     (Mercado Pago, Stripe, Asaas…) e envie só o token.
     --------------------------------------------------------- */
  const DEMO = true;

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
  const digits = (v) => v.replace(/\D/g, '');
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
  const luhn = (num) => {
    let sum = 0;
    let dbl = false;
    for (let i = num.length - 1; i >= 0; i--) {
      let d = +num[i];
      if (dbl) { d *= 2; if (d > 9) d -= 9; }
      sum += d;
      dbl = !dbl;
    }
    return sum % 10 === 0;
  };
  const validCPF = (cpf) => {
    if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
    const calc = (len) => {
      let sum = 0;
      for (let i = 0; i < len; i++) sum += +cpf[i] * (len + 1 - i);
      const r = (sum * 10) % 11;
      return r === 10 ? 0 : r;
    };
    return calc(9) === +cpf[9] && calc(10) === +cpf[10];
  };
  const validCNPJ = (cnpj) => {
    if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;
    const calc = (len) => {
      const w = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
      const sum = w.reduce((acc, wi, i) => acc + wi * +cnpj[i], 0);
      const r = sum % 11;
      return r < 2 ? 0 : 11 - r;
    };
    return calc(12) === +cnpj[12] && calc(13) === +cnpj[13];
  };

  function isValid(input) {
    const v = input.value.trim();
    const rule = input.dataset.validate;
    if (input.type === 'checkbox') return !input.required || input.checked;
    if (input.type === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
    if (rule === 'card') { const d = digits(v); return d.length >= 13 && d.length <= 19 && luhn(d); }
    if (rule === 'exp') {
      const m = v.match(/^(\d{2})\/(\d{2})$/);
      if (!m) return false;
      const month = +m[1];
      const year = 2000 + +m[2];
      if (month < 1 || month > 12) return false;
      const now = new Date();
      return year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1);
    }
    if (rule === 'cvc') return /^\d{3,4}$/.test(v);
    if (rule === 'doc') { const d = digits(v); return validCPF(d) || validCNPJ(d); }
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

  /* ---------- Máscaras ---------- */
  const masks = {
    card: (v) => {
      const d = digits(v).slice(0, 19);
      if (/^3[47]/.test(d)) return d.replace(/^(\d{0,4})(\d{0,6})(\d{0,5}).*/, (_, a, b, c) => [a, b, c].filter(Boolean).join(' '));
      return d.replace(/(\d{4})(?=\d)/g, '$1 ');
    },
    exp: (v) => {
      const d = digits(v).slice(0, 4);
      return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
    },
    cvc: (v) => digits(v).slice(0, 4),
    doc: (v) => {
      const d = digits(v).slice(0, 14);
      if (d.length <= 11) {
        return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
      }
      return d.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
    },
  };
  $$('[data-validate]').forEach((input) => {
    const mask = masks[input.dataset.validate];
    if (mask) input.addEventListener('input', () => { input.value = mask(input.value); });
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
      location.href = '/dashboard/';
    });
  }

  /* ---------- Checkout ---------- */
  const coForm = $('#checkout-form');
  if (coForm) {
    let planKey = params.get('plan');
    if (planKey === 'starter') { location.replace('/register/?plan=starter'); return; }
    if (!PLANS[planKey] || planKey === 'starter') planKey = 'pro';
    const plan = PLANS[planKey];

    // Resumo
    $$('[data-plan-name], [data-plan-name-inline]').forEach((el) => { el.textContent = plan.name; });
    $('[data-plan-price]').innerHTML = `${brl(plan.price).replace(',00', '')}<small>/mês</small>`;
    $('[data-plan-desc]').textContent = plan.desc;
    $('[data-plan-features]').innerHTML = plan.features.map((f) => `<li>${f}</li>`).join('');
    $('[data-plan-subtotal]').textContent = brl(plan.price);
    $('[data-plan-total]').textContent = brl(plan.price);
    $$('[data-plan-link]').forEach((a) => {
      if (a.dataset.planLink === planKey) a.setAttribute('aria-current', 'true');
    });
    $('[data-success-text]').textContent = `Seu plano ${plan.name} já está liberado. Bora criar o próximo QR?`;
    document.title = `Assinar ${plan.name} — SeuQR`;

    // Abas de pagamento
    const tabs = $$('[role="tab"]', coForm);
    const payLabel = $('[data-pay-label]');
    let method = 'card';
    let pixGenerated = false;
    const syncPayLabel = () => {
      if (method === 'card') payLabel.textContent = `Assinar ${plan.name} · ${brl(plan.price).replace(',00', '')}/mês`;
      else payLabel.textContent = pixGenerated ? 'Já paguei' : 'Gerar código Pix';
    };
    const selectTab = (tab) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        $(`#${t.getAttribute('aria-controls')}`).hidden = !on;
      });
      method = tab.dataset.method;
      hideAlert(coForm);
      syncPayLabel();
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => selectTab(t));
      t.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
        next.focus();
        selectTab(next);
      });
    });
    syncPayLabel();

    // Prévia do cartão
    const brandOf = (d) => {
      if (/^4/.test(d)) return 'Visa';
      if (/^(5[1-5]|2[2-7])/.test(d)) return 'Mastercard';
      if (/^3[47]/.test(d)) return 'Amex';
      if (/^(4011|4312|4389|4514|4576|5041|5066|5067|509|6277|6362|6363|650|6516|6550)/.test(d)) return 'Elo';
      if (/^(606282|3841)/.test(d)) return 'Hipercard';
      return 'Cartão';
    };
    const num = $('#cc-number');
    num.addEventListener('input', () => {
      const d = digits(num.value);
      $('[data-card-brand]').textContent = brandOf(d);
      const shown = (d + '•'.repeat(Math.max(16 - d.length, 0))).replace(/(.{4})(?=.)/g, '$1 ');
      $('[data-card-number]').textContent = shown;
    });
    $('#cc-name').addEventListener('input', (e) => { $('[data-card-name]').textContent = e.target.value || 'Seu nome'; });
    $('#cc-exp').addEventListener('input', (e) => { $('[data-card-exp]').textContent = e.target.value || 'MM/AA'; });

    // Envio
    const finish = () => {
      $('#checkout-flow').hidden = true;
      $('#checkout-success').hidden = false;
      // Demonstração: libera o plano pago na sessão do navegador
      if (DEMO) {
        const prev = readSession();
        const payment = { date: Date.now(), plan: planKey, method, amount: plan.price };
        saveSession({
          plan: planKey,
          payments: [...((prev && prev.payments) || []), payment],
          ...(prev ? {} : { email: 'voce@empresa.com', name: 'Você' }),
        });
      }
      // Pedido fechado: não oferece mais troca de plano no resumo
      $('.plan-switch').hidden = true;
      $('.summary__note').hidden = true;
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    };
    coForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAlert(coForm);
      if (!validate(coForm)) return;
      setLoading(coForm, true);
      try {
        if (method === 'pix' && !pixGenerated) {
          // Em produção: o backend cria a cobrança Pix no gateway e devolve o "copia e cola"
          await sleep(700);
          const code = `00020126-DEMO-SEUQR-${planKey.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
          $('#pix-code').value = code;
          renderQR($('#pix-qr'), code);
          $('#pix-box').hidden = false;
          pixGenerated = true;
          syncPayLabel();
          return;
        }
        const data = Object.fromEntries(new FormData(coForm));
        // Nunca enviar número/CVV do cartão para a nossa API: usar o token do gateway
        const payload = { plan: planKey, method, doc: digits(method === 'card' ? data.doc : data['doc-pix']) };
        const result = await submitTo(coForm.dataset.endpoint, payload);
        if (result.ok) finish();
      } catch (err) {
        showAlert(coForm, err.message, 'error');
      } finally {
        setLoading(coForm, false);
      }
    });

    $('#pix-copy').addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      try {
        await navigator.clipboard.writeText($('#pix-code').value);
        btn.textContent = 'Copiado!';
      } catch {
        $('#pix-code').select();
        btn.textContent = 'Selecionado';
      }
      setTimeout(() => { btn.textContent = 'Copiar'; }, 1800);
    });
  }
})();
