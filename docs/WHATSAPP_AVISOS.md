# Avisos do pedido pelo WhatsApp (fase 3a)

O Beatus avisa o cliente do WhatsApp quando o pedido entra em preparo, sai para a entrega e é entregue. O envio usa a **API oficial da Meta (WhatsApp Business Cloud API)**. Sem a configuração abaixo, **nada é enviado** e os avisos do WhatsApp continuam "aguardando envio" (nada quebra).

Quem envia: o **agendador do servidor** entrega a fila de avisos a cada 15 segundos, **sem precisar de nenhuma tela aberta** (ele sobe junto com o sistema; para desligá-lo, `BEATUS_AGENDADOR=desligado` no `.env`). A tela **Cozinha**, enquanto aberta, também chama o envio: é inofensivo, porque cada aviso é reservado antes de sair e ninguém recebe duas vezes.

## O que você precisa providenciar (lado da Meta)

1. **Conta WhatsApp Business** com o número dedicado conectado à API (a coexistência permite usar o app e a API no mesmo número) e a **empresa verificada** na Meta.
2. Um **token de acesso permanente** (de um usuário do sistema do Gerenciador de Negócios, com a permissão `whatsapp_business_messaging`). O token temporário de teste vence em 24 horas.
3. O **ID do número de telefone** (Phone Number ID), que aparece no painel da Meta.
4. **Três mensagens-modelo aprovadas** (categoria **Utilidade**, idioma **Português (Brasil)**). A Meta só deixa avisar o cliente fora da janela de 24 horas da conversa com mensagem-modelo. Cada uma tem **uma variável**, o número do pedido:

| Nome sugerido | Texto (corpo) |
|---|---|
| `beatus_pedido_em_preparo` | Pagamento confirmado! Seu pedido nº {{1}} já está em preparo. |
| `beatus_pedido_a_caminho` | Seu pedido nº {{1}} saiu para a entrega e está a caminho. |
| `beatus_pedido_entregue` | Seu pedido nº {{1}} foi entregue. Bom apetite! Deu tudo certo? Se quiser, conta pra gente como foi. |

Se algum modelo não existir, o evento correspondente sai como **texto livre**, que a Meta só entrega dentro da janela de 24 horas (por exemplo, quando o cliente acabou de conversar com a Beatriz).

## O que vai no `frontend/.env` (nunca vai para o Git)

| Variável | Para quê |
|---|---|
| `WHATSAPP_ACCESS_TOKEN` | O token permanente |
| `WHATSAPP_PHONE_NUMBER_ID` | O ID do número de telefone |
| `WHATSAPP_MODELO_EM_PREPARO` | Nome do modelo aprovado (opcional) |
| `WHATSAPP_MODELO_A_CAMINHO` | Nome do modelo aprovado (opcional) |
| `WHATSAPP_MODELO_ENTREGUE` | Nome do modelo aprovado (opcional) |
| `WHATSAPP_IDIOMA` | Idioma dos modelos (padrão `pt_BR`) |
| `WHATSAPP_API_VERSION` | Versão da API do Graph (padrão `v23.0`; a Meta aposenta versões antigas) |

(`WHATSAPP_BASE_URL` existe só para testes com um servidor de mentira; não use.)

Depois de salvar o `.env`, reinicie o sistema.

## O que acontece com cada aviso

- **Do WhatsApp:** enviado ao telefone do cadastro do cliente (DDD + número; o DDI 55 é acrescentado). Dá certo: **ENVIADO**. Falha passageira (rede, limite de envios, servidor da Meta fora do ar): tenta de novo, até 3 vezes. Falha definitiva (telefone sem WhatsApp, modelo não aprovado, token vencido, telefone inválido): **FALHOU**, com o motivo, que aparece no detalhe do pedido em Pedidos.
- **Do site:** não sai de lugar nenhum, a página do pedido já mostra a etapa: fica **DISPENSADO**.
- **Pedido cancelado** antes do aviso, ou aviso com **mais de 6 horas**: **DISPENSADO**.
- Duas telas da Cozinha abertas ao mesmo tempo não mandam o mesmo aviso duas vezes.

## Como testar

1. Configure o `.env` e reinicie.
2. Faça um pedido de teste pelo link da Beatriz (origem WhatsApp) com o **seu próprio WhatsApp** (use um número que esteja na lista de teste da Meta enquanto a conta não for de produção).
3. Na Cozinha, toque em **Iniciar preparo**: em até 15 segundos o aviso chega ao seu WhatsApp e, em Pedidos, o aviso aparece como "enviado".
