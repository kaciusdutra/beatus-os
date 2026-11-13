# Módulo Fichas Técnicas, Custo e Precificação

> Documentação do módulo ao fim da sprint global G08 (Fichas, preparações e precificação). Última atualização: 12/11/2026.
> As regras de negócio completas estão em `docs/REGRAS_DE_NEGOCIO.md`, seção 7 (aqui há só o resumo e a referência). O estado do projeto e o histórico dos commits estão em `docs/ESTADO_ATUAL.md`.

## 1. O que o módulo faz

O módulo liga **o que entra** (compras) a **quanto cobrar** (preço de venda). Ele resolve cinco problemas:

1. **Custo do insumo sempre atual:** ao confirmar uma entrada de compra, o custo do insumo passa a ser o preço da última compra, por unidade de medida (quilo, litro, unidade), com o frete rateado e o desconto do item.
2. **Fichas técnicas digitadas por você:** preparações (blend, molhos, maioneses) e produtos (burgers, combos), com **ficha dentro de ficha**, perdas, embalagem e custo calculado na hora.
3. **Ficha de produção para o funcionário:** modo de preparo, montagem, escala ("quanto vou fazer") e impressão, **sem custos**.
4. **Custos fixos do mês** e o custo fixo por pedido.
5. **Precificação:** preço por margem (20, 25, 30 e 35%), CMV, markup e margem líquida por produto e canal, com simulador de promoção, análise de combo e aviso de impacto de custo.

**O que o módulo ainda não faz** (ver seção 9): ligar os preços da precificação ao PDV, salvar promoções, medir a taxa de combo e dar baixa de estoque pelas fichas.

## 2. Como usar

### 2.1 Insumos (`/insumos`)

- Cadastro com categoria, unidade de compra, quantidade e preço de compra, fornecedor, observação e situação (ativo ou inativo: o insumo não é apagado).
- **Equivalência de unidade:** quando a unidade de compra não é a de uso (exemplo: 1 pacote = 6 un; 1 frasco = 300 pump), informe "1 unidade de compra = N unidades de uso".
- **Perda de limpeza (%):** casca, osso, aparas. Vale em qualquer ficha.
- **Histórico de preços:** em Editar insumo, a lista das compras que formaram o custo.
- Botões: **Fichas técnicas** e **Itens de compras**.

### 2.2 Itens de compras (`/insumos/vinculos`)

- Liga cada item que o fornecedor vende ao insumo certo, **uma única vez**; as próximas compras do mesmo item já vêm ligadas.
- **Recalcular custos das compras:** aplica ao custo dos insumos as entradas já confirmadas, da mais antiga para a mais nova, sem refazer o que já tem histórico.

### 2.3 Entrada de compra (módulo Compras)

- Cada item com destino Insumo ou Embalagem aceita a **quantidade real** com unidade (exemplo: 3 mantas = 6,8 kg) e a opção **Lembrar como fixo** (exemplo: 1 cx = 12 un). Só com a entrada em rascunho.
- **Impostos e outras despesas da nota** (ICMS-ST, IPI, seguro, outras despesas): ficam à parte, só para consulta, fora do custo.
- Ao confirmar, o custo dos insumos ligados é atualizado; se um item não converte para a unidade do insumo, a entrada confirma e aparece um aviso.

### 2.4 Fichas técnicas (`/fichas`)

- Duas abas: **Preparações** e **Produtos**. Cada linha mostra o custo (e o custo da porção, nas preparações).
- **Editor** (`/fichas/nova`, `/fichas/[id]`): itens de insumo ou de outra ficha, com quantidade, unidade e perda de cocção; bloco próprio de **Embalagem do produto**; custo ao vivo; botões subir, descer e remover; modo de preparo (preparações), montagem (produtos), observações, validade, tempo e porção padrão.
- **Combo:** é um produto cuja ficha usa outros produtos. Itens com o **mesmo nome em "Opção de escolha"** são opções do cliente: o custo usa a mais cara.
- A ficha **não é apagada**, só inativada.

### 2.5 Ficha de produção (`/fichas/[id]/producao`)

- Para o funcionário: ingredientes com as quantidades já multiplicadas pela escala, embalagem, passos numerados, observações. **Sem custos, preços ou margem.**
- Link "Ver como fazer" nas preparações usadas; botão **Imprimir**.

### 2.6 Financeiro → Custos fixos (`/financeiro/custos-fixos`)

