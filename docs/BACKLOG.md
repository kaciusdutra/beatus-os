# Beatus OS: Backlog

> O que foi combinado com o Kacius e **ainda não foi programado**, organizado pelas sprints globais (G01 a G12). As regras de cada item estão em `docs/REGRAS_DE_NEGOCIO.md`.
>
> Última revisão: 04/11/2026. Ao concluir um item, ele sai daqui e entra no `docs/ESTADO_ATUAL.md`.

---

## Regras de trabalho

- Uma sprint global só é fechada quando a macroetapa estiver completa. Dentro dela há blocos, testes e checkpoints.
- Toda dúvida nova é avaliada: entra agora ou espera. Se esperar, é registrada aqui.
- Mudança no banco (schema Prisma e migração) só com a autorização do Kacius e com um checkpoint no Git antes.
- No fim de cada sprint global, gerar a documentação do módulo.

## Mapa das sprints globais

| Sprint | Macroetapa | Situação |
|---|---|---|
| G01 | Fundação e arquitetura | Em boa parte pronta |
| G02 | Cadastros mestres | Em boa parte pronta |
| G03 | Vendas e clientes | Parcial |
| G04 | Operação do restaurante | Em boa parte pronta |
| G05 | Produção | Inicial |
| G06 | Estoque | Inicial |
| G07 | Compras e abastecimento | Concluída (12/11/2026). Pendentes externos: chave da Anthropic e baixa da SEFAZ |
| G08 | Fichas, preparações e precificação | Parcial (MVP do soft open) |
| G09 | Financeiro | Inicial |
| G10 | Entrega, integrações e automação | Inicial |
| G11 | Beatriz e inteligência | Não iniciada |
| G12 | Homologação e produção | Não iniciada |

O plano de endurecimento S1 a S6 (`docs/PLANO_DE_SPRINTS.md`) corre por cima deste mapa, como caminho crítico para a abertura. A S1 está concluída. A S5 (diagnóstico do legado, `docs/DIAGNOSTICO_LEGADO.md`) está concluída: código morto removido e dashboard marcado como demonstração em 12/11/2026; as migrações (telas Pedidos, Clientes e PDV, horários e checklist, login) seguem nas sprints indicadas lá.

---

## G07: Compras e abastecimento (atual)

Concluído: leitura do QR da NFC-e (v2 e v3), preenchimento automático e fornecedor encontrado pelo CNPJ (commit a24eb8a).

Concluído no bloco 7A: nome do fornecedor na lista, card sem as canceladas, tela de detalhe com itens, valores e botões de confirmar e cancelar, volta para a lista depois de salvar, e série e chave de acesso só para nota fiscal.

Concluído no bloco 7B: destino de cada item (Insumo, Embalagem, Limpeza e higiene, Expediente, Equipamento e utensílio, Serviço), confirmação só com todos os itens classificados, identificação de "Item já conhecido" ou "Item novo" pela chave em caixa alta e memória do destino por fornecedor; na nova entrada, o botão "Adicionar item" fica abaixo do último item e o campo passou a se chamar "Código do produto na nota".

Concluído no bloco 7C: tela de fornecedores em Compras (cadastro por CNPJ ou CPF, busca dos dados pelo CNPJ na Receita Federal, conferência dos dígitos, destino padrão, inativar e reativar) e atalhos "Cadastrar este fornecedor" e "Atualizar lista" na nova entrada.

Concluído no bloco 7D: importação do XML da NF-e/NFC-e na nova entrada (documento, fornecedor, itens, lote, validade e frete preenchidos; XML anexado como documento original), aviso de XML sem autorização da SEFAZ, aviso de diferença no total por impostos e outras despesas, e bloqueio de nota em duplicidade pela chave de acesso.

Concluído no bloco 7E (migração `add_endereco_inscricao_fornecedor`): inscrição estadual e endereço do fornecedor (campos separados), busca do endereço pelo CEP (rota `/api/cep/[cep]`, compartilhada), endereço vindo também da busca pelo CNPJ e botão "Cadastrar com os dados da nota" na nova entrada.

Concluído: documentação do módulo Compras (`docs/MODULO_COMPRAS.md`, 12/11/2026), com telas, regras, API, dados, configuração, testes e pendências.

Concluído no bloco 7F (falta só a chave de API): leitura dos itens por foto (IA) para nota, cupom e recibo manuscrito, com itens em amarelo para conferir, avisos de soma e de CPF/CNPJ, fornecedor encontrado pelo documento ou sugerido pelo nome, cadastro com os dados lidos, e consumo de tokens e custo por leitura na tela.

