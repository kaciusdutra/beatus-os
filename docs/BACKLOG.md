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
- [x] Regra de pagamento: **cliente novo não paga na entrega** (13/11/2026): `permitirPagamentoNaEntrega` ficou `false` e o servidor recusa pedido sem pagamento aprovado. O benefício só virá com a fidelização. Regra 4.2.
- [x] **Telas Pedidos e Clientes migradas para o banco (G03, sem migração):** consulta de pedidos com filtros e detalhe; clientes com busca, edição de nome, e-mail e nascimento, endereços e últimos pedidos. Regras 13.1 a 13.3.
- [x] **Legado `localStorage` de pedidos e clientes removido** (13/11/2026, decisão H da S5): `pedidoRepository.ts`, `PedidoCard.tsx` e `clienteRepository.ts`.
- [ ] **`modules/pedidos/components/PedidoStatusBadge.tsx` ficou sem uso** (só o `PedidoCard` o usava). Remover com a autorização do Kacius.
- [ ] **Cadastro de cliente fora do PDV** (nome, telefone, CPF, endereço) e **edição de endereços** pela tela Clientes: hoje o cliente novo só entra pelo PDV e os endereços só se consultam.
- [ ] **Fidelização de clientes (próximo bloco, regras 17.1 a 17.4):** (1) **cartão-convite para a embalagem** com um código de campanha, que o cliente do marketplace cita ao pedir direto (WhatsApp) para ganhar o benefício da primeira compra, e o sistema mede quantos vieram do marketplace; (2) cliente recorrente e categorias, calculados dos pedidos reais; (3) **sugestão do melhor benefício** por perfil, pela margem; (4) campanhas com lista de clientes e mensagem pronta; (5) benefícios aplicados aos poucos: pagar na entrega (regra 4.3), desconto em %, brinde, cupom de aniversário. Exige mexer no cálculo de desconto do pedido e provavelmente nova migração. QR code no cartão depende de autorização para uma biblioteca nova.
- [ ] Exceção para cliente recorrente ligada ao clube de vantagens (em espera, desligada).
- [x] **Pix copia e cola nos canais próprios (15/11/2026, migração `add_pix_configuracao_financeira`):** chave configurável, valor calculado no servidor, painel no PDV, confirmação manual e txid no histórico do pedido. Regras 19.1 a 19.6.
- [ ] **QR code do Pix em imagem** (e o QR do cartão-convite da embalagem): a biblioteca `qrcode` já está no projeto (autorizada em 15/11/2026); falta ligar ao painel do Pix e ao cartão-convite. Hoje só o copia e cola.
- [ ] **Link de cartão e confirmação automática do Pix:** exigem um banco ou intermediário de pagamento com API e webhook (credenciais no `.env`); o ponto de encaixe é o status do pagamento do pedido.
- [ ] **Cobrança Pix antes do pedido existir (WhatsApp/Beatriz):** hoje o pedido só é lançado depois de pago; para a Beatriz cobrar e só então lançar, será preciso guardar a cobrança pendente (e, no futuro, um estado "aguardando pagamento").

## G04: Operação do restaurante

- [x] **Horários persistidos, com exceções e calendário (G04 bloco 1, 15/11/2026, migração `add_horarios_de_funcionamento_e_excecoes`):** padrão da rotina (qua e qui 18h–22h, sex e sáb 18h–23h, dom 18h–22h; seg e ter produção), exceções por dia ou período, calendário com feriados nacionais e pendência de feriado em dia de produção, estado da operação vindo do banco e diário no Registro de atividades. Tela em Configurações → Horários. Regras 8.7 a 8.10.
- [x] **Bloco 2 da G04:** checklist persistido e editável (abertura, fechamento e dia de produção), com itens automáticos pelo estoque, validade e temperatura; aviso no Dashboard; estoque do dia na abertura; diário no Registro de atividades. Só avisa, sem bloquear (regras 8.10 a 8.14). Concluído em 15/11/2026.
- [ ] **Feriados estaduais e municipais** (Amazonas, Manaus) já cadastrados no calendário, se o Kacius quiser (hoje ele os cadastra como exceção).
- [ ] **Estado da operação calculado também no servidor** (hoje a tela calcula a cada segundo a partir dos horários que busca a cada minuto): serve a Beatriz (loja fechada) e às integrações.
- [ ] **Remover componentes sem uso da tela antiga de horários** (`OperationScheduleCard`), com autorização.
- [x] Mostrar o estoque atualizado do dia na abertura do sistema (painel "Estoque do dia" no checklist, regra 8.14).
- [x] Diário da operação gravado em logs (Registro de atividades, área Operação).

