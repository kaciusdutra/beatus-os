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

O plano de endurecimento S1 a S6 (`docs/PLANO_DE_SPRINTS.md`) corre por cima deste mapa, como caminho crítico para a abertura. A S1 está concluída. A S5 (diagnóstico do legado, `docs/DIAGNOSTICO_LEGADO.md`) está escrita e aguarda a aprovação do Kacius; as decisões e o que migrar ou remover estão lá.

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

- [ ] Fila de produção com prioridades, tempos e capacidade (45 burgers por dia: capacidade planejada e restante).
- [ ] Estoque com movimentação real: entradas, saídas, saldo, lote, validade, inventário, perdas e ajustes.
- [ ] Estoque em formato kanban.
- [ ] Estimativa do que preparar no dia, com percentual por preparação entre o mínimo e o máximo (10 a 45 burgers), aprendendo com o histórico.
- [ ] Lista de compras diária gerada pelo sistema (o que repor de insumos e de preparações).
- [ ] Estoque, financeiro, produção, receitas e ingredientes ainda **não têm tabela no banco** (são legado em memória ou localStorage). Ver a S5.

## G08: Fichas, preparações e precificação

- [ ] **Custo automático do insumo pela última compra** (regra 7.12, decisão de 12/11/2026): ao confirmar a entrada, o custo do insumo passa a ser o último preço por unidade de medida (quilo etc.), e as fichas são recalculadas. A definir na sprint: conversão de unidades (a nota pode vir por "manta" ou "caixa" sem o peso: o peso real seria informado na entrada); se o desconto do item entra no preço; o que acontece com o custo quando a entrada é cancelada (volta ao preço da compra anterior); histórico de preços do insumo para ver a variação; frete e impostos da nota (hoje só aviso, regra 9.20).
- [ ] Custo da porção pela gramatura (preço do quilo × peso da porção), com a perda de cada insumo (regra 7.5).
- [ ] Ligar os itens de compra (pela chave do item do fornecedor) ao insumo cadastrado, sem duplicar o insumo, para que a ficha use o custo real da compra. Os campos `insumoId` já existem no item da entrada e na memória de classificação, vazios (decisão de 06/11/2026).

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