- Cada custo com nome, valor por mês, "vale a partir de" e "vale até" (opcional); só se inativa, não se apaga.
- No topo: total dos custos fixos do mês, **pedidos esperados por mês** (sua estimativa) e **custo fixo por pedido**.

### 2.7 Financeiro → Precificação (`/financeiro/precificacao`)

- **Parâmetros e canais:** imposto, taxa de pagamento, embalagem do pedido, produtos por pedido, margens para comparar, margem mínima, CMV-alvo; e, por canal (WhatsApp, site, iFood, 99Food, Keeta), comissão, taxa por mês e pedidos por mês.
- **Tabela:** uma linha por produto com ficha ativa, no canal escolhido: custo da ficha, custo total, **preço praticado** (você digita), margem líquida, CMV (em destaque acima da meta), markup e o **preço para cada margem** do cenário (clique para usar).
- **Aviso de impacto:** no topo, quando o custo subiu 5% ou mais desde que o preço foi fixado, a margem ficou abaixo da mínima ou o preço dá prejuízo. **Aceitar novo custo** guarda a nova referência. O preço nunca muda sozinho.
- **Simulador de promoção:** desconto em % ou preço promocional, por canal, com margem, lucro por pedido e **quantos pedidos a mais compensam**. Nada é gravado.
- **Combo:** economia do cliente contra o avulso, desconto máximo que mantém a margem mínima, preço mínimo e margem do combo contra a dos itens separados.

## 3. Regras de negócio (resumo)

| Regra | Onde |
|---|---|
| Custo do insumo = último preço por unidade, automático ao confirmar a entrada | 7.12, 7.23 |
| Perda dividida pelo aproveitamento (20% de perda ⇒ ÷ 0,8); perda de limpeza (insumo) e de cocção (ficha) | 7.5, 7.17 |
| Frete rateado por valor; impostos fora do custo | 7.15, 7.25, 9.20 |
| Equivalência de unidade, quantidade real e fator lembrado | 7.14, 7.17, 7.24 |
| Ficha dentro de ficha; combo = produto cuja ficha usa produtos; embalagem do produto | 7.18 a 7.20 |
| Ficha de produção sem custos; porção padrão | 7.21, 7.22 |
| Custos fixos e rateio por pedido | 7.6, 7.26 |
| Preço por margem líquida; canais; margens 20, 25, 30 e 35% | 7.27 |
| Promoção, aviso de impacto | 7.28 |
| Combo com escolha (pior caso), desconto máximo, CMV-alvo | 7.29 |
| O preço de venda vem da precificação e nunca muda sozinho | 6.6, 7.3 |

## 4. API (rotas em `frontend/app/api/`)

| Rota | O que faz |
|---|---|
| `GET, POST /api/insumos`, `PATCH /api/insumos/[id]` | Lista, cria e edita insumos |
| `GET /api/insumos/categorias`, `/unidades` | Categorias e unidades de medida |
| `GET /api/compras/vinculos-itens`, `PATCH /[id]` | Itens de compra e o insumo ligado |
| `POST /api/compras/recalcular-custos` | Recalcula o custo a partir das compras confirmadas |
| `GET /api/compras/historico-precos?insumoId=` | Histórico de preços do insumo |
| `GET, POST /api/fichas`, `GET, PUT /api/fichas/[id]` | Fichas técnicas |
| `GET, POST /api/produtos` | Produtos (cadastro com preço do PDV) |
| `GET, POST /api/custos-fixos`, `PATCH /[id]`, `PUT /configuracao` | Custos fixos e pedidos por mês |
| `GET /api/precificacao` | Parâmetros, canais, preços e custo fixo por pedido |
| `PUT /api/precificacao/parametros`, `/canais`, `/precos` | Salva parâmetros, canais e preços praticados |

## 5. Dados (PostgreSQL, via Prisma)

Migrações da G08 (aditivas, cada uma com um checkpoint Git antes):

| Migração | O que traz |
|---|---|
| `add_destino_itens_compra` (G07) e vínculos | Destino e insumo do item da compra |
| `add_equivalencia_e_perda_limpeza_insumo` | Equivalência e perda de limpeza do insumo |
| `add_modo_preparo_e_ordem_fichas` | Modo de preparo, montagem, observações, validade, tempo, porção e ordem dos itens |
| `add_historico_preco_e_quantidade_convertida` | `HistoricoPrecoInsumo` e quantidade convertida do item |
| `add_peso_real_e_fator_item_compra` | Quantidade real do item e fator lembrado |
| `add_impostos_entrada_custos_fixos` | Impostos da nota, `CustoFixo`, `ConfiguracaoPrecificacao` |
| `add_parametros_canais_precos_precificacao` | Parâmetros, `CanalPrecificacao`, `PrecoProduto` |
| `add_referencia_preco_produto` | Custo e margem de referência do preço |
| `add_grupo_escolha_e_cmv_alvo` | Grupo de escolha do item da ficha e CMV-alvo |