- [x] **Modo celular com QR (pedido do Kacius em 15/11/2026), implementado:** tela do celular, QR por insumo e por lote, leitor, conferência na abertura e ajustes para amanhã no fechamento (regras 21.1 a 21.7). Falta, fora desta entrega: **hospedagem em https** (para a câmera) e **login e permissões** (S3) antes de abrir o acesso de fora. Texto original do pedido: PWA dentro do mesmo sistema para o checklist, a temperatura e o estoque do dia no celular; **QR por insumo** (abre a ficha do item: saldo, validade, baixa, descarte) **e QR por cartão/lote do quadro** (abre o cartão: conferir, descongelar, descartar), lidos pela câmera. Tudo grava no banco e no Registro de atividades. Pensado para **funcionários futuros**: as telas e rotas já nascem separadas por papel, e as restrições entram com o login e as permissões (S3). Depende de: (1) **hospedagem em HTTPS**, que o cardápio online já exige (a câmera só funciona em HTTPS); (2) **autorização de uma biblioteca de QR** (leitura no iPhone e geração das etiquetas; junta com a etiqueta do lote e o cartão-convite); (3) **login e permissões** antes de abrir o acesso fora do estabelecimento. Etapa 1 (sem dependências): telas do checklist e da temperatura bem usáveis no celular.

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
- [x] **S3 (login e perfis) concluída em 15/11/2026** (regras 22.1 a 22.11): usuário e senha, sessão no banco, matriz de 5 perfis aplicada em todas as telas e rotas, gestão de usuários, primeiro acesso. Ficou para depois: recuperar senha por e-mail, segundo fator, limite de tentativas por endereço (hoje é por usuário), multiempresa e o agendador do iFood no servidor (a consulta automática roda no navegador do administrador, pois as demais contas recebem 403). Na produção: **apagar os usuários de teste e cadastrar os reais**; remover os arquivos legados `currentUser.ts`, `permissionService.ts` e `shared/operador/operador.ts` (aguardam autorização).
- [x] **Estoque e produção, bloco 1 concluído** (migração `add_estoque_producao_registro_fila_impressao`): movimentos de estoque, entrada pela compra (com backfill e estorno ao cancelar), tela Estoque (saldo, mínimo, alerta, valor, contagem, perda, histórico), produção de lotes com rendimento real e custo do lote, Registro de atividades e seletor de operador. Regras da seção 11.
- [x] **Estoque e produção, bloco 2 concluído** (migração `add_kanban_gavetas_validade_etiquetas`): quadro kanban do estoque das preparações (freezer, geladeira, descongelando, cozinha, sobra, descartar), gavetas nomeadas, validade pela temperatura do freezer com prazos editáveis (Portaria CVS 3/2026, a conferir), produção com divisão por gaveta e etiquetas para imprimir (lote congelado, descongelado, sobra, resfriado). Regras 11.9 a 11.12.
- [ ] **Conferir a tabela de validade no texto oficial da CVS 3/2026:** os prazos vieram de uma transcrição na internet; confirmar o art. 44 no PDF oficial e ajustar em Estoque → Gavetas e regras. *(Kacius)*
- [ ] **Medir a temperatura do freezer e a capacidade de cada gaveta** e informar em Estoque → Gavetas e regras (sem a temperatura vale 30 dias). *(Kacius)*
- [x] **QR code na etiqueta (feito junto do modo celular; biblioteca `qrcode` autorizada em 15/11/2026):** Hoje a etiqueta leva o código do lote em texto. *(12/11/2026)*
- [ ] **Impressora térmica de etiquetas:** hoje a etiqueta sai pela impressão do navegador, no tamanho do rolo. Quando a impressora for comprada, ajustar o papel nas configurações dela ou ligar impressão direta. *(12/11/2026)*
- [x] **Baixa por venda a partir da coluna "Na cozinha"** (primeiro a vencer, primeiro a sair): feita com a cozinha. *(12/11/2026)*
- [ ] **Quadro kanban: arrastar e soltar** os cartões (hoje há botões por cartão). *(12/11/2026)*
- [x] **Cozinha concluída (sem migração):** tela `/cozinha` (Novos, Em preparo, Prontos, Em rota), API de status com motivo e devoluções no cancelamento, baixa do estoque ao iniciar o preparo (insumos no saldo; preparações da coluna "Na cozinha", primeiro a vencer), ticket de 80 mm em `/cozinha/ticket/[id]` e fila de impressão `/api/impressao/fila`. Regra 11.6.
- [x] **Ticket automático (feito em 16/11/2026, sem migração):** a tela `/cozinha` tem o botão "Ticket automático" (por computador); ligado, imprime sozinha o ticket de cada pedido novo e marca IMPRESSO. Sem clique só com o Chrome da cozinha aberto com `--kiosk-printing` e a térmica como impressora padrão. Um agente de impressão separado, que leia a fila sem a tela aberta, fica para depois, se for preciso.
- [ ] **Baixa de preparação sem cartão na cozinha:** se a preparação não foi levada à cozinha, a baixa vai para o saldo geral com aviso; avaliar travar o início do preparo.
- [x] **Checklist diário ligado ao estoque e à validade (G04, bloco 2, concluído):** itens de temperatura do freezer e da geladeira (duas vezes ao dia, derivável do Registro de atividades), conferir cartões vencidos ou vencendo no quadro, descer a gaveta do dia seguinte para descongelar, conferir estoque abaixo do mínimo e, no fechamento, pesar a sobra, mover ou descartar e etiquetar. O checklist agora é persistido no banco. *(pedido do Kacius em 12/11/2026)*
- [ ] **Opção de escolha do combo no pedido:** o pedido ainda não guarda qual opção o cliente escolheu, então esses itens não baixam o estoque sozinhos. *(12/11/2026)*
- [ ] **Lote e validade no estoque (primeiro a vencer, primeiro a sair):** hoje o lote de produção guarda a validade, mas o estoque não controla lote por lote. *(12/11/2026)*
- [ ] **Dados de teste do estoque:** os insumos e fichas `[TESTE E]` ficaram inativos; os movimentos continuam no registro (que não se apaga). *(12/11/2026)*
- [ ] **Distância de entrega calculada no servidor:** hoje a distância vem da busca de endereço (simulada) e o servidor calcula a taxa por ela; quando houver geocodificação real, o servidor deve calcular a distância pelas coordenadas do endereço. *(S2, 12/11/2026)*
- [ ] **Autoria do pagamento aprovado:** o servidor aceita o status de pagamento enviado pela tela (o operador aprova no PDV); com o login da S3 (feito), o nome de quem aprovou já vai para o registro e só perfil com PDV lança pedido; falta travar a aprovação do pagamento por perfil. *(S2, 12/11/2026)*
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

