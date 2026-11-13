# Plano de Sprints: Endurecimento do Beatus OS

> Rascunho de 05/10/2026. As sprints abaixo **não substituem** o roteiro G01 a G12: elas entram por cima dele, como um caminho crítico para a abertura. Itens **(a confirmar)** dependem de decisão do Kacius ou de checagem no código atual.

> **Situação em 04/11/2026:** a S1 está concluída (commit 4b73ba7). O desenvolvimento passou a ser feito só com o Claude, então a divisão em duas frentes descrita abaixo não vale mais: a G07 e as sprints S2 a S6 seguem com o Claude, uma de cada vez. O andamento fica em `docs/ESTADO_ATUAL.md` e as pendências em `docs/BACKLOG.md`.

## Princípios

- Nenhuma sprint abre com build quebrado nem fecha sem `npm run check` verde (a S1 cria esse comando).
- Um dono por arquivo crítico: `prisma/schema.prisma`, `core/modules/moduleRegistry.ts`, `core/permissions/*`, menu e `package.json`. Quem precisar mexer avisa antes; migrações do banco entram uma de cada vez, revisadas pelo Kacius.
- Cada IA trabalha na sua branch do Git. O Kacius integra na `main` uma de cada vez, depois de compilar e testar.
- Entrega em arquivos completos, um passo por vez, com critério de aceite escrito em linguagem de negócio.

## Duas frentes

| Frente | Responsável | Área de código |
|---|---|---|
| A | Outra IA | Fecha a G07: `modules/compras` (parser do QR da NFC-e e telas de entrada) |
| B | Claude | Sprints S1 a S6 abaixo, em Pedidos/PDV, núcleo e operações |

A frente B só toca em `modules/compras` depois que a G07 fechar (S6).

## Ordem e dependências

```
S1 verificação ──► S2 pedido seguro ──► S3 login/perfis
                                    └─► S4 canais/idempotência
S5 diagnóstico do legado (pode rodar a qualquer momento, só diagnóstico)
S6 upload + backup (depois que a G07 fechar)
```

---

## S1: Verificação automática (`npm run check`)

**Objetivo:** ter um único comando que diga, sem ambiguidade, se o projeto está saudável.

**Escopo:** `package.json` (dono único: Claude nesta sprint), scripts de teste, migração dos testes existentes (compras, ficha técnica, custo) para asserções reais. Preferência: usar o que já está instalado (`tsx` com o executor nativo do Node) para não adicionar dependências **(a confirmar)**.

**Critérios de aceite**
- `npm run check` roda tipagem, lint e todos os testes.
- Mostra quantos testes passaram e quantos falharam. Saída vazia nunca conta como sucesso.
- Se um teste for quebrado de propósito, o comando falha com código de saída diferente de zero.
- Os testes que já existiam continuam passando.

**Tamanho:** pequeno.

---

## S2: Pedido seguro no servidor

**Objetivo:** o servidor passa a ser a autoridade sobre valores; a tela só informa o que o cliente escolheu.

**Escopo:** `modules/pedidos/services/server/lancarPedidoServicePostgres.ts`, `app/api/pedidos/route.ts`, envio do PDV. Verificar se o item do pedido já guarda o preço da hora da venda; se não guardar, a migração entra sob a regra de dono único do schema **(a confirmar)**.

**Critérios de aceite**
- A tela envia só produto, quantidade, adicionais e endereço. O servidor busca o preço no cadastro de produtos e calcula subtotal, taxa de entrega e total.
- Exemplo: dois itens de R$ 50,00 mais taxa de R$ 10,00 fecham em R$ 110,00, mesmo que a tela mande outro valor.
- Um total adulterado enviado pelo navegador é ignorado ou rejeitado, e o teste automático prova isso.
- O preço de cada item fica gravado no pedido; mudar o preço do produto depois não altera pedidos antigos.
- Duas criações de pedido ao mesmo tempo nunca geram o mesmo número.
- A regra de pagamento (entra na cozinha só se aprovado ou se for na entrega) e a taxa por distância valem no servidor.

**Dependência:** S1. **Tamanho:** médio.

---

## S3: Login e perfis de acesso

