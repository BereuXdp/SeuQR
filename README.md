# SeuQR

Site do **SeuQR** — QR Codes dinâmicos: troque o destino sem reimprimir o QR e acompanhe cada scan.

## Estrutura

```
site/                 Site estático (HTML, CSS e JS puro, sem build)
  index.html          Landing page
  styles.css          Estilos da landing (tokens de cor, navbar, seções)
  script.js           Interações: navbar, hero interativo, animações de scroll
  login/              Tela de login           (/login)
  register/           Tela de cadastro        (/register?plan=pro)
  checkout/           Revisão do pedido e ida para a Stripe (/checkout/?plan=pro)
  welcome/            Tela de sucesso após cadastro ou pagamento (/welcome/?plan=…)
  auth.css, auth.js   Estilos e lógica compartilhados das telas acima
  pricing/            Página pública de planos (/pricing)
  dashboard/          Área logada: visão geral (/dashboard)
  qrcodes/            Área logada: lista de QR Codes (/qrcodes)
  qrcodes/new/        Área logada: criar QR (/qrcodes/new) e editar (/qrcodes/new/?id=…)
  billing/            Área logada: plano e pagamentos (/billing)
  settings/           Área logada: perfil e sessão (/settings)
  dashboard.css/.js   Estilos e lógica da área logada
  assets/             Logo, favicon e ícones usados pelo site
logo/                 Identidade visual
  svg/, png/          Logo, símbolo, app icon e favicons
  marca.html          Página com todas as versões da logo
```

## Rodando localmente

Não precisa instalar nada além do Node.js:

```bash
npx http-server@14.1.1 site -p 5500 -c-1
```

Depois abra http://localhost:5500.

## Integração com o backend (pendente)

Login, cadastro e checkout **ainda não enviam dados**: o envio é simulado.

- Em `site/auth.js`, troque `DEMO = true` para `false` e ajuste `submitTo()`.
- Cada formulário tem o endpoint em `data-endpoint` (`/api/auth/login`, `/api/auth/register`).

### Pagamento (Stripe Checkout)

O pagamento acontece na página da Stripe; o SeuQR não recebe dados de cartão. Em `site/auth.js`, configure `STRIPE`:

- **Opção A (recomendada):** `checkoutEndpoint` — o backend cria a Checkout Session e responde `{ url }`.
  - `success_url`: `https://seuqr.com/welcome/?plan={plano}&paid=1&session_id={CHECKOUT_SESSION_ID}`
  - `cancel_url`: `https://seuqr.com/checkout/?plan={plano}&canceled=1`
  - Ative o plano pelo webhook `checkout.session.completed`, não pela volta do navegador.
- **Opção B (sem servidor):** `paymentLinks` — cole os Payment Links criados no painel da Stripe. O e-mail vai preenchido.

Fluxo: cadastro grátis → `/welcome`; cadastro pago → `/checkout` → Stripe → `/welcome?paid=1`.

### Modo demonstração

- O login aceita **qualquer e-mail e qualquer senha** e cria uma sessão só no navegador (`localStorage`, chave `seuqr.session`).
- A área logada (`/dashboard`, `/qrcodes`, `/billing`, `/settings`) segue a estrutura do painel atual do seuqr.com e redireciona para o login sem sessão.
- QR Codes, plano e pagamentos de teste ficam salvos no navegador (`seuqr.qrs:<email>`). Em Configurações dá para sair ou apagar esses dados.
- Ao ligar no backend, troque as funções de leitura/gravação de `dashboard.js` por chamadas à API.

Links que ainda não têm página: `/recuperar-senha`, `/termos`, `/privacidade`.