- [x] **Fluxo de caixa concluído (bloco 1, migração `add_financeiro_lancamentos_e_pagamento_compra`):** entradas dos pagamentos aprovados dos pedidos, saídas das compras confirmadas por destino, lançamentos avulsos (cancelam, não se apagam), custos fixos previstos no mês e resumo real na tela Financeiro (saiu o número de demonstração). Regras 12.1 a 12.6.
- [x] **Contas a pagar e capital de giro concluídos (bloco 2, migração `add_contas_a_pagar_e_saldo_inicial`):** compra a prazo com parcelas (boleto, duplicata, outro), títulos com vencimento, pagamento (com juros ou desconto) e cancelamento, saldo inicial do caixa, posição, projeção de 30 dias e alertas. Regras 12.2 e 12.7 a 12.10.
- [ ] **Beatriz no capital de giro:** explicar os alertas em linguagem simples e sugerir ajustes (renegociar, antecipar vendas, reforçar o caixa). Depende da `ANTHROPIC_API_KEY` e do módulo de inteligência (G11).
- [ ] **Título a pagar avulso** (aluguel, serviço sem compra): hoje o título só nasce de uma entrada de compra.
- [ ] **Alerta de vencimento fora da tela** (notificação, WhatsApp) quando as integrações existirem.
- [ ] **Projeção com compras futuras e repasse dos marketplaces** (iFood, 99Food, Keeta), quando houver dados.
- [ ] **CMV real, DRE e conciliação:** CMV a partir da baixa de estoque dos pedidos, DRE do mês, conciliação com extrato (marketplaces e banco) e exportação para o contador. Contas a receber dos marketplaces (repasse do iFood, 99Food e Keeta), quando as integrações existirem.
- [ ] **Compras: pagar depois da confirmação** (e dar baixa na data do pagamento) e editar a forma de pagamento de compras já confirmadas.
- [ ] O financeiro nasce dos dados da operação, não é um módulo isolado.