- [ ] **Colocar a chave da Anthropic** em `frontend/.env` (`ANTHROPIC_API_KEY`), depois de avaliar o custo por foto. Opcionais: `ANTHROPIC_PRECO_ENTRADA_REAIS_MILHAO` e `ANTHROPIC_PRECO_SAIDA_REAIS_MILHAO` (reais por milhão de tokens, para a tela mostrar o custo em reais) e `ANTHROPIC_MODELO` (padrão `claude-sonnet-5-5`). Testar a leitura com fotos reais (notas, cupons e recibos manuscritos) e ajustar as instruções da IA se preciso.
- [ ] Guardar o consumo de tokens e o custo de cada leitura no banco (exige migração), para somar por entrada e por mês e repassar ao preço dos produtos.
- [ ] Refazer a leitura com um modelo mais forte quando a IA deixar muitos itens em dúvida, e avaliar o plano de reserva da Anthropic para recusas.

- [ ] **Busca de endereço pelo CEP no cadastro de clientes** (a rota `/api/cep/[cep]` já existe; o cliente já guarda o endereço completo, sem migração). Pedido em 10/11/2026: bloco separado, no módulo Clientes.
- [ ] Completar o cadastro de um fornecedor já existente com os dados do XML (inscrição estadual e endereço), com uma regra de qual dado vale mais.
- [ ] Decidir onde entram no custo o ICMS-ST, o IPI, o seguro e as outras despesas da nota (hoje só aparecem como aviso, regra 9.20).
- [ ] Usar o código do produto do fornecedor (cProd do XML) para reconhecer o "Item já conhecido", além da descrição.
- [ ] Atualizar o custo do insumo quando a entrada for confirmada, com conversão entre a unidade da nota e a unidade de compra do insumo (decidido em 04/11/2026: fica para depois da 7B).
- [ ] Leitura dos itens pela **foto** do cupom ou da nota (IA), com conferência humana.
- [ ] Quando o CNPJ e o certificado digital saírem: baixa automática das NF-e da SEFAZ.

## G03: Vendas e clientes

- [ ] PDV lendo o cardápio real do banco, no lugar de `modules/pdv/data/produtosMock.ts`, com a foto do produto.
- [ ] Adicionais conforme a regra: só ingredientes do próprio burger, com código e preço próprios; tirar ingrediente sem alterar o preço.
- [ ] Bloquear a cobrança no PDV para pedidos eletrônicos e exigir todos os campos nos manuais (conferir o que já existe).
- [ ] Acréscimo em pedido que ainda está em produção, pago à parte.
- [ ] Regra de pagamento: **cliente novo não paga na entrega**. Hoje `core/payment/paymentRules.ts` está com `permitirPagamentoNaEntrega: true`.
- [ ] Exceção para cliente recorrente ligada ao clube de vantagens (em espera, desligada).
- [ ] Geração de Pix (QR Code e copia e cola) e de link de cartão nos canais próprios.

## G04: Operação do restaurante

- [ ] Tela de horários dentro do módulo de Configurações, com exceções por dia, semana ou mês (hoje existe em `/operacao/horarios`).
- [ ] Mostrar o estoque atualizado do dia na abertura do sistema.
- [ ] Diário da operação gravado em logs.

## G05 e G06: Produção e estoque

- [ ] **Compra, insumo, ficha e estoque conversam entre si** (pergunta do Kacius em 12/11/2026). A entrada de compra **confirmada** é a conferência do recebimento: cada item ligado a um insumo dá **entrada no estoque**, já convertida para a unidade do insumo pela equivalência (exemplo: 2 pacotes de pão a 6 un = +12 un). Cancelar a entrada estorna. A venda baixa o estoque pela ficha técnica do produto (considerando as perdas). A unidade do estoque é a unidade de uso do insumo (g, ml, un). O bloco 8C já guarda no item da entrada a quantidade convertida, para servir ao custo e ao estoque.

- [ ] Fila de produção com prioridades, tempos e capacidade (45 burgers por dia: capacidade planejada e restante).
- [ ] Estoque com movimentação real: entradas, saídas, saldo, lote, validade, inventário, perdas e ajustes.
- [ ] Estoque em formato kanban.
- [ ] Estimativa do que preparar no dia, com percentual por preparação entre o mínimo e o máximo (10 a 45 burgers), aprendendo com o histórico.
- [ ] Lista de compras diária gerada pelo sistema (o que repor de insumos e de preparações).
- [ ] Estoque, financeiro, produção, receitas e ingredientes ainda **não têm tabela no banco** (são legado em memória ou localStorage). Ver a S5.

