# Roteiro de testes do Kacius (G07 e G08)

> Passo a passo para percorrer, de uma vez, o que foi construído em Compras e em Fichas, Custo e Precificação. Última atualização: 12/11/2026.
> Marque cada passo. Se algo não bater, anote a tela e o que aconteceu: eu corrijo em um commit novo.

## Antes de começar

1. Abra o terminal em `C:\beatus-os\frontend` e rode `npm run dev` (ou peça para eu subir o servidor).
2. Abra `http://localhost:3000`.
3. O menu **Financeiro** fica bloqueado enquanto a operação está "Aguardando abertura". Use os endereços diretos abaixo.
4. Os dados atuais são de teste. Nada aqui apaga cadastros: tudo só se inativa ou se cancela.

## Parte 1: Compras (G07)

| # | O que fazer | O que esperar |
|---|---|---|
| 1 | `/compras/fornecedores` → **Novo fornecedor**, digite um CNPJ e use a busca | Razão social, nome fantasia e endereço vêm preenchidos (BrasilAPI) |
| 2 | Digite um CEP | O endereço é completado |
| 3 | `/compras/entradas/nova` → **Importar XML da NF-e** com um XML seu | Documento, fornecedor, itens, lote, validade e frete preenchidos; o XML fica anexado |
| 4 | Importe o mesmo XML de novo | Aparece o bloqueio de nota em duplicidade |
| 5 | **Digitar manualmente** uma entrada de recibo com 2 itens | Total = produtos − desconto + frete |
| 6 | Na entrada, olhe o bloco **Impostos e outras despesas da nota** | ICMS-ST, IPI, seguro e outras despesas, só para consulta |
| 7 | Salve e escolha o **destino** de cada item (Insumo, Embalagem...) | O botão de confirmar só libera com todos classificados |
| 8 | Num item de insumo, preencha **Quantidade real** (exemplo: 6,8 kg) e salve | O custo usará esse peso |
| 9 | Confirme a entrada | Mensagem de sucesso; se algum item não converter, um aviso de custo aparece |
| 10 | Cancele uma entrada confirmada, com motivo | A situação vira Cancelada e o custo volta ao anterior |
| 11 | (Se já tiver a chave da Anthropic) tire uma foto de um recibo | Os itens são lidos para conferência; sem a chave, a tela avisa |

## Parte 2: Insumos e custo (G08)

| # | O que fazer | O que esperar |
|---|---|---|
| 12 | `/insumos` → **Novo insumo** (exemplo: bacon, R$ 115 o kg) | Aparece na lista com o custo por unidade |
| 13 | **Editar** um insumo: preencha equivalência (1 pacote = 6 un) e perda de limpeza | Salva e a lista mostra os valores |
| 14 | `/insumos/vinculos` → ligue o item "Bacon manta" ao insumo bacon | O item fica "Ligado" |
| 15 | Clique em **Recalcular custos das compras** | Mensagem com quantos itens foram aplicados |
| 16 | **Editar** o insumo bacon e olhe o **Histórico de preços** | Lista as compras, da mais nova para a mais antiga |
| 17 | Confirme uma nova entrada com o bacon a outro preço | O custo do insumo passa a ser o preço novo (frete rateado entra) |

## Parte 3: Fichas técnicas

| # | O que fazer | O que esperar |
|---|---|---|
| 18 | `/fichas` → **Nova preparação** (exemplo: Blend Beatus: 112 g de peito + 48 g de linguiça) | Custo calculado ao vivo, com rendimento e custo por grama |
| 19 | Preencha o **modo de preparo** (um passo por linha), validade, tempo e **porção padrão** | A lista mostra o custo da porção |
| 20 | Use os botões ↑ ↓ para reordenar os itens | A ordem fica gravada |
| 21 | Crie uma **segunda preparação** que usa a primeira como item | O custo da segunda inclui o da primeira (ficha dentro de ficha) |
| 22 | Aba **Produtos** → **Novo produto**: pão, preparações e bloco **Embalagem do produto** | Mostra "custo da receita" e "custo com embalagem" |
| 23 | Num produto, em **Opção de escolha**, dê o mesmo nome a duas batatas | O custo usa a opção mais cara; a outra aparece como "não é a mais cara" |
| 24 | Abra **Ficha de produção (sem custos)** de uma preparação | Sem R$, custo, preço ou margem; passos numerados |
| 25 | Mude o campo "Quanto vou fazer" | As quantidades são multiplicadas |
| 26 | Clique em **Imprimir** | A impressão sai sem menu nem botões |
| 27 | Inative uma ficha | Ela some das listas ativas, mas não é apagada |

## Parte 4: Financeiro

Endereços diretos: `/financeiro`, `/financeiro/custos-fixos`, `/financeiro/precificacao`.

