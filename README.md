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
  checkout/           Pagamento cartão / Pix  (/checkout/?plan=pro)
  auth.css, auth.js   Estilos e lógica compartilhados das telas acima
  dashboard/          Área logada: QR Codes   (/dashboard)
  billing/            Área logada: plano e pagamentos (/billing)
  settings/           Área logada: perfil, senha, sair (/settings)
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
- Cada formulário tem o endpoint em `data-endpoint` (`/api/auth/login`, `/api/auth/register`, `/api/billing/subscribe`).
- Pagamento: os dados do cartão **não devem ir para a nossa API** — use a tokenização do gateway escolhido e envie só o token. O gateway ainda não foi definido.

### Modo demonstração

- O login aceita **qualquer e-mail e qualquer senha** e cria uma sessão só no navegador (`localStorage`, chave `seuqr.session`).
- A área logada (`/dashboard`, `/billing`, `/settings`) redireciona para o login sem sessão.
- QR Codes, plano e pagamentos de teste ficam salvos no navegador (`seuqr.qrs:<email>`). Em Configurações dá para sair ou apagar esses dados.
- Ao ligar no backend, troque as funções de leitura/gravação de `dashboard.js` por chamadas à API.

Links que ainda não têm página: `/recuperar-senha`, `/termos`, `/privacidade`.