## G08: Fichas, preparações e precificação

**Plano da G08 aprovado em 12/11/2026 (decisões nas regras 7.5 e 7.12 a 7.16):** 8A vínculo item → insumo; 8B unidades e peso (migração); 8C custo automático e histórico de preços (migração); 8D fichas técnicas (rotas, telas, fórmula da perda); 8E a 8G precificação.

- [x] **Bloco 8C concluído** (migração `add_historico_preco_e_quantidade_convertida`): custo automático pelo último preço ao confirmar a entrada, histórico de preços do insumo (visível em Editar insumo), quantidade convertida gravada no item, custo volta ao cancelar a entrada, botão Recalcular custos das compras. Regra 7.23.
- [x] **Peso real na entrada concluído** (migração `add_peso_real_e_fator_item_compra`): quantidade real com unidade por item da entrada em rascunho, fator fixo lembrado por fornecedor e item, prioridade no custo. Regra 7.24.
- [x] **Frete rateado por valor no custo do insumo; impostos visíveis à parte (concluído no 8F)** (decisão do Kacius em 12/11/2026, regra 7.25): entra no começo do 8F, porque a precificação depende do custo real. Sem migração para o frete (a entrada já guarda o valor do frete); os impostos da nota hoje só aparecem como diferença no total, então guardá-los à parte exige campos novos, a decidir no plano do 8F.
- [x] **Custos fixos e pedidos por mês concluídos no 8F** (migração `add_impostos_entrada_custos_fixos`): tela de custos fixos com vigência, total do mês e custo fixo por pedido. Regra 7.26.
- [x] **Bloco 8G concluído** (migração `add_parametros_canais_precos_precificacao`): tela de precificação com preço por margem (20, 25, 30 e 35%), CMV, markup e margem líquida por produto e canal, preço praticado digitável e parâmetros e canais. Regra 7.27.
- [x] **Bloco 8H concluído** (migração `add_referencia_preco_produto`): simulador de promoção com volume para compensar, economia do combo e aviso de impacto de custo com "Aceitar novo custo". Regra 7.28.
- [x] **Bloco 8I concluído** (migração `add_grupo_escolha_e_cmv_alvo`): combo como produto principal com grupo de escolha (custo pelo pior caso), desconto máximo do combo, margem do combo contra o avulso e meta de CMV (35%). Regra 7.29. O combo por canal já funciona pelo preço de cada canal.
- [ ] **Taxa de combo e escadinha de combos:** o percentual de pedidos com combo entra no dashboard (S6) quando houver pedidos reais; a escadinha (burger, combo, combo experiência) pode virar uma visão própria se for preciso. *(12/11/2026)*
- [ ] **Relatório de padronização:** quanto das compras se concentra em poucos insumos e preparações (mesmo pão, mesmo blend), para medir o cardápio curto. *(12/11/2026)*
- [ ] **Promoções salvas** (nome, canal, período): o 8H só simula. Salvar e aplicar no PDV entra com a migração do PDV (S2 e G03). *(12/11/2026)*
- [ ] **Aviso de impacto fora da tela de precificação:** hoje ele aparece ao abrir a Precificação; avisar também logo depois de confirmar uma entrada de compra que mexeu no custo. *(12/11/2026)*
- [ ] **Estratégia de preço do iFood** (pedido do Kacius em 12/11/2026, a rever com a conversa que ele vai exportar): baixar um pouco a margem para entrar no iFood com certo custo, sem pulverizar os preços entre canais e sem prejuízo. A tela do 8G já mostra a margem de qualquer preço por canal; falta definir a regra (preço único ou por canal, margem mínima no iFood).
- [x] **Preços da precificação no PDV** (concluído na S2): o PDV e o servidor leem o preço da Precificação por canal.
- [x] **S2 concluída: pedido seguro no servidor.** O servidor calcula preço, subtotal, taxa, total e número do pedido; a tela só envia produto, quantidade, adicionais e endereço. Regra 3.8.
- [ ] **S3 (login e perfis) adiada para o final** (decisão do Kacius em 12/11/2026): fechar antes todas as telas e funcionalidades; depois setorizar acessos e restrições por categoria de funcionário. No início só o Kacius e o irmão usam o sistema. Ao retomar, definir os perfis e a matriz de acesso (a confirmar com o Kacius).
- [x] **Estoque e produção, bloco 1 concluído** (migração `add_estoque_producao_registro_fila_impressao`): movimentos de estoque, entrada pela compra (com backfill e estorno ao cancelar), tela Estoque (saldo, mínimo, alerta, valor, contagem, perda, histórico), produção de lotes com rendimento real e custo do lote, Registro de atividades e seletor de operador. Regras da seção 11.
- [x] **Estoque e produção, bloco 2 concluído** (migração `add_kanban_gavetas_validade_etiquetas`): quadro kanban do estoque das preparações (freezer, geladeira, descongelando, cozinha, sobra, descartar), gavetas nomeadas, validade pela temperatura do freezer com prazos editáveis (Portaria CVS 3/2026, a conferir), produção com divisão por gaveta e etiquetas para imprimir (lote congelado, descongelado, sobra, resfriado). Regras 11.9 a 11.12.
- [ ] **Conferir a tabela de validade no texto oficial da CVS 3/2026:** os prazos vieram de uma transcrição na internet; confirmar o art. 44 no PDF oficial e ajustar em Estoque → Gavetas e regras. *(Kacius)*
- [ ] **Medir a temperatura do freezer e a capacidade de cada gaveta** e informar em Estoque → Gavetas e regras (sem a temperatura vale 30 dias). *(Kacius)*
- [ ] **QR code na etiqueta:** exige uma biblioteca nova no projeto (depende de autorização). Hoje a etiqueta leva o código do lote em texto. *(12/11/2026)*
- [ ] **Impressora térmica de etiquetas:** hoje a etiqueta sai pela impressão do navegador, no tamanho do rolo. Quando a impressora for comprada, ajustar o papel nas configurações dela ou ligar impressão direta. *(12/11/2026)*
- [x] **Baixa por venda a partir da coluna "Na cozinha"** (primeiro a vencer, primeiro a sair): feita com a cozinha. *(12/11/2026)*
- [ ] **Quadro kanban: arrastar e soltar** os cartões (hoje há botões por cartão). *(12/11/2026)*
- [x] **Cozinha concluída (sem migração):** tela `/cozinha` (Novos, Em preparo, Prontos, Em rota), API de status com motivo e devoluções no cancelamento, baixa do estoque ao iniciar o preparo (insumos no saldo; preparações da coluna "Na cozinha", primeiro a vencer), ticket de 80 mm em `/cozinha/ticket/[id]` e fila de impressão `/api/impressao/fila`. Regra 11.6.
- [ ] **Ticket automático na impressora térmica:** hoje o ticket sai pela impressão do navegador e marca IMPRESSO; um impressor que leia a fila fica para quando a impressora existir.
- [ ] **Baixa de preparação sem cartão na cozinha:** se a preparação não foi levada à cozinha, a baixa vai para o saldo geral com aviso; avaliar travar o início do preparo.
- [ ] **Checklist diário ligado ao estoque e à validade (junto da G04):** itens de temperatura do freezer e da geladeira (duas vezes ao dia, derivável do Registro de atividades), conferir cartões vencidos ou vencendo no quadro, descer a gaveta do dia seguinte para descongelar, conferir estoque abaixo do mínimo e, no fechamento, pesar a sobra, mover ou descartar e etiquetar. O checklist hoje é fixo em memória e será migrado para o banco. *(pedido do Kacius em 12/11/2026)*
- [ ] **Opção de escolha do combo no pedido:** o pedido ainda não guarda qual opção o cliente escolheu, então esses itens não baixam o estoque sozinhos. *(12/11/2026)*
- [ ] **Lote e validade no estoque (primeiro a vencer, primeiro a sair):** hoje o lote de produção guarda a validade, mas o estoque não controla lote por lote. *(12/11/2026)*
- [ ] **Dados de teste do estoque:** os insumos e fichas `[TESTE E]` ficaram inativos; os movimentos continuam no registro (que não se apaga). *(12/11/2026)*
- [ ] **Distância de entrega calculada no servidor:** hoje a distância vem da busca de endereço (simulada) e o servidor calcula a taxa por ela; quando houver geocodificação real, o servidor deve calcular a distância pelas coordenadas do endereço. *(S2, 12/11/2026)*
- [ ] **Autoria do pagamento aprovado:** o servidor aceita o status de pagamento enviado pela tela (o operador aprova no PDV); com o login da S3, gravar quem aprovou e travar por perfil. *(S2, 12/11/2026)*
- [ ] **Remover o código legado do PDV** (com autorização): `modules/pdv/data/produtosMock.ts` e `gerarNumeroPedido` em `modules/pedidos/services/pedidoRepository.ts` não são mais usados pelo PDV. *(S2, 12/11/2026)*
- [ ] **Pedidos de teste da S2:** o cliente `[TESTE S2] Cliente` e os pedidos dele ficaram no banco de teste; sem rota de exclusão, ficam até a limpeza dos dados de teste. *(S2, 12/11/2026)*
- [ ] **Preços do soft open:** o Kacius vai passar a lista dos preços praticados (direto e iFood) para carregar como preço praticado e comparar com o custo das fichas. Referência: Agnus R$ 44,90 direto e cerca de R$ 60,02 no iFood (44,90 ÷ 0,748).
- [ ] **Custo fixo por pedido com pedidos reais:** hoje a base é a estimativa digitada; depois de alguns meses de pedidos, usar a média real do PDV. Entra com a precificação (8G). *(12/11/2026)*
- [ ] **Leitura por foto não traz impostos:** só o XML preenche ICMS-ST, IPI, seguro e outras despesas; na foto e na digitação manual eles são digitados. *(12/11/2026)*
- [ ] **Esquecer ou editar o fator lembrado:** hoje o fator fixo só é substituído lembrando um novo valor; falta uma forma de apagá-lo. *(12/11/2026)*
- [ ] **Ligar item ao insumo não aplica o custo sozinho:** ao ligar um item (tela Itens de compras), o custo só muda quando a entrada for confirmada ou ao usar Recalcular custos das compras. *(12/11/2026)*