| # | O que fazer | O que esperar |
|---|---|---|
| 28 | `/financeiro` | Dois cartões: Precificação e Custos fixos |
| 29 | Custos fixos → cadastre o aluguel de R$ 1.500 e outros | O total do mês soma os custos |
| 30 | Informe os **pedidos esperados por mês** (sugestão: 430) e salve | Aparece o custo fixo por pedido |
| 31 | Inative um custo | Sai do total, mas continua na lista |
| 32 | Precificação → **Parâmetros e canais**: imposto, taxa de pagamento, embalagem do pedido, produtos por pedido, comissão do iFood (25,2%) e taxa de R$ 150 | Salva; o aviso de "percentuais em zero" some |
| 33 | Escolha o canal **Site** e veja a linha de um produto | Custo da ficha, custo total e os preços para 20, 25, 30 e 35% |
| 34 | Digite um **preço praticado** | Margem, CMV, markup e lucro na hora; abaixo de 20% vira "promoção", abaixo de zero "prejuízo" |
| 35 | Clique em um dos preços das colunas de margem | Ele vira o preço praticado |
| 36 | Troque para **iFood** | Os preços para cada margem sobem (a comissão pesa) |
| 37 | Mude o custo de um insumo (nova compra) e reabra a Precificação | Aparece o **Aviso de impacto** se o custo subiu 5% ou mais |
| 38 | **Aceitar novo custo** | O aviso some; o preço não muda |
| 39 | **Simulador de promoção**: escolha um produto, desconto de 15% | Por canal: preço, margem, lucro por pedido e pedidos a mais para compensar |
| 40 | Escolha um **combo** (produto que usa outros produtos) | Economia do cliente, desconto máximo, preço mínimo e margem contra o avulso |

## Parte 5: Estoque, produção e registro de atividades

Endereços diretos: `/estoque`, `/producao`, `/atividades`.

| # | O que fazer | O que esperar |
|---|---|---|
| 41 | No topo, troque o **Operador** (Kacius, Irmão) | A escolha fica guardada; o registro grava esse nome |
| 42 | Confirme uma entrada de compra com itens ligados a insumos, depois abra `/estoque` | O saldo do insumo subiu na quantidade convertida |
| 43 | Em Itens de compras, **Recalcular custos das compras** | Compras antigas também entram no estoque |
| 44 | No Estoque, **Contar** um insumo e informe o que você contou, com motivo | O saldo vira o contado; a diferença aparece no histórico como ajuste |
| 45 | **Perda** de um item, com motivo | O saldo cai e o histórico mostra "Perda" |
| 46 | **Mínimo** de um insumo acima do saldo | A linha fica "abaixo do mínimo" e conta nos alertas |
| 47 | **Histórico** de um item | Entradas, saídas, produção, contagens e perdas, da mais nova para a mais antiga |
| 48 | Cancele uma entrada de compra confirmada | O estoque dela sai de volta (aparece como "Compra cancelada") |
| 49 | `/producao` → escolha uma preparação (ex.: Blend) e a quantidade | Lista o que vai sair do estoque, com o saldo antes e depois |
| 50 | Informe **quanto rendeu de verdade** e **Registrar lote** | Entra o rendimento real na preparação; o custo por unidade do lote aparece na lista |
| 51 | Veja o saldo da preparação em `/estoque` → aba Preparações | O blend tem saldo e custo por unidade do último lote |
| 52 | `/atividades` | Aparecem compra confirmada ou cancelada, contagem, perda e lote, com quem fez e quando |
| 53 | Filtre por área e pelo número de um documento | Só as linhas daquele documento |

## Parte 6: Quadro do estoque, gavetas, validade e etiquetas

Endereços diretos: `/estoque/quadro`, `/estoque/gavetas`, `/estoque/etiqueta`.

| # | O que fazer | O que esperar |
|---|---|---|
| 54 | `/estoque/gavetas` → informe a **temperatura do freezer** (ex.: -20) e da geladeira e salve | Salva; o Registro de atividades mostra a mudança |
| 55 | Crie uma **gaveta** com o nome da preparação (ex.: Blend Beatus) | Aparece na lista; nome repetido é recusado |
| 56 | Confira a tabela de **prazos de validade** e edite um prazo | O prazo salvo vale para os próximos lotes |
| 57 | `/producao` → escolha a preparação, informe o rendimento e **divida por gaveta** | A soma das gavetas tem de ser igual ao rendimento; o lote entra no freezer com a validade da temperatura |
| 58 | `/estoque/quadro` | O lote aparece na coluna "No freezer", na gaveta certa, com a validade |
| 59 | No cartão do freezer, **Descer para a geladeira** | O cartão vai para "Descongelando" e a validade passa a contar do descongelamento |
| 60 | Tente voltar um cartão descongelado para o freezer | Não existe botão e a API recusa: não pode recongelar |
| 61 | **Levar para a cozinha** e depois **Sobrou (guardar na geladeira)** com parte da quantidade | O cartão se divide entre "Na cozinha" e "Sobra" |
| 62 | **Descartar** um cartão, com motivo | O cartão diminui e o estoque da preparação cai (perda) |
| 63 | No cartão, **Etiqueta** → escolha o tamanho do rolo e imprima | Etiqueta com nome, lote, gaveta, preparo, validade, temperatura e, para descongelado e sobra, NÃO RECONGELAR; fica no Registro de atividades |

## Parte 7: Cozinha, cancelamento e ticket