## Dashboard

- [x] **Dashboard real (13/11/2026, sem migração):** indicadores do dia, vendas por canal, mais vendidos em 7 dias, fluxo da operação, avisos do financeiro e do estoque, fonte de cada número ao passar o mouse e tela sem rolagem em 1920×1080. Regras 14.1 a 14.6.
- [x] **Pedido de marketplace e conferência do repasse (13/11/2026, migração `add_marketplace_codigo_externo_e_conferencia`):** lançamento no PDV sem cliente, com código do pedido, cliente fixo por canal, valor esperado e fila de conferência; o repasse conferido entra no caixa. Regras 15.1 a 15.5.
- [x] **Vendas por canal e produto, com margem e etiquetas de promoção e divulgação (13/11/2026, sem migração):** regras 14.7 e 14.8.
- [ ] **Margem sempre disponível na análise:** hoje usa a margem registrada na Precificação (`margemReferencia`); produto sem ela aparece "sem margem registrada". Calcular a margem atual no servidor (hoje a conta fica na tela de Precificação) para a análise não depender do registro.
- [ ] **Produtos sem nenhuma venda no período** como candidatos a divulgação (a análise só vê quem vendeu).
- [ ] **Entrega própria nos pedidos de marketplace** (endereço, distância e taxa), junto do cadastro de clientes e da delimitação da área no iFood.
- [ ] **Desfazer conferência** e conferir **por repasse** (um valor que cobre vários pedidos), se o pedido a pedido ficar trabalhoso.
- [x] **Integração com marketplaces, estrutura pronta (13/11/2026, migração `add_integracao_marketplace_eventos_e_vinculos`):** caixa de entrada de eventos sem repetição, vínculo de itens, aceite automático, cancelamento pela plataforma, consulta a cada 30 s pela Cozinha, avisos no Dashboard e modo simulação. Regras 16.1 a 16.7.
- [ ] **Adaptador do iFood de verdade (G10):** depende de o Kacius criar a conta de desenvolvedor, colocar `IFOOD_CLIENT_ID` e `IFOOD_CLIENT_SECRET` no `.env` e trazer a documentação oficial e um exemplo real de pedido (o portal bloqueou a leitura automática). Inclui a homologação que o iFood exige do integrador e a delimitação da área de entrega.
- [ ] **Adaptadores do 99Food e do Keeta** (o Keeta usa o padrão Open Delivery, parecido com o do iFood).
- [ ] **Agendador no servidor:** hoje a consulta ao iFood só roda com a Cozinha aberta; em produção, um agendador (ou `instrumentation` do Next) precisa consultar a cada 30 s mesmo sem tela aberta.
- [x] **Vínculo automático e correção dos pedidos em Novo ao ligar um item** (13/11/2026). Regras 16.7 e 16.8.
- [x] **Conferência do dia por canal** (Financeiro, 13/11/2026, sem migração). Regras 18.1 a 18.4.
- [ ] **Fechar o dia:** gravar a conferência do dia como fechada (quem fechou e quando) e bloquear mudanças nos pedidos daquele dia, se o Kacius quiser.
- [ ] **Corrigir a baixa de pedidos já em preparo** quando o item é ligado depois: hoje só os pedidos em Novo são corrigidos; os demais teriam de ter a baixa ajustada à mão (contagem).
- [ ] **Conferência do repasse automática** com o extrato/pagamentos da plataforma, quando houver API de financeiro.
- [ ] **Conferir o dashboard em TV de 32" com touch, tablet e celular** (testado em 1920×1080 e em tela estreita).
- [ ] **Avisos de validade no dashboard** (cartões vencidos ou vencendo no quadro do estoque), junto da integração do checklist (G04).