- [ ] **Custo automático do insumo pela última compra** (regra 7.12, decisão de 12/11/2026): ao confirmar a entrada, o custo do insumo passa a ser o último preço por unidade de medida (quilo etc.), e as fichas são recalculadas. A definir na sprint: conversão de unidades (a nota pode vir por "manta" ou "caixa" sem o peso: o peso real seria informado na entrada); se o desconto do item entra no preço; o que acontece com o custo quando a entrada é cancelada (volta ao preço da compra anterior); histórico de preços do insumo para ver a variação; frete e impostos da nota (hoje só aviso, regra 9.20).
- [ ] Custo da porção pela gramatura (preço do quilo × peso da porção), com a perda de cada insumo (regra 7.5).
- [x] **Bloco 8E concluído** (migração `add_modo_preparo_e_ordem_fichas`): modo de preparo (preparações), montagem (produtos), observações, validade, tempo de preparo, porção padrão e ordem dos itens (botões ↑ ↓) na ficha; tela **Ficha de produção** (`/fichas/[id]/producao`) sem custos, com escala ("quanto vou fazer"), link "Ver como fazer" para fichas usadas, e impressão; coluna Custo da porção na lista. Falta: foto em cada passo.
- [x] **Bloco 8D concluído** (sem migração): tela **Fichas técnicas** (`/fichas`, botão em Insumos) com abas Preparações e Produtos; editor com itens que são insumos ou outras fichas, custo ao vivo em cada linha, bloco "Embalagem do produto", rendimento (com "usar a soma dos itens") e custo de uma porção; combo (produto dentro de produto); criar produto na tela (preço 0); ficha só inativa. Rotas `/api/fichas`, `/api/fichas/[id]` e `/api/produtos`. Correção do cálculo ao usar uma ficha dentro de outra (unidades). Uma ficha de teste inativa ("[TESTE 8D] Blend 160 g") ficou no banco.
- [ ] **Kacius:** cadastrar os insumos que faltam (vinagre de arroz, realçador de sabor/MSG, alho, gemas, salsinha por peso, batata do aligot, frango, costela, creme de leite, parmesão, noz-moscada) e as equivalências do pão, da rúcula e da fumaça líquida (pump); depois montar as fichas digitando as quantidades.
- [ ] **Modo de preparo, montagem e "ficha de produção"** (pergunta do Kacius em 12/11/2026): a ficha precisa guiar o funcionário. Campos novos na ficha (migração aditiva): modo de preparo (passos), montagem do produto (ordem), observações (conservação, cuidados) e, opcionalmente, validade em dias e tempo de preparo. Tela **Ficha de produção** para imprimir ou ler na cozinha, **sem custos**, com os ingredientes na quantidade da receita e um campo "quanto vou fazer" que escala as quantidades (receita base de 1 L, fazer 3 L). Passos com foto ficam para depois. Entra no bloco 8E, logo depois do 8D; a precificação passa para 8F a 8H.
- [ ] Aviso de impacto ("o gorgonzola subiu e o Aureus passou de X para Y") entra com a precificação (8F), que tem o preço de venda para comparar.
- [x] **Bloco 8B concluído** (migração `add_equivalencia_e_perda_limpeza_insumo`): equivalência de unidade e perda de limpeza no insumo, tela **Editar insumo** (antes só havia cadastro), cálculo do custo pelo aproveitamento (limpeza × cocção) e conversão por equivalência. Falta, para a ficha usar o "pump", cadastrar a equivalência do insumo (ex.: fumaça líquida).
- [x] **Bloco 8A concluído:** tela "Itens de compras" em Insumos (`/insumos/vinculos`) liga cada item do fornecedor ao insumo, uma única vez; as compras seguintes já vêm ligadas ao confirmar. Sem migração.