Endereço direto: `/cozinha`. Antes, tenha um produto com ficha e preço no canal, e uma preparação levada à cozinha em `/estoque/quadro`.

| # | O que fazer | O que esperar |
|---|---|---|
| 64 | Lance um pedido no PDV com pagamento aprovado | Ele aparece em **Novos (fila)** em `/cozinha`, com ticket pendente |
| 65 | **Iniciar preparo** | O pedido vai para Em preparo e o estoque baixa pela ficha (insumos e a preparação da cozinha) |
| 66 | Tente cancelar sem motivo | Recusa: o motivo é obrigatório |
| 67 | Cancele um pedido **Em preparo** devolvendo só um insumo fechado (ex.: pão) | Só o que foi marcado volta ao saldo; o resto vira perda |
| 68 | Cancele um pedido ainda em **Novos** | Nada mexe no estoque |
| 69 | **Pronto**, **Saiu para entrega**, **Entregue** | O pedido percorre as colunas; entregue não pode ser cancelado |
| 70 | **Ticket** → Imprimir | Ticket de 80 mm com número, itens, observações, cliente e total; a fila marca IMPRESSO |
| 71 | `/atividades` | Aparecem o lançamento, as mudanças de status e os cancelamentos, com quem fez |

## Parte 8: Fluxo de caixa

Endereço direto: `/financeiro/fluxo-de-caixa`.

| # | O que fazer | O que esperar |
|---|---|---|
| 72 | Abra **Financeiro** | Os três cartões (entradas, saídas e saldo do mês) mostram números reais, e há o atalho **Fluxo de caixa** |
| 73 | Em uma entrada de compra em rascunho, **Confirmar entrada** | Aparece o seletor **Pago à vista com** (Pix, Dinheiro ou Cartão); depois de confirmada, a compra entra nas saídas |
| 74 | `/financeiro/fluxo-de-caixa` → **Este mês** | Entradas = pagamentos aprovados dos pedidos; saídas = compras confirmadas e avulsos; saldo = entradas menos saídas |
| 75 | Confira as listas **por canal**, **por forma** e **saídas por categoria** | As somas batem com os cartões; o frete e os impostos da compra aparecem à parte |
| 76 | **+ Lançamento avulso**: despesa de gás, R$ 130,50, dinheiro | Aparece nos movimentos e nas saídas; valor zero é recusado |
| 77 | **Cancelar** o lançamento, sem motivo e depois com motivo | Sem motivo recusa; com motivo ele sai do saldo e aparece em "cancelados" |
| 78 | Cancele um pedido na cozinha e volte ao fluxo | O pedido cancelado deixa de contar como entrada |
| 79 | Com **Este mês** marcado, veja o saldo | Aparece o saldo com os custos fixos do mês descontados |
| 80 | `/atividades` | Aparecem o lançamento e o cancelamento, com quem fez |

## Parte 9: Contas a pagar e capital de giro

Endereços diretos: `/financeiro/contas-a-pagar` e `/financeiro/capital-de-giro`.

| # | O que fazer | O que esperar |
|---|---|---|
| 81 | Em uma entrada em rascunho com todos os itens classificados, **Confirmar entrada** → **A prazo** | Aparecem tipo, parcelas, 1º vencimento e intervalo |
| 82 | Informe 3 parcelas e **Gerar parcelas**; mude o vencimento de uma | As parcelas dividem o total (o centavo que sobra vai para a primeira) e a soma é conferida na tela |
| 83 | Altere um valor para a soma não bater e confirme | Recusa: a soma das parcelas deve ser igual ao total |
| 84 | Confirme | A entrada fica confirmada e os títulos aparecem em **Contas a pagar**, em aberto; o caixa ainda **não** mostra a saída |
| 85 | **Pagar** um título com um valor um pouco maior (juros) | O título vira pago; a saída entra no fluxo de caixa na data do pagamento, com a diferença em "Juros, multas e descontos" |
| 86 | **Cancelar** um título em aberto, sem motivo e depois com motivo | Sem motivo recusa; com motivo ele sai da lista de abertos |
| 87 | Cancele a compra a prazo | Os títulos em aberto são cancelados; os já pagos permanecem no caixa |
| 88 | `/financeiro/capital-de-giro` → **Saldo inicial** | Informe quanto tem em caixa e banco e a data; o saldo de hoje aparece |
| 89 | Confira os cartões (vencidos, vence hoje, até 7, 15 e 30 dias) e os avisos no topo | Os valores batem com a lista de Contas a pagar; títulos vencidos geram aviso vermelho |
| 90 | Veja a **projeção do caixa** | Uma linha por dia, com vendas esperadas, títulos, custos fixos e saldo; linhas negativas em vermelho e aviso com a data |
| 91 | `/atividades` | Aparecem a criação dos títulos, o pagamento, o cancelamento e o saldo inicial, com quem fez |

## O que anotar

- Qualquer número que você ache errado (custo, preço, margem): diga o produto, o canal e o valor esperado.
- Qualquer tela confusa: diga o que você esperava ver.
- Regras de negócio que faltam: entram no BACKLOG e a gente decide se entram agora ou depois.
