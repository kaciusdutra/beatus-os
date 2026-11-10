# Diagnóstico do código legado (Sprint S5)

> Diagnóstico de 12/11/2026, **somente leitura**: nada foi alterado, movido nem apagado. Cada item traz uma **decisão proposta** (manter, migrar ou remover), que só vale depois da aprovação do Kacius. Segue a regra 10 do `AGENTS.md`: inconsistências são diagnosticadas e apresentadas antes de qualquer correção.

## Decisões do Kacius (12/11/2026)

O Kacius respondeu **sim** às 5 decisões da seção 6: remover o código morto (grupos A a G), migrar as telas Pedidos e Clientes nas sprints indicadas, marcar o dashboard como demonstração (escolhida a opção de marcar, não de esconder), manter o `?sim=` só para desenvolvimento e escrever testes de pedido e de clientes antes de migrar. **Executado em 12/11/2026:** grupos A a G removidos (checkpoint `checkpoint-antes-limpeza-legado`) e aviso de demonstração no dashboard. Pendentes: o `?sim=` restrito (S3) e as migrações (S2, G03, G04).

## 1. Resumo

1. **O fluxo de pedidos está partido.** O PDV grava o pedido no PostgreSQL (`POST /api/pedidos`), mas a tela **Pedidos** só lê o `localStorage` do navegador, e não existe rota para listar pedidos. Resultado: pedido lançado no PDV não aparece na fila de Pedidos (a tela estava vazia no teste de hoje).
2. **Clientes tem duas bases.** O PDV busca e cadastra clientes pela API (banco), mas a tela **Clientes** lista o `localStorage`.
3. **O catálogo do PDV é fixo no código:** 8 produtos em `produtosMock.ts`, embora a tabela `Produto` exista no banco (sem rota nem tela).
4. **Há dados de demonstração soltos:** os números do dashboard são fixos (18 pedidos, 4 em produção, 14 entregues, R$ 1.864,50), os horários e o checklist da operação ficam só em memória (perdem-se ao recarregar) e o financeiro é só uma tela de acesso.
5. **Existe código morto:** um conjunto de serviços e repositórios em memória que **nenhum arquivo importa**, mais um repositório duplicado em Compras.
6. **Correção ao `ESTADO_ATUAL.md`:** ele dizia que estoque, financeiro, produção, receitas e ingredientes "ainda não têm tabela". O quadro real está na seção 4: já existem tabelas de produto, insumo e ficha técnica; o que não existe é estoque, financeiro, produção, horários e checklist da operação e login.
7. **Há quase nenhum teste fora de Compras, Fornecedores e Fichas técnicas.** Clientes, Pedidos, PDV, Dashboard e Operação não têm teste automático. Isso aumenta o risco de qualquer migração e pede cuidado.

## 2. Dados e telas que ainda não usam o banco (migrar)