- [ ] Módulo de precificação separado do cadastro de produtos.
- [ ] Impostos de cada insumo visíveis na composição do preço.
- [ ] Rateio dos custos fixos (mão de obra, gás, energia, aluguel, internet, hospedagem, tráfego pago).
- [ ] CMV, markup e margem por produto e por canal, incluindo a comissão dos marketplaces.
- [ ] Simulação de promoções, mostrando se dão lucro ou prejuízo.
- [ ] Revisar e refinar as fichas criadas às pressas para o soft open.

## G09: Financeiro

- [ ] Contas a pagar nascendo das entradas de compra, classificadas pelo destino de cada item.
- [ ] Contas a receber, caixa, fluxo de caixa, conciliação e DRE.
- [ ] O financeiro nasce dos dados da operação, não é um módulo isolado.

## Dashboard

- [ ] Só os indicadores principais do momento: ticket médio do dia e vendas por canal. Os detalhes ficam em módulos acessados a partir dele.
- [ ] Ranking de produtos para orientar promoções e margens.
- [ ] Tela cheia, sem barra de rolagem, adaptada a TV de 32" com touch, computador, tablet e celular.
- [ ] Mostrar a fonte de cada número ao passar o mouse.

## G10: Entrega, integrações e automação

- [ ] Taxa de entrega com as faixas combinadas (0 a 999 m grátis, faixas de 1 em 1 km, máximo de R$ 10). Hoje `core/config/unitConfig.ts` tem só duas faixas fixas (0 a 1 km grátis e 1 a 5 km por R$ 10).
- [ ] Tela de configuração das taxas, com entrega grátis por período (promoção).
- [ ] Fluxo para fora do raio de 5 km (retirada por entregador externo, pagamento antecipado, aviso de responsabilidade).
- [ ] Cardápio online com checkout (PDV online).
- [ ] WhatsApp Business integrado.
- [ ] iFood, 99Food e Keeta pelas APIs oficiais, com o canal e a comissão de cada pedido para auditoria.
- [ ] Gateway de pagamento, impressora e acompanhamento do motoboy.

