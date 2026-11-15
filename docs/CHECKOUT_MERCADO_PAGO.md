# Checkout do site: configuração do Mercado Pago

> Guia para ligar o pagamento do site. O checkout já está pronto e testado com um Mercado Pago simulado; falta usar as **credenciais de teste** (e, depois, as reais, quando o CNPJ sair).

## 1. Conta e credenciais de teste

1. Crie (ou use) a conta no Mercado Pago e entre em **Suas integrações** (painel do desenvolvedor).
2. Crie um **aplicativo** do tipo **Checkout Pro**.
3. Em **Credenciais de teste**, copie o **Access Token** de teste.
4. Em **Webhooks**, configure a **URL de notificação** (veja o item 3) com o evento **Pagamentos**, e copie a **chave secreta** (assinatura) que o painel mostra.

## 2. Variáveis no `frontend/.env`

Você mesmo coloca estas linhas no arquivo (o assistente não lê esse arquivo):

| Variável | O que é |
|---|---|
| `MERCADOPAGO_ACCESS_TOKEN` | O Access Token (de teste agora; o de produção depois) |
| `MERCADOPAGO_WEBHOOK_SECRET` | A chave secreta do webhook |
| `MERCADOPAGO_AMBIENTE` | `sandbox` (teste, padrão) ou `producao` |
| `SITE_URL_BASE` | O endereço público do site, com https (ex.: `https://beatus.exemplo.com`). Usado nos endereços de retorno e de aviso. |

(`MERCADOPAGO_BASE_URL` existe só para testes com um servidor de mentira; não use.)

Depois de mudar o `.env`, reinicie o servidor.

## 3. Endereço do webhook

```
<SITE_URL_BASE>/api/publico/mercadopago/webhook
```

O Mercado Pago precisa alcançar esse endereço pela internet. **No computador de casa (localhost) ele não alcança**; para testar o aviso automático use um túnel (Cloudflare Tunnel ou ngrok) e coloque o endereço do túnel em `SITE_URL_BASE` e no painel. Sem webhook o pagamento ainda é confirmado: a página que o cliente vê ao voltar para o site pergunta ao Mercado Pago e cria o pedido.

## 4. Testar

Use os **cartões e usuários de teste** da documentação do Mercado Pago (cada situação, aprovado ou recusado, tem um dado de teste). O roteiro está na parte 22 de `docs/ROTEIRO_DE_TESTES.md`.

## 5. Ir para produção (quando o CNPJ sair)

1. Conta do Mercado Pago com o CNPJ aprovado.
2. Trocar o Access Token e a chave do webhook pelos de **produção** e `MERCADOPAGO_AMBIENTE=producao`.
3. Resolver a **entrega real** (hoje simulada) e a **política de privacidade** (dados da empresa e revisão jurídica).
4. Hospedar em **https** (`SITE_URL_BASE`).