## G10: Entrega, integrações e automação

- [ ] Taxa de entrega com as faixas combinadas (0 a 999 m grátis, faixas de 1 em 1 km, máximo de R$ 10). Hoje `core/config/unitConfig.ts` tem só duas faixas fixas (0 a 1 km grátis e 1 a 5 km por R$ 10).
- [ ] Tela de configuração das taxas, com entrega grátis por período (promoção).
- [ ] Fluxo para fora do raio de 5 km (retirada por entregador externo, pagamento antecipado, aviso de responsabilidade).
- [x] **Site (cardápio online), etapa 1 concluída em 15/11/2026** (regras 23.1 a 23.7): área pública em `/cardapio` com a marca, cardápio real por categoria (preço do canal Site), aberto/fechado pelos horários (relógio de Manaus), carrinho no navegador, páginas Sobre (textos provisórios), API pública só leitura com limite de abuso.
- [x] **Site, etapa 2: checkout, concluído em 15/11/2026 em modo de teste (regras 24.1 a 24.10).** Pix, crédito e débito à vista pelo Mercado Pago, cadastro do cliente com consentimentos, pedido criado só com pagamento aprovado pelo mesmo caminho do PDV. Testado de ponta a ponta com um Mercado Pago simulado. **Falta, para valer de verdade:** (1) as **credenciais** de teste e depois as de produção (CNPJ em revisão) e o teste real no sandbox (os campos da preferência e o webhook foram conferidos pela documentação e por simulação, não com o Mercado Pago de verdade); (2) a **entrega real** (hoje simulada, 4 endereços de teste), que vale para o PDV e para o site; (3) a **política de privacidade** com os dados da empresa e revisão jurídica; (4) captcha e antifraude no checkout público antes de abrir ao público; (5) um agendador que expire checkouts e reconcilie pagamentos mesmo sem ninguém abrir a página. Texto original da etapa: Cadastro do cliente pelo telefone com todos os dados (nome, CPF, e-mail, **data de nascimento**) e **consentimento LGPD**; endereço e entrega (precisa decidir como calcular a distância: mapa externo ou faixas por bairro/CEP); Pix; o pedido entra no sistema com canal "cardápio online" **aguardando o pagamento** (regra 4.1), recalculado no servidor (S2); rota pública de escrita com limite, validação rígida e proteção contra robô. Provável migração.
- [x] **Aviso de pedido novo na Cozinha (aceite automático), concluído em 15/11/2026** (regras 25.1 a 25.5): faixa, destaque, som e contador no título; consulta a cada 5 segundos.
- [x] **Forma de pagamento visível nos pedidos de todos os canais, concluído em 15/11/2026** (regra 25.5). Falta, se o Kacius quiser: filtro por forma de pagamento na lista e o resumo por forma dentro da Conferência do dia.
- [ ] **Beatriz completa (vendedora, caixa e relacionamento), em fases** *(visão do Kacius em 15/11/2026, regras 26.1 a 26.7)*: **fase 1 e fase 2 (2a etapas no site, 2b fila de avisos gravada) feitas em 15/11/2026**; **fase 3a (envio dos avisos pela API da Meta, com repetição e motivo da falha) feita em 16/11/2026, falta ligar a conta da Meta e testar com mensagens de verdade** (`docs/WHATSAPP_AVISOS.md`); falta o resto da fase 3 (receber mensagens, conversa, memória do cliente, passagem para uma pessoa). Plano original: **fase 1** link de pagamento com a origem WhatsApp (item abaixo); **fase 2** fila de avisos do pedido (em preparo, a caminho, entregue), nascida das mudanças de situação da Cozinha, e a página do pedido no site mostrando as etapas (não depende do WhatsApp); **fase 3** integração com o WhatsApp (API oficial da Meta, coexistência no número dedicado; entrada e saída de mensagens; conversa e memória por cliente; passagem para uma pessoa; precisa de tabelas de conversa e mensagem); **fase 4** Beatriz no chat do site; **fase 5** pós-venda e clube (pesquisa de satisfação depois da entrega, aniversário, reativação, campanhas com limite de frequência e saída por PARAR). Dependências: CNPJ e verificação da empresa na Meta; modelos de mensagem aprovados para o que a empresa inicia fora da janela de 24 horas; consentimento de marketing já registrado no checkout.
- [ ] **Marketing e tráfego pago dentro do sistema** *(pedido do Kacius em 15/11/2026, regras 27.1 a 27.7)*: campanhas para o clube, para quem vai entrar e para a área de entrega, com criativos e subida conectados à Meta, medindo o retorno com os pedidos reais; o pagamento dos anúncios fica por fora. **Avaliação: depois, em etapas.** **Etapa 1 feita em 16/11/2026: origem da campanha (UTM) guardada no pedido do site e do WhatsApp (migração `add_origem_campanha_pedido`)**; falta testar o pedido pago de ponta a ponta com o Mercado Pago. Depois do WhatsApp (fase 3) e do CNPJ regular: exportar o público do clube com hash, medição de retorno, integração com a API de Marketing e a API de Conversões, criativos com IA e painel. Depende de CNPJ regular, verificação da empresa na Meta, fotos de produtos, base do clube com consentimento e política de privacidade revisada.
- [x] **WhatsApp: link de pagamento com o carrinho da Beatriz (feito em 15/11/2026; falta testar com o Mercado Pago de verdade)** (regra 25.6): link do site já com os itens e a origem WhatsApp (o servidor refaz o preço pelo canal), botão "Gerar link de pagamento" na tela da Beatriz; aprovado, o pedido entra sozinho. A mensagem em si segue manual até a integração com o WhatsApp existir.
- [ ] **Sem caixa humano: pagamento automático em todos os canais** *(pedido do Kacius em 15/11/2026)*: (1) **WhatsApp/Beatriz**: a Beatriz anota o pedido, manda o **link de pagamento** (Pix ou cartão) e, aprovado, o pedido entra sozinho na cozinha, reaproveitando o fluxo do checkout do site com o canal WhatsApp; (2) **PDV**: gerar o Pix pelo Mercado Pago com confirmação automática no lugar do "Pagamento recebido" manual; (3) o pedido que nasce no WhatsApp sem conferência humana precisa das mesmas travas do site (itens e preço conferidos pelo servidor, casos sensíveis para uma pessoa).
- [x] **Impressão automática do ticket da cozinha:** feita pela tela da cozinha (ver o item acima). Falta testar com a impressora térmica de verdade e o Chrome em `--kiosk-printing`.
- [ ] **Aceite manual opcional:** configuração "aceite automático / manual" para lojas com uma pessoa que aceita antes de produzir (padrão: automático). Exige um estado novo no pedido ("aguardando aceite") e regras de tempo limite.
- [ ] **Limpar a fila de "Novos" de testes antigos** (há pedidos de 13/11 parados na Cozinha, de testes): cancelar com autorização do Kacius.
- [ ] **Área do cliente, clube de vantagens e Beatriz nos dois canais** *(pedido do Kacius em 15/11/2026)*: cliente entra com **código enviado pelo WhatsApp** (sem senha), vê o cadastro, o histórico e a evolução no clube de vantagens; já entra no clube no primeiro pedido; a Beatriz avisa pelo número de contato que ali ele acompanha a evolução; a Beatriz conversa no WhatsApp e no chat do site e o cliente escolhe por onde. Número dedicado já existe: usar a **coexistência** do WhatsApp (app + API no mesmo número). Reduzir custo: o cliente puxa a conversa (link no cartão-convite), avisos pela tela do site, modelo menor da IA, respostas fixas sem IA e teto diário.
- [ ] **Site, etapa 3: promoções e cupons** ligados ao cálculo do pedido e à fidelização (regras 17).
- [ ] **Site, etapa 4: fotos dos produtos e mural "Marcaram o Beatus".** Foto exige um lugar para guardar arquivos (depende da hospedagem) ou campo no banco; o mural hoje é por curadoria manual (`modules/site/conteudo/midias.ts`); automático depende da API da Meta. O Kacius envia as fotos dos burgers.
- [ ] **Site: textos finais** (história, missão, valores, objetivo, chamada) no lugar dos provisórios, e o perfil das redes no rodapé. *(Kacius)*
- [ ] **Site: no dia da hospedagem**, apontar o domínio para o `/cardapio`, conferir o fuso do servidor (o "aberto agora" já usa Manaus, mas o estado da operação do sistema usa o relógio do servidor) e revisar o limite de abuso se houver mais de um servidor.
- [ ] WhatsApp Business integrado.
- [ ] iFood, 99Food e Keeta pelas APIs oficiais, com o canal e a comissão de cada pedido para auditoria.
- [ ] Gateway de pagamento, impressora e acompanhamento do motoboy.