## G11: Beatriz

- [ ] Atendimento pelo WhatsApp e pelo site, conversando como uma pessoa.
- [ ] Entender como o cliente chama os produtos ("o que tem abacaxi").
- [ ] Acompanhar o pedido até a entrega e pedir feedback depois.
- [ ] Remarketing para clientes recorrentes e para quem parou de comprar, sem parecer telemarketing.
- [ ] Retomar pré-pedidos abandonados.
- [ ] Programa de indicação de um nível só, com link de indicação.
- [ ] Clube de vantagens.

## G12: Homologação e produção

- [ ] S2 a S6 do plano de endurecimento (pedido seguro no servidor, login e perfis, canais sem duplicidade, diagnóstico do legado, upload reforçado e backup testado).
- [ ] Revisar os padrões de pastas e nomes (exemplo: `verificarEmpresa.ts` parece estar fora do lugar).
- [ ] Organizar os arquivos soltos da raiz (`README.md.txt` e `REGRAS_DE_NEGOCIO.md.txt` vazios, `utf8-test.json`, PDFs de teste em `frontend/`), com autorização do Kacius.
- [ ] Limpar os dados de teste antes da produção (inclui o fornecedor de CNPJ 11.222.333/0001-81).
- [ ] Testes de ponta a ponta, auditoria, logs, performance e monitoramento.

## Em avaliação (ainda sem decisão)

- Conferir no código as regras de PDV já implementadas pela outra IA (bloqueio de cobrança, campos obrigatórios, novo endereço) antes de reprogramar qualquer coisa.