| # | Item | Onde | Situação hoje | Gravidade | Decisão proposta |
|---|---|---|---|---|---|
| 1 | **Tela Pedidos** | `modules/pedidos/pages/PedidosPage.tsx` → `modules/pedidos/services/pedidoRepository.ts` | Lê e muda status no `localStorage` (chaves `beatus_os_pedidos` e `beatus_os_numero_pedido`). `/api/pedidos` só tem `POST`. | **Alta** | **Migrar** para o banco: criar a listagem (`GET`) e a mudança de status pela API. Junto da **S2** (pedido seguro), que já mexe nesse fluxo. |
| 2 | **Tela Clientes** | `modules/clientes/pages/ClientesPage.tsx` → `modules/clientes/services/clienteRepository.ts` | Lista o `localStorage` (chave `beatus_os_clientes`). A API `/api/clientes` só tem `GET` (busca) e `POST`. | **Média** | **Migrar** para `/api/clientes` (faltam listagem e edição na API). Junto da G03 (vendas e clientes). |
| 3 | **Catálogo do PDV** | `modules/pdv/data/produtosMock.ts` → `PdvPage.tsx` | 8 produtos fixos no código. Tabela `Produto` existe e não tem rota. | **Alta** (a S2 exige preço vindo do cadastro) | **Migrar:** rota `/api/produtos` e PDV lendo o banco. É pré-requisito da **S2**. Depois, remover o mock. |
| 4 | **Número do pedido no PDV** | `PdvPage.tsx` importa `gerarNumeroPedido` de `services/pedidoRepository.ts` | O PDV ainda usa o gerador local; a mensagem final mostra o número devolvido pelo servidor. | Média | **Verificar na S2** qual número vale e tirar o gerador local. |
| 5 | **Dashboard** | `modules/dashboard/services/dashboardService.ts` | Métricas fixas no código. | Média (engana quem olha) | **Migrar** para dados reais quando houver pedidos no banco (junto da migração 1). Até lá, **marcar como "demonstração"** na tela. Decisão do Kacius (seção 6). |
| 6 | **Horários da operação** | `core/operation/scheduleService.ts` (usado em `app/operacao/horarios`, `OperacaoPage` e `OperationOverviewCard`) | Configuração guardada numa variável em memória: edições se perdem ao recarregar. | Média | **Migrar** para o banco na **G04** (já no BACKLOG). |
| 7 | **Checklist da operação** | `modules/operacao/services/checklistService.ts` | Lista fixa no código. | Baixa | **Migrar** na **G04**. |
| 8 | **Estado simulado (`?sim=`)** | `core/system/systemSimulation.ts`, `SystemContext.tsx`, `Sidebar.tsx` | Parâmetro de URL que simula o estado da operação (fechada, operando etc.). | Baixa | **Manter** como ferramenta de teste, mas **restringir ao ambiente de desenvolvimento** antes de ir para produção (S3). |
| 9 | **Usuário e empresa fixos** | `core/permissions/currentUser.ts` (Kacius, ADMIN) e `core/context/empresaContext.ts` (`criarContextoDesenvolvimento`) | Não há login. | Alta para produção | **Migrar** na **S3** (login e perfis). |
| 10 | **Financeiro** | `app/financeiro/page.tsx` | Só a tela de acesso restrito. | Baixa | **Manter** como está até a **G09**. |
| 11 | **Pagamento na entrega** | `core/payment/paymentRules.ts` (`permitirPagamentoNaEntrega: true`) | Já está no BACKLOG (cliente novo não paga na entrega). | Média | **Alterar a regra** na **G03**, com a sua decisão. |

## 3. Código morto ou duplicado (candidatos a remover)

Prova usada: busca por quem importa cada arquivo em `app/`, `modules/`, `core/` e `shared/`. **Nenhuma remoção foi feita.** A remoção de cada grupo precisa da sua aprovação e de um commit próprio, com `npm run check` verde antes e depois.

| # | Arquivo | Prova | Decisão proposta |
|---|---|---|---|
| A | `modules/pedidos/services/lancarPedidoService.ts` | **Nenhum arquivo o importa.** O que a rota usa é `lancarPedidoServicePostgres.ts`. | **Remover** |
| B | `modules/pedidos/services/pedidoService.ts` | Só é importado por `lancarPedidoService.ts` (A). | **Remover** junto com A |
| C | `modules/pedidos/repositories/pedidoRepository.ts` (em memória) | Só é importado por A e B. | **Remover** junto com A e B |
| D | `getClienteService()` e o uso do repositório em memória em `modules/clientes/services/clienteService.ts`; `modules/clientes/repositories/clienteRepository.ts` (em memória) | Só A e B chamam `getClienteService`. A classe `ClienteService` continua em uso pela fábrica do Postgres e **deve ficar**. | **Remover** só o repositório em memória e a função `getClienteService`, depois de A, B e C |
| E | `getFornecedorService()` e `modules/fornecedores/repositories/fornecedorRepository.ts` (em memória) | Nenhum arquivo chama `getFornecedorService`. A classe `FornecedorService` é usada pela fábrica do Postgres e **deve ficar**. | **Remover** só a função e o repositório em memória |
| F | `modules/compras/repositories/entradaCompraRepository.ts` | Cópia antiga da interface (19 linhas); a interface em uso é `entradaCompraRepositoryPort.ts`. **Nenhum arquivo o importa.** | **Remover** |
| G | `core/persistence/InMemoryStore.ts`, `Repository.ts`, `Transaction.ts` | Existem para os repositórios em memória (C, D, E). | **Remover por último**, só depois de D e E (confirmar antes que nada mais os importa) |
| H | `modules/pedidos/services/pedidoRepository.ts` e `modules/clientes/services/clienteRepository.ts` (`localStorage`) | **Em uso hoje** pelas telas Pedidos e Clientes e pelo PDV (itens 1, 2 e 4 da seção 2). | **Manter por enquanto.** Remover só depois que essas telas migrarem. |
| I | `modules/pdv/data/produtosMock.ts` | Em uso pelo PDV (item 3). | **Manter por enquanto.** Remover depois da migração. |
| J | Pastas locais vazias: `modules/estoque`, `financeiro`, `ingredientes`, `inteligencia`, `producao`, `produtos`, `receitas`, `configuracoes` e `core/teste` | Não têm arquivo nenhum e **não estão no Git** (o Git não guarda pasta vazia). | **Manter** (servem de lembrete dos módulos futuros) ou apagar localmente, sem efeito no repositório. |