> **Adiada para o final (12/11/2026):** o Kacius quer fechar primeiro todas as telas e funcionalidades; depois se setorizam os acessos. No início só ele e o irmão usam o sistema.

**Objetivo:** só quem entrou vê o sistema, e cada pessoa vê o que seu perfil permite.

**Escopo:** autenticação com biblioteca consolidada (a escolher na sprint), usuário e sessão no banco, `core/permissions/*` aplicado nas rotas de API, contexto de empresa vindo da sessão. Esta sprint altera o schema (dono único).

**Critérios de aceite**
- Sem login, nenhuma tela nem rota de API responde com dados.
- Perfis: administrador, gestor, operador, produção e financeiro seguem a matriz atual; os acessos exatos ficam documentados em `REGRAS_DE_NEGOCIO.md` **(a confirmar com o Kacius)**.
- Operador de caixa não acessa financeiro, e a tentativa direta pela API é bloqueada.
- A empresa nunca é lida do corpo da requisição.
- Cancelar pedido e alterar preço gravam quem fez e quando.
- Senhas guardadas com hash; limite de tentativas de login.

**Dependência:** S2. **Tamanho:** grande.

---

## S4: Adaptador de canal e idempotência

**Objetivo:** preparar a entrada de pedidos do iFood, WhatsApp e site num formato único, sem duplicidade e já com a comissão do canal.

**Escopo:** pedido padrão de entrada, campos de identificador externo e comissão (schema, dono único), regra de unicidade por empresa, canal e identificador.

**Critérios de aceite**
- Um pedido de qualquer canal entra no PDV no mesmo formato.
- O mesmo pedido externo enviado duas vezes cria um só pedido.
- Cada pedido guarda o percentual e o valor de comissão do canal, para a margem real por canal.
- A integração oficial com o iFood **não** entra nesta sprint e depende de aprovação e regras da plataforma **(a confirmar na documentação deles)**.

**Dependência:** S2. **Tamanho:** médio.

---

## S5: Diagnóstico do código legado (somente leitura)

**Objetivo:** saber o que ainda usa localStorage ou memória e decidir o destino de cada item, sem apagar nada.

**Critérios de aceite**
- Lista dos arquivos envolvidos, com decisão proposta para cada um: manter, migrar ou remover.
- O Kacius aprova a lista antes de qualquer alteração.
- Nenhuma remoção acontece nesta sprint.

**Tamanho:** pequeno.

---

## S6: Upload reforçado e backup testado

**Objetivo:** proteger os arquivos enviados e garantir que dá para recuperar tudo.

**Escopo:** `modules/compras` (somente depois que a G07 fechar) e script de backup do banco e da pasta `storage`.

**Critérios de aceite**
- Um arquivo com extensão trocada (executável renomeado para `.pdf`) é rejeitado pela checagem do conteúdo real.
- Há tamanho máximo, nome aleatório e acesso somente por usuário logado.
- Backup diário automático do PostgreSQL e da pasta de documentos para HD externo e nuvem.
- **Teste de restauração:** apagar um banco de teste e restaurar a partir do backup do dia, com pedidos e documentos intactos.

**Dependência:** G07 fechada e S3. **Tamanho:** médio.

---

## Definição de pronto (vale para todas)

1. `npm run check` verde (a partir da S1).
2. Teste visual feito pelo Kacius quando houver tela.
3. Commit, push e `main` igual a `origin/main`.
4. `docs/ESTADO_ATUAL.md` atualizado com o que mudou e o próximo passo.

## Fora do escopo deste plano

Beatriz (G11), integração oficial com o iFood, entrega própria, multiempresa e o projeto Va Bene.

## Texto para colar na outra IA

> Estamos trabalhando em duas frentes. Você fecha a G07 em `modules/compras` (parser do QR da NFC-e e telas de entrada) na branch `feat/compras-qr`. Outra IA trabalha nas sprints S1 a S6 de `PLANO_DE_SPRINTS.md`, na branch `feat/endurecimento`. Não altere `prisma/schema.prisma`, `core/modules/moduleRegistry.ts`, `core/permissions/*`, o menu nem `package.json` sem avisar o Kacius antes. Respeite o `AGENTS.md` e o `REGRAS_DE_NEGOCIO.md`. Ao concluir cada etapa, rode a verificação e informe o resultado.