O **custo da ficha nunca é gravado**: é calculado na leitura com os custos atuais dos insumos.

## 6. Arquitetura (onde está cada coisa)

- `frontend/modules/fichasTecnicas/`: tipos, motor de custo (`services/calcularCustoFichaTecnica.ts`, `calcularCustoItem.ts`), conversão de unidades, ficha de produção, repositório PostgreSQL e telas (`pages/`).
- `frontend/modules/insumos/`: cadastro, repositório e telas de Insumos e Itens de compras.
- `frontend/modules/compras/services/custoDaCompra.ts`: cálculo puro do custo a partir da compra (conversão, quantidade real, fator, frete).
- `frontend/modules/precificacao/`: `calcularCustoFixo.ts`, `calcularPreco.ts`, `calcularPromocao.ts` (funções puras), serviços, repositórios e telas.
- `frontend/app/financeiro/precificacao` e `custos-fixos`: rotas das telas dentro do Financeiro.
- Padrão: tela → rota de API → serviço → repositório (Port + PostgreSQL), com a empresa vinda de `core/context/empresaContext.ts`.

## 7. Testes

Rodar a partir de `frontend/`: `npm run check` (tipos, lint contra a linha de base e todos os `*.test.ts`). Cobertura da G08: motor de custo das fichas e da preparação, custo do item, ficha de produção, custo da compra, serviço de compras (custo automático, peso real, frete), custos fixos, cálculo de preço, promoção e combo, serviço de precificação. O roteiro manual para percorrer as telas está em `docs/ROTEIRO_DE_TESTES.md`.

## 8. Decisões do Kacius que valem para o módulo

- Custo do insumo pelo **último preço por unidade**, automático.
- Fichas **digitadas por ele**; nada carregado de conversas.
- **Margem líquida** como base do preço (desconta custo, embalagem, custo fixo, comissão, imposto e taxa de pagamento).
- Margens de **20, 25, 30 e 35%**, com 20% como mínima.
- Frete entra no custo; impostos à parte.
- Combo como produto principal; custo pelo **pior caso** nas opções de escolha.
- A estratégia de preço do iFood (baixar a margem para entrar sem pulverizar os preços) será revista em outra conversa.

## 9. Limitações e pendências

- O PDV ainda lê o preço do cadastro do produto; ligar aos preços por canal entra com a migração do PDV (S2 e G03).
- Promoções só são simuladas; salvar com nome e período fica para depois.
- A taxa de combo (percentual de pedidos com combo) depende de pedidos reais (dashboard, S6).
- A leitura por foto não traz impostos; só o XML os preenche.
- O fator lembrado só é trocado lembrando um novo valor.
- O aviso de impacto aparece na tela de Precificação, não logo após confirmar a compra.
- A estimativa de pedidos por mês é digitada; depois deve vir dos pedidos reais.
- O menu Financeiro fica bloqueado enquanto a operação não estiver ativa; as telas abrem pelo endereço direto.
- Estoque: a quantidade convertida do item da compra já fica gravada para servir ao estoque (G05 e G06).

## 10. Histórico dos blocos da G08

| Bloco | Commit | O que entregou |
|---|---|---|
| 8A | `8576697` | Vínculo item da compra → insumo |
| 8B | `0a51110` | Equivalência de unidade, perda de limpeza, editar insumo |
| 8D | `c23f610` | Tela de fichas técnicas, ficha dentro de ficha, custo ao vivo |
| 8E | `d679de3` | Modo de preparo, montagem e ficha de produção |
| 8C | `b8f24a6` | Custo automático pelo último preço e histórico |
| Peso real | `f3ef840` | Quantidade real e fator lembrado na entrada |
| 8F | `fe6bb16`, `a308228` | Frete rateado, impostos à parte, custos fixos |
| 8G | `9749df5` | Precificação por margem, CMV, markup, margem líquida |
| 8H | `6adc76b` | Simulador de promoção, economia do combo, aviso de impacto |
| 8I | `d39461b` | Combo com escolha, desconto máximo, meta de CMV |