## 4. O que já está no banco (para referência)

| Área | Tabela(s) | Rota(s) | Tela | Situação |
|---|---|---|---|---|
| Compras | `EntradaCompra`, `EntradaCompraItem`, `EntradaCompraDocumento`, `ClassificacaoItemCompra` | `/api/compras/*` | Sim | **Completa** (G07) |
| Fornecedores | `Fornecedor` | `/api/fornecedores/*`, `/api/cep` | Sim | **Completa** |
| Insumos | `Insumo` (com `precoCompra` e `custoUnitario`), `CategoriaInsumo`, `UnidadeMedida` | `/api/insumos/*` | Sim | **Completa** (base da G08) |
| Fichas técnicas | `FichaTecnica`, `FichaTecnicaItem` | **Nenhuma** | **Nenhuma** | Tem serviço, repositório Postgres e cálculo de custo testado; falta rota e tela (**G08**) |
| Produtos | `Produto` | **Nenhuma** | **Nenhuma** | Tabela pronta; falta rota e uso no PDV (item 3) |
| Clientes e endereços | `Cliente`, `Endereco` | `/api/clientes` (`GET` por busca e `POST`) | Tela usa `localStorage` | **Parcial** (item 2) |
| Pedidos e pagamento | `Pedido`, `PedidoItem`, `Pagamento` | `/api/pedidos` (só `POST`) | Tela usa `localStorage` | **Parcial** (itens 1 e 4) |
| Estoque (saldo e movimentação) | **Não existe** | — | — | **G05/G06** |
| Financeiro | **Não existe** | — | Só tela de acesso | **G09** |
| Produção (fila) | **Não existe** | — | — | **G05** |
| Horários e checklist da operação | **Não existe** | — | Em memória | **G04** |
| Usuários e sessão (login) | **Não existe** | — | — | **S3** |

## 5. Ordem sugerida de tratamento

| Quando | O quê |
|---|---|
| Agora, depois da sua aprovação | Remover o código morto **A a F** em commits pequenos (cada um com `npm run check` verde), e o **G** por último. Baixo risco: nada disso é usado. |
| **G08** | Fichas técnicas ligadas ao custo real (rotas e telas). Não depende dos itens 1 a 3. |
| **S2** (pedido seguro) | Migrar **catálogo do PDV (3)**, **número do pedido (4)** e **tela Pedidos (1)**; depois remover **H** (pedidos) e **I**. Antes disso, escrever **testes** para o fluxo de pedido, porque hoje não há nenhum. |
| **G03** | Migrar a **tela Clientes (2)** e remover o **H** de clientes; regra de pagamento (11). |
| **G04** | Horários e checklist da operação no banco (6 e 7). |
| **S3** | Login, usuário e empresa da sessão (9); restringir `?sim=` (8). |
| **G09** | Financeiro (10). |

## 6. Decisões que preciso do Kacius

1. **Remover o código morto A a G** nos commits pequenos descritos acima? (Sem mudança de comportamento: nenhum deles é usado.)
2. **Tela Pedidos e tela Clientes:** migrar para o banco nas sprints indicadas (S2 e G03)? Enquanto isso, o PDV continua lançando pedidos no banco, que **não aparecem na fila de Pedidos**. Se quiser, essa migração da tela Pedidos pode vir **antes** da S2.
3. **Dashboard com números fixos:** marcar como "demonstração" na tela já, ou esconder até haver dados reais?
4. **Estado simulado (`?sim=`):** manter como ferramenta de teste, restrita ao desenvolvimento?
5. **Testes:** concordo em escrever testes do fluxo de pedido (e de clientes) **antes** de migrar essas telas?

## 7. Como o diagnóstico foi feito

- Busca por `localStorage`, `sessionStorage`, `InMemoryStore` e `mock` em `app/`, `modules/`, `core/`, `shared/` e `lib/`.
- Para cada candidato, busca de quem o importa.
- Leitura do `schema.prisma` (17 modelos) e da lista de rotas de API (17) e de páginas (12).
- Conferência na tela: a página Pedidos aparece vazia e o `localStorage` não tem nenhum pedido.
- O que **não** foi verificado: o conteúdo atual das tabelas `Pedido` e `Cliente` no banco (não há rota de leitura e o `AGENTS.md` pede para usar as rotas). A conclusão sobre pedidos vem do código e do teste de tela, não de contagem de linhas.