## G11: Beatriz

- [x] **Núcleo da Beatriz (15/11/2026, sem migração):** a IA entende o cliente e anota o pedido; o sistema confere cada item com o cardápio, calcula os valores e nunca deixa a IA citar preço; casos sensíveis vão para uma pessoa; tela de teste em Inteligência → Beatriz. Regras 20.1 a 20.8. **Ainda não testado com a IA de verdade**, porque falta a `ANTHROPIC_API_KEY` no `.env`; os testes automáticos usam um modelo de mentira.
- [ ] **Testar a Beatriz com a IA de verdade** quando a chave existir: conversas reais de cardápio, adicionais, observações, "o que tem abacaxi", e ajustar as instruções. Medir o custo por conversa e decidir o modelo (Sonnet ou Haiku).
- [ ] **WhatsApp (Meta WhatsApp Business Platform):** receber e enviar mensagens, guardar as conversas (precisa de tabelas e migração), identificar o cliente pelo telefone e chamar uma pessoa quando a Beatriz marcar "precisa de humano". Começa no **modo assistido**. Depende do número dedicado e da verificação da empresa na Meta.
- [ ] **Beatriz cobra o Pix e só então lança o pedido:** hoje o pedido só existe depois de pago; precisa guardar a cobrança pendente (e talvez um estado "aguardando pagamento"). Junto: **endereço → distância → taxa de entrega** feitos pela Beatriz, e o aviso de loja fechada e horário de funcionamento.
- [ ] **Enviar o rascunho da Beatriz para o PDV** (itens, nome e endereço já preenchidos), para a equipe só conferir e lançar.
- [ ] **Beatriz no site (cardápio online):** reaproveita o mesmo núcleo.
- [ ] **Beatriz aplica o benefício da fidelização e o código de campanha** (regra 17).
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

- [ ] **Identidade visual da marca (manual enviado em 15/11/2026, `docs/IDENTIDADE_VISUAL.md`):** feitos o símbolo em vetor, o ícone do app, o topo do menu e o item ativo em dourado. O laranja das telas já foi trocado pelo dourado (15/11/2026). As fontes Gelion (títulos) e Satoshi (textos) também foram aplicadas, fora do Git. Falta: **conferir a licença das fontes para uso na web e colocá-las na hospedagem**, aplicar a marca em etiquetas, comprovantes, cartão-convite e cardápio online, e obter o logotipo original em SVG ou PNG transparente.

## Em avaliação (ainda sem decisão)

- Conferir no código as regras de PDV já implementadas pela outra IA (bloqueio de cobrança, campos obrigatórios, novo endereço) antes de reprogramar qualquer coisa.
