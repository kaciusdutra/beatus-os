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
| **G07** | **Compras e abastecimento** | **Em andamento** |
| G08 | Fichas, preparações e precificação | Parcial (MVP do soft open) |
| G09 | Financeiro | Inicial |
| G10 | Entrega, integrações e automação | Inicial |
| G11 | Beatriz e inteligência | Não iniciada |
| G12 | Homologação e produção | Não iniciada |

O plano de endurecimento S1 a S6 (`docs/PLANO_DE_SPRINTS.md`) corre por cima deste mapa, como caminho crítico para a abertura. A S1 está concluída.

---

## G07: Compras e abastecimento (atual)

Concluído: leitura do QR da NFC-e (v2 e v3), preenchimento automático e fornecedor encontrado pelo CNPJ (commit a24eb8a).

- [ ] Destino de cada item: Insumo, Embalagem, Limpeza e higiene, Expediente, Equipamento e utensílio, Serviço (exige migração).
- [ ] Memória de classificação (descrição + fornecedor → destino) e destino padrão por fornecedor.
- [ ] Ligar o item da entrada ao insumo cadastrado, sem duplicar o insumo (preserva o ID e o histórico de custos).
- [ ] Tela de detalhe da entrada mostrando fornecedor, itens e valores, onde os itens são classificados. Hoje ela mostra o ID interno no topo.
- [ ] Lista de compras: mostrar o nome do fornecedor no lugar do ID.
- [ ] Card "Valor das entradas": não somar as entradas canceladas.
- [ ] Depois de confirmar o QR ou a foto, voltar automaticamente para a tela inicial do módulo.
- [ ] Leitura dos itens pela **foto** do cupom ou da nota (IA), com conferência humana.
- [ ] Importação de **XML** da NF-e.
- [ ] Quando o CNPJ e o certificado digital saírem: baixa automática das NF-e da SEFAZ.
- [ ] Tela de cadastro de fornecedores (hoje só existe a API).
- [ ] Documentação do módulo Compras no fim da G07.

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
