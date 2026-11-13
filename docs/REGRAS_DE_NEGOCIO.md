# Beatus OS: Regras de Negócio

> Decisões tomadas pelo Kacius (responsável pelo negócio). Pelo AGENTS.md, estas regras **não podem ser alteradas sem autorização explícita**, mesmo que outra abordagem pareça tecnicamente melhor.
>
> Fonte: conversas com a outra IA (agosto a outubro de 2026) e com o Claude (outubro e novembro de 2026). Última revisão: 04/11/2026.
>
> Quando surgir uma dúvida nova, paramos e avaliamos se ela entra agora ou espera. Se entrar, a regra é registrada aqui.

---

## 1. Princípios gerais

1. O Beatus é o primeiro cliente do Beatus OS. O sistema é validado em produção real no Beatus e, depois, poderá ser vendido para outros negócios de gastronomia.
2. O produto vendido não muda a estrutura: o sistema deve servir para hamburgueria, pizzaria, restaurante, doceria etc.
3. Não deixar o sistema amarrado: regras e recursos para a expansão já podem ser programados, ficando **em espera** até serem ativados.
4. Decisões estratégicas ficam na aplicação (serviços e regras de domínio), não no banco de dados.
5. IDs nunca são apagados nem reaproveitados. Eles são a base de relatórios e auditorias. O que compõe um registro pode mudar; o registro permanece.
6. Na abertura, o sistema roda apenas no computador da loja.
7. Multiempresa: o `empresaId` já existe para facilitar futuras unidades e marcas. Uma futura dark kitchen (várias marcas na mesma cozinha) exigirá ajustes para que o PDV de uma empresa não interfira no da outra. Isso não é prioridade agora.

## 2. Clientes

1. O **telefone** é a chave operacional: é por ele que o sistema e a Beatriz reconhecem o cliente.
2. O **CPF** é obrigatório no cadastro (questões fiscais e identidade permanente).
   - Se o cliente usar outro número e informar um CPF já cadastrado, o sistema reconhece o cliente e pergunta se ele quer **trocar** ou **acrescentar** o número. Se ele não quiser nenhum dos dois, o atendimento segue normalmente.
3. A data de aniversário é opcional. Se o cliente não informar no cadastro, a Beatriz pergunta em outro momento.
4. Clientes que vierem dos marketplaces (iFood e outros) entram no cadastro do Beatus. O objetivo é trazê-los para os canais próprios (WhatsApp e cardápio online).
5. O cliente tem um endereço principal e pode cadastrar outros endereços de entrega sem substituir o principal.

## 3. PDV, canais e pedidos

1. O **PDV é a porta única** de todos os pedidos, de qualquer canal. Ele vem logo depois do Dashboard na hierarquia do sistema.
2. Canais de venda: WhatsApp, cardápio online (site), iFood, 99Food e Keeta.
   - **Não haverá canal de telefone**: o número do Beatus é só o do WhatsApp Business, atendido pela Beatriz.
   - O checkout do cardápio online funciona como um "PDV online", com a mesma estrutura: telefone como chave; se o cliente não for cadastrado, o cadastro é feito durante o checkout.
3. Todo pedido guarda o **canal de origem**, para calcular as taxas de cada canal e saber qual canal vende melhor.
4. Pedido **eletrônico** (WhatsApp, online, marketplace): os campos chegam preenchidos e a cobrança fica **bloqueada** no PDV.
   Pedido **manual**: a cobrança fica habilitada e todos os campos são obrigatórios.
5. O pedido só vai para a fila da cozinha depois do **pagamento aprovado**. Depois disso, ele avança de forma manual: Novo, Em preparo, Pronto e Em rota.
6. Se o cliente pedir um acréscimo depois de fechar o pedido (pelo WhatsApp ou online) e o pedido ainda estiver em produção, o acréscimo entra no pedido e é pago à parte.
7. **Retirada no balcão:** o PDV é desenvolvido como se ela existisse, mas fica **desligada** no início (a operação começa em uma garagem da família, sem atendimento no balcão).
8. **Pedido seguro no servidor (sprint S2):** a tela (ou um canal externo) só informa o que o cliente escolheu: produtos, quantidades, adicionais, endereço, distância e pagamento. O **servidor** calcula o preço de cada item, o subtotal, a taxa de entrega (pela distância e pelas faixas da regra 5), o total, o número do pedido e as datas; qualquer valor desses enviado pelo navegador é ignorado. O **preço vem da Precificação** (regra 6.6), por canal: WhatsApp usa o preço do WhatsApp ou, se não houver, o do site; PDV e cardápio online usam o preço do site; iFood, 99Food e Keeta usam só o preço do próprio canal. Produto sem preço no canal não aparece no PDV e é recusado pelo servidor. O preço de cada item fica gravado no pedido; mudar o preço depois não altera pedidos antigos. O número do pedido é sequencial por empresa e nunca se repete, mesmo com pedidos simultâneos. O pedido só entra na operação com pagamento aprovado ou para pagar na entrega (regra 4). O adicional é um produto da categoria ADICIONAL, com preço próprio, e vira uma linha do pedido. *(12/11/2026)*

## 4. Pagamento

1. O pagamento é **sempre antecipado**. O pedido só é liberado depois do pagamento creditado, como no iFood.
2. **Cliente novo não paga na entrega.**
3. Exceção futura, **em espera**: permitir pagamento na entrega para cliente recorrente, ligada ao clube de vantagens.
4. Nos canais próprios, o pagamento é por Pix (QR Code e copia e cola) e por link de cartão.
5. Taxas de pagamento (Pix, transferência, cartão) e impostos vão **embutidos no preço**, seja qual for a forma de pagamento. Os pagamentos por Pix compensam os pagos no crédito.

## 5. Entrega

1. Raio máximo de **5 km**, medido em **linha reta** a partir da loja (Rua Afrânio de Castro, 699, Japiim, Manaus).
2. Taxas por faixa:

   | Faixa | Taxa |
   |---|---|
   | 0 a 999 m | Grátis |
   | 1 a 2 km | A definir |
   | 2 a 3 km | A definir |
   | 3 a 4 km | A definir |
   | 4 a 5 km | R$ 10,00 (taxa máxima) |

3. Os valores são definidos em uma **tela de configuração**, que também permite deixar a entrega grátis por um período (promoção).
4. Com frota própria e nos marketplaces, as taxas serão ajustadas dentro de cada canal.
5. O Beatus **não fica com a taxa de entrega**: ela é repassada ao entregador.
6. No início não há entregador próprio: a operação usa o plano de entrega do iFood.
7. O endereço pode ser localizado pelo CEP ou, se o cliente não souber o CEP, pelo nome da rua.
8. **Acima de 5 km:** não há entrega nem preço fixo (no iFood a loja nem aparece). Nos canais próprios, o cliente é avisado do limite. Se ele insistir, o caso é analisado um a um:
   - A entrega é feita por um app de entrega escolhido pelo cliente.
   - O pedido é tratado como retirada por entregador externo: sem taxa de entrega e com pagamento antecipado.
   - O cliente é avisado de que tem responsabilidade total pelo pedido a partir da retirada.

## 6. Cardápio, produtos e adicionais

1. Cardápio inicial com 5 burgers autorais: Virtus, Agnus, Ignis, Aureus e Sanctum. A marca é premium (azul-marinho e dourado, nomes em latim; lema "Feito para poucos").
2. **Adicionais:** só é permitido acrescentar ingredientes que **já fazem parte** daquele burger. O cliente não monta a própria receita.
   - O adicional é um produto com código e preço próprios (uma porção extra), diferente da quantidade que já vai na receita.
3. **Não substituímos ingredientes:** o cliente pode tirar ou acrescentar. Tirar um ingrediente não altera o preço.
   - Exceção: o burger de frango pode ser pedido com o blend de carne da casa.
4. O PDV mostra só produtos acabados (burgers, acompanhamentos, sobremesas e bebidas), com a foto do produto, que também aparece no cardápio online.
5. Produto **nunca é apagado**: ele sai do PDV ou do cardápio, mas receitas, fichas, precificação e histórico continuam intactos.
6. O preço de venda vem do **módulo de precificação**, não do cadastro do produto. A tabela de produtos não guarda os insumos: a separação é obrigatória.
7. Preço de referência: Agnus a R$ 44,90 na venda direta (site e WhatsApp).

## 7. Fichas técnicas e precificação

1. Uma ficha técnica pode conter outras fichas (exemplo: béchamel, depois molho de gorgonzola, depois burger).
2. A ficha é alimentada pelo **custo atual do insumo**. Quando uma nova compra muda o preço do insumo, o custo da ficha é recalculado; as quantidades da receita não mudam.
3. Mudar o preço do insumo **não altera automaticamente o preço de venda**: a decisão de preço é do Kacius.
4. A gramatura de cada item da ficha é editável, com recálculo do custo.
5. A ficha considera o percentual de perda de cada insumo. **O custo é dividido pelo aproveitamento** (100% menos a perda): com 20% de perda aproveita-se 80%, então o custo do que vai ao prato é o preço ÷ 0,80, ou seja, 25% a mais, e não 20%. A perda é sempre repassada ao preço de venda. *(decisão de 12/11/2026; a fórmula atual, que soma a perda, é trocada no bloco 8D)*
6. O custo do produto inclui o rateio dos custos fixos: mão de obra, gás, energia, aluguel (R$ 1.500 de referência, contado pelo mês inteiro mesmo nos dias fechados), internet, hospedagem do site e tráfego pago.
7. O sistema deve mostrar CMV, DRE, markup e margem.
8. Os impostos de cada insumo devem ficar visíveis, para compor um preço justo.
9. Promoções só depois de analisar a margem. O sistema deve mostrar se uma promoção dá lucro ou prejuízo.
10. A precificação conversa com o financeiro e considera a margem dos marketplaces.
11. **iFood:** comissão de cerca de 25,2% mais R$ 150 por mês, tratada como custo de aquisição de clientes.
12. **Custo do insumo = último preço pago por unidade de medida** (exemplo: o preço do quilo do bacon na última compra confirmada), seja ele maior ou menor que o anterior. A atualização é **automática** quando a entrada de compra é confirmada, e as fichas são recalculadas. O que importa é o preço do quilo, não o preço da peça: a manta de bacon pode variar de peso, mas o quilo é a base. O custo da porção é o preço do quilo vezes o peso da porção em quilos (exemplo: R$ 40,00 o quilo e porção de 30 g = R$ 1,20), considerando o percentual de perda da regra 5. *(decisão de 12/11/2026; fica para a G08)*
13. **Vínculo item da compra → insumo:** feito uma única vez, na tela "Itens de compras sem insumo" (módulo Insumos), pela chave do item do fornecedor (regra 9.13), e lembrado para as próximas compras. A entrada de compra continua pedindo só o destino. Ao ligar, o custo do insumo passa a valer pela compra confirmada mais recente desse item. *(12/11/2026)*
14. **Unidades e peso:** quando a unidade da nota se converte na do insumo (kg e g, L e ml), a conversão é automática. Quando não se converte (manta, caixa, pacote), a quantidade real na unidade do insumo é informada na entrada (exemplo: o peso em kg das mantas), e o fator fixo (exemplo: 1 caixa = 12 unidades) é lembrado por fornecedor e item. *(12/11/2026)*
15. **O que entra no preço:** o preço líquido do item (já com o desconto do item). O frete da nota entra rateado por valor (regra 7.25, implementada no bloco 8F) e os impostos ficam de fora do custo (regra 9.20). *(12/11/2026, atualizada no 8F)*
16. **Cancelar a entrada devolve o custo** do insumo ao preço da compra anterior, por meio de um histórico de preços do insumo, que também mostra a variação. *(12/11/2026)*
17. **Equivalência de unidade e perdas no insumo (bloco 8B):** cada insumo pode ter uma **equivalência** ("1 pct = 6 un", "1 maço = 150 g", "1 frasco = 300 pump") para a ficha usar a unidade que quiser, e uma **perda de limpeza** em % (casca, osso, aparas; vale em qualquer ficha). A **perda de cocção** é do item da ficha. O custo é dividido pelo aproveitamento combinado: (1 − limpeza) × (1 − cocção). Os dois campos de perda são opcionais e começam em 0. *(12/11/2026)*
18. **Fichas técnicas (bloco 8D):** a ficha é **digitada pelo Kacius** (quantidades e gramaturas), nunca carregada de conversas. Há dois tipos: **preparação** (blend, béchamel, molhos, maioneses; tem rendimento, que se corrige depois de pesar, e custo por grama) e **produto** (Agnus, combos; um produto tem uma única ficha). Uma ficha usa **insumos e outras fichas** (ficha dentro de ficha); a preparação não usa ficha de produto; um **combo** é um produto cuja ficha usa outros produtos. Ao usar outra ficha, a quantidade pode estar em outra unidade da mesma família (0,16 kg de uma ficha que rende em g). O custo é **sempre calculado na leitura**, com o custo atual dos insumos, e nunca fica gravado. Ficha **não se exclui, só se inativa**. O produto novo nasce com preço 0: o preço de venda vem da precificação (regra 6.6). *(12/11/2026)*
20. **Perda no preparo:** numa preparação, o **rendimento pesado** depois de pronta já inclui a perda de cocção ou de preparo (exemplo: 1.000 g de bacon cru que rendem 600 g fritos = 40% de perda). A ficha mostra essa perda calculada (soma dos ingredientes menos o rendimento) e o custo por unidade já a considera; por isso **não se repete a perda nos itens da mesma preparação**. A perda por item serve para o item usado direto na ficha de um produto. Uma preparação reutilizável (bacon frito) pode ser a base de outras (geleia de bacon, burger). *(12/11/2026)*
21. **Ficha de produção (bloco 8E):** é a tela que o funcionário lê na cozinha e imprime. **Nunca mostra custo nem preço.** Traz os ingredientes (na ordem da ficha), o modo de preparo (preparações), a montagem (produtos), as observações, o tempo de preparo, a validade e a porção padrão. O campo "quanto vou fazer" **multiplica as quantidades** (receita base de 1 L, fazer 3 L; produto para N unidades). Item que é outra ficha tem link "Ver como fazer", já com a quantidade necessária. Os passos são texto livre, um por linha, e a tela numera. Quando houver login (S3), esta será a tela do perfil do funcionário. *(12/11/2026)*
22. **Porção padrão** de uma preparação (ex.: 30 g de molho por burger): opcional; a lista de fichas mostra o custo da porção. *(12/11/2026)*
23. **Custo automático pela compra (bloco 8C):** ao confirmar a entrada, cada item ligado a um insumo (regra 7.13) define o custo do insumo: valor do item (já com o desconto do item) dividido pela quantidade convertida para a unidade de compra do insumo, direto (kg e g, L e ml) ou pela equivalência do insumo. O frete da nota entra rateado por valor entre os itens (regra 7.25) e os impostos ficam fora. A conversão fica gravada no item da entrada (servirá ao estoque) e cada compra entra no **histórico de preços** do insumo. Vale a compra de **data mais recente** (data do documento, ou da entrada se não houver): confirmar uma compra mais antiga não muda o custo. Se a unidade do item não converte, a entrada confirma, o custo não muda e aparece um aviso pedindo a equivalência. Ao **cancelar** a entrada, o custo volta para a última compra que sobrou, ou ao custo de antes da primeira compra automática. O botão **Recalcular custos das compras** (Itens de compras) aplica as entradas já confirmadas, da mais antiga para a mais nova, sem refazer o que já tem histórico. *(12/11/2026)*
24. **Quantidade real na entrada (regra 7.14 na prática):** em cada item com destino Insumo ou Embalagem, a entrada em rascunho aceita a **quantidade real** com unidade (exemplo: 3 mantas = 6,8 kg). Ela tem prioridade no custo (R$ 680 por 6,8 kg = R$ 100 o quilo). A opção **Lembrar como fixo** guarda o fator por fornecedor e item (exemplo: 1 cx = 12 un) e vale nas próximas compras sem digitar de novo; para itens de peso variável (a manta de bacon) não se marca, e o peso é informado a cada compra. Ordem no cálculo: quantidade real, fator lembrado, conversão direta (kg e g, L e ml) ou equivalência do insumo, e por fim o aviso sem mudar o custo. A quantidade real só é editada com a entrada em **rascunho**; para corrigir uma entrada confirmada, cancela-se e lança-se de novo. *(12/11/2026)*
25. **Frete e impostos no custo (decisão de 12/11/2026, implementada no bloco 8F: o frete entra no custo e os impostos são guardados por tipo, à parte):** o frete da nota passa a entrar no custo, **rateado entre os itens por valor** (cada item leva a parte proporcional ao seu valor líquido). Os impostos e outras despesas da nota **não entram no custo**: ficam visíveis à parte, para compor o preço (regra 7.8). Isto substitui a exclusão de frete da regra 7.15.
26. **Custos fixos e rateio por pedido (bloco 8F, regra 7.6 na prática):** a tela **Custos fixos** (Financeiro → Custos fixos) cadastra cada custo do mês com valor mensal e vigência (início e fim opcional); o aluguel conta o mês inteiro. O custo fixo nunca é apagado, só inativado. O total do mês soma os custos ativos e vigentes. O **custo fixo por pedido** é o total do mês dividido pela **estimativa de pedidos por mês** que o Kacius informa; quando houver pedidos reais suficientes, a base passa a vir deles. Esse valor entra na precificação no bloco 8G. *(12/11/2026)*
27. **Precificação (bloco 8G):** a tela **Precificação** (Financeiro → Precificação) parte do custo das fichas de produto, com os insumos atuais. Custo total de um produto = custo da ficha (com a embalagem do produto) + (embalagem do pedido + custo fixo por pedido + taxa mensal do canal por pedido) ÷ produtos por pedido. **A margem é líquida**: lucro sobre o preço de venda, depois de todos os custos, da comissão do canal, do imposto e da taxa de pagamento (embutidos no preço, regra 4.5). Preço para uma margem = custo total ÷ (1 − comissão − imposto − taxa de pagamento − margem). A tela mostra os preços de **20, 25, 30 e 35%** de margem (configurável), arredondados para cima até o final ,90, e a margem, o CMV e o markup (sobre o custo da ficha) do **preço praticado**, que o Kacius digita por produto e canal; digitar um preço mostra a margem na hora (também para promoções). Abaixo da **margem mínima** (20%) o preço aparece como promoção, e abaixo de zero como prejuízo. Os canais são WhatsApp, site, iFood, 99Food e Keeta, cada um com comissão, taxa mensal e pedidos por mês. O PDV não usa esses preços ainda: continua no preço do cadastro do produto até a migração do PDV. A estratégia do iFood (baixar a margem para entrar com certo custo, sem pulverizar os preços e sem prejuízo) será revista em outra conversa. *(12/11/2026)*
28. **Promoções, combos e aviso de impacto (bloco 8H):** o **simulador de promoção** (Financeiro → Precificação) aplica um desconto em % ou um preço promocional ao preço praticado de um produto e mostra, por canal, o preço, a margem, o lucro por pedido, o **volume de pedidos a mais** necessário para o lucro total igualar o do preço normal ("nenhum volume compensa" quando a promoção não dá lucro) e a situação (dentro da meta, abaixo da mínima, prejuízo). Nada é gravado. Para um **combo** (produto cuja ficha usa outros produtos), a tela mostra a economia do cliente: soma dos preços avulsos menos o preço do combo, no mesmo canal. O **aviso de impacto** aparece no topo da tela quando o custo total de um produto subiu **5% ou mais** desde que o preço foi fixado, ou a margem ficou abaixo da mínima (a menos que o preço já tenha sido fixado abaixo da mínima, uma promoção conhecida, e o custo não tenha subido), ou o preço dá prejuízo. O botão **Aceitar novo custo** guarda o custo e a margem de agora como nova referência. O preço nunca muda sozinho (regra 7.3). *(12/11/2026)*
29. **Combos como produto principal (bloco 8I):** na ficha de um produto, itens com o **mesmo nome de grupo de escolha** (exemplo: "acompanhamento") são opções que o cliente escolhe; o **custo do combo usa a opção mais cara** (pior caso), e as outras não entram no custo. Na Precificação, para um combo, a tela mostra: a economia do cliente contra os itens avulsos (uma opção por grupo, a de maior custo), o **desconto máximo** que mantém a margem mínima (e o preço mínimo do combo) e a **margem do combo contra a dos mesmos itens vendidos separados**. Há uma **meta de CMV** (referência de mercado: ingredientes até 35% do preço, padrão 35%): o CMV acima da meta aparece em destaque. Cada canal tem seu próprio preço de combo, então o combo do iFood pode absorver a comissão sem subir o preço do burger avulso. A taxa de combo (percentual de pedidos com combo) fica para o dashboard, quando houver pedidos reais. *(12/11/2026, a partir de conteúdo sobre hamburgueria que o Kacius compartilhou)*
19. **Embalagem na ficha do produto:** os insumos da categoria **Embalagens** usados como item aparecem num bloco próprio ("Embalagem do produto"), com os subtotais "custo da receita" e "custo com embalagem". A embalagem do **pedido** (sacola, guardanapo, sachê) entra na precificação, não na ficha. *(12/11/2026)*

## 8. Operação

1. Capacidade de produção no início: **10 a 45 burgers por noite**, com o Kacius e o irmão, em **5 dias de venda por semana**. O sistema deve estar sempre preparado para o teto de 45.
2. **Checklist diário** obrigatório na chegada (o funcionário "bate o ponto", se arruma e faz o checklist). Ao concluir, há um botão "Concluído".
3. Para o usuário comum de produção, o sistema só libera a operação **no horário de abertura**. O administrador pode usar todos os módulos a qualquer hora.
4. No horário de abertura, a tela vai **automaticamente** para o dashboard.
5. Os horários são cadastrados uma vez, com exceções (abrir mais cedo, fechar mais tarde) por dia, semana ou mês. A tela fica no módulo de **Configurações**.
6. Estados da operação: Aguardando abertura, Operando, Fechamento e Fechada.

## 9. Compras

1. A entrada de compra pode vir de **QR Code da NFC-e, foto, XML ou digitação**. A digitação é o último recurso.
2. Na entrada, o sistema verifica se o fornecedor e o insumo já existem, para não cadastrar em duplicidade.
3. Fornecedor pode ser cadastrado por CNPJ ou por CPF (pequeno fornecedor informal).
4. Fornecedor informal entra com **recibo** identificando os insumos comprados.
5. O documento original (foto, PDF, XML) é sempre guardado, organizado por empresa, ano e mês. O banco guarda só a referência ao arquivo.
6. Cada item da entrada tem um **destino**:

   | Destino | Exemplos | Para onde vai |
   |---|---|---|
   | Insumo | carne, pão, queijo, molhos | Estoque, fichas técnicas, custo e produção |
   | Embalagem | caixas, sacos, guardanapos, sachês | Estoque e custo do pedido |
   | Limpeza e higiene | detergente, álcool, luvas | Estoque de consumo e despesa operacional |
   | Expediente | papel, bobina da impressora, caneta | Despesa administrativa |
   | Equipamento e utensílio | chapa, freezer, espátula | Patrimônio |
   | Serviço | gás, manutenção, frete | Despesa, sem estoque |

   Todas as entradas vão para o financeiro, classificadas pelo destino. Se surgirem novos destinos, a lista será ajustada.
7. Quando o CNPJ e o certificado digital do Beatus estiverem prontos, as NF-e emitidas para o CNPJ serão baixadas automaticamente da SEFAZ (XML).
8. A entrada só pode ser **confirmada** quando todos os itens tiverem destino. *(04/11/2026)*
9. Na entrada da nota, cada item recebe **só o destino**. A ligação com o insumo cadastrado (usado nas fichas técnicas e receitas) é feita depois, no módulo de fichas, para que a tela de compras não dependa da lista de insumos, que muda com o cardápio. Embalagens seguem a mesma regra. *(revisada em 06/11/2026; antes exigia o insumo ligado)*
10. A classificação dos itens só pode ser feita ou alterada enquanto a entrada estiver em **rascunho**. *(04/11/2026)*
11. A atualização do custo do insumo a partir da compra confirmada fica para a G08, porque exige a conversão de unidades e a ligação item → insumo; a regra do custo (último preço por quilo) está em 7.12. *(04/11/2026, atualizada em 12/11/2026)*
12. Série e chave de acesso só existem em **nota fiscal**. Nos outros tipos de documento (recibo, comprovante, outro), esses campos ficam desabilitados. *(04/11/2026)*
13. **Identificação do item do fornecedor:** toda descrição lida (QR, foto, XML ou digitação) gera uma chave única em CAIXA ALTA, sem acentos, sem caracteres especiais e sem espaços repetidos (exemplo: "Pão brioche c/ 6" → `PAO BRIOCHE C 6`). A descrição original da nota também é guardada, fiel ao documento. Com a chave, cada item aparece como **"Item já conhecido"** (o fornecedor já vendeu esse item numa entrada confirmada, e o destino vem preenchido para conferência) ou **"Item novo"**. *(06/11/2026)*
14. **Fornecedor não é excluído, só inativado.** O inativo some da lista da nova entrada, mas continua aparecendo nas entradas antigas e pode ser reativado. *(06/11/2026)*
15. O CNPJ e o CPF do fornecedor têm os **dígitos verificadores conferidos** no cadastro. Cadastros antigos com documento inválido continuam editáveis enquanto o documento não for alterado. *(06/11/2026)*
16. **Aproveitar ao máximo os dados que chegam:** com o CNPJ, o cadastro busca na consulta pública da Receita Federal a razão social, o nome fantasia, o telefone e o e-mail, e avisa se a situação do CNPJ não for "ativa". O usuário sempre confere antes de salvar, e o cadastro funciona sem a consulta. Fornecedor por CPF é preenchido à mão (não há consulta pública de CPF). Quando o XML e a foto da nota entrarem, os dados do emitente também virão deles. *(06/11/2026)*
17. O **destino padrão** do fornecedor é opcional e só serve de sugestão para os itens novos dele; a memória do item (regra 13) tem prioridade. *(06/11/2026)*
18. **A mesma nota não entra duas vezes:** se já existir uma entrada não cancelada com a mesma chave de acesso, a nova entrada não é salva. Se a existente estiver em rascunho, continua-se por ela; se estiver confirmada, só cancelando-a para lançar de novo. Vale para XML, QR e digitação. *(10/11/2026)*
19. **Importação do XML da NF-e/NFC-e:** o XML preenche o documento (número, série, chave e data), o fornecedor (pelo CNPJ do emitente), todos os itens (código, descrição, unidade, quantidade, valor, desconto, lote e validade) e o frete. O XML fica anexado à entrada como documento original. Se o XML não trouxer a autorização da SEFAZ, aparece um aviso. *(10/11/2026)*
20. **Impostos e outras despesas da nota** (ICMS-ST, IPI, seguro, outras despesas) ainda não entram no total da entrada, que registra produtos − descontos + frete. Quando o total da nota for diferente, a tela mostra a diferença e de onde ela vem. Desde o bloco 8F, a entrada guarda ICMS-ST, IPI, seguro e outras despesas em campos próprios (preenchidos pelo XML e editáveis), só para consulta: ficam fora do custo (regra 7.25). *(10/11/2026, atualizada em 12/11/2026)*
21. **Dados completos do fornecedor:** o fornecedor guarda inscrição estadual e endereço (CEP, logradouro, número, complemento, bairro, município e UF) em campos separados. O endereço pode ser preenchido pelo **CEP** (consulta pública) ou pela **busca do CNPJ**; o número e o complemento são digitados. Na nova entrada com XML, quando o emitente não está cadastrado, o botão **"Cadastrar com os dados da nota"** cria o fornecedor direto do XML e já o seleciona, sem destino padrão. Se o fornecedor já existe, o XML **não altera** o cadastro dele. *(11/11/2026)*
22. **Leitura por foto (IA):** a foto de uma nota, cupom ou recibo, inclusive **manuscrito**, pode ser lida por IA (Claude, da Anthropic) para preencher documento, fornecedor e itens. A leitura só acontece quando a pessoa clica em **"Ler itens da foto"**, e **nunca salva nada sozinha**: ela só preenche a tela, e a pessoa confere e salva. A foto original continua sendo guardada sem alteração, como documento da entrada. *(11/11/2026)*
23. **Conferência da leitura:** o que a IA ficou em dúvida (letra de mão, número ambíguo) aparece em amarelo, item a item, com o motivo. O sistema também confere o CPF/CNPJ e a chave de acesso lidos, e avisa quando a soma dos itens não bate com o total do documento. O fornecedor é encontrado pelo CPF/CNPJ lido; só pelo nome, ele é apenas sugerido e a pessoa confirma. Recibo de fornecedor informal pode ser cadastrado com os dados lidos (nome e CPF/CNPJ válidos). *(11/11/2026)*
24. **Custo e privacidade da leitura:** cada leitura gera custo por foto (tokens), mostrado na tela e registrado no servidor, para o dono avaliar e repassar ao preço dos produtos; o preço em reais é configurado no `.env`, nunca no código. A foto da nota é enviada à Anthropic, e só nesse momento. A chave de API fica só no servidor (`.env`). Sem a chave, a leitura fica "não configurada" e o lançamento manual segue igual. *(11/11/2026)*

## 10. Beatriz (atendente de IA)

1. A atendente do WhatsApp e do site se chama **Beatriz**: um nome só, sem variar pelo gênero do cliente.
2. Ela não é um chatbot: conversa como uma pessoa, aprende as preferências do cliente e entrega a melhor experiência (referência: o encantamento da Disney).
3. Reconhece o cliente pelo telefone e entende como o cliente chama os produtos (exemplo: "aquele que tem abacaxi" é o Sanctum).
4. Monta o pedido, confirma o pagamento, envia ao PDV e acompanha o cliente até a entrega.
5. Remarketing sem parecer telemarketing: não diz ao cliente há quantos dias ele não compra nem quantos pedidos fez.
6. Um pré-pedido abandonado fica guardado, e a Beatriz retoma a conversa depois.
7. **Programa de indicação** (horizontal, de um nível só):
   - A indicação só vale depois que o indicado faz a primeira compra.
   - Os benefícios dependem das indicações **e** do consumo de quem indicou.
   - Não há recompensa por indicações feitas por quem foi indicado.
   - A Beatriz envia um link de indicação, que leva ao cardápio online.
   - Os benefícios são consequência da fidelização: o Beatus vende hambúrgueres, não benefícios.
8. Ela só entra depois que os dados dos outros módulos estiverem confiáveis (G11).

## 11. Estoque, produção e registro de atividades

*(decisões do Kacius em 12/11/2026)*

1. **O saldo é a soma dos movimentos.** Cada entrada e saída de estoque é um movimento que nunca é editado nem apagado; o saldo de um item é a soma dos seus movimentos. Insumos e embalagens ficam na unidade de compra do insumo; as **preparações têm estoque próprio**, na unidade de rendimento da ficha.
2. **Entrada pela compra:** a entrada de compra confirmada dá entrada no estoque de cada item ligado a um insumo, na quantidade convertida (regras 7.23 e 7.24). Cada item entra uma vez só. O botão "Recalcular custos das compras" também dá entrada nas compras confirmadas antes do estoque existir. **Cancelar a entrada** tira do estoque o que ela trouxe.
3. **Produção de lote:** produzir uma preparação baixa os insumos (e outras preparações) pela ficha, proporcionalmente ao que foi planejado, e dá entrada na preparação pelo **rendimento real** informado depois de pronta. O custo por unidade do lote é o custo dos insumos consumidos dividido pelo que realmente rendeu. O estoque pode ficar negativo (a tela avisa), para a falta de uma contagem não travar a cozinha.
4. **O que sai do estoque pela ficha:** a quantidade da ficha dividida pelo aproveitamento (perda de limpeza do insumo e perda de cocção do item, como no custo). A venda de um produto baixa a **preparação** usada (por exemplo o blend), nunca o insumo de novo; produto dentro de produto (combo) baixa o que o outro produto baixa. Itens com **opção de escolha** não baixam sozinhos, porque o pedido ainda não guarda a escolha do cliente.
5. **Contagem (inventário):** o Kacius informa o que contou; o sistema ajusta a diferença com um motivo obrigatório. **Perda** também exige motivo. Há **estoque mínimo** por item, com alerta.
6. **Baixa por venda e cancelamento (implementado na cozinha):** a baixa acontece quando o cozinheiro inicia o preparo (**Em preparo**), e não ao entrar na fila. Cancelamento: em **Novo** (fila) nada a devolver; em **Em preparo ou Pronto** a baixa fica e o consumo vira **perda** com o motivo "pedido cancelado", e só volta ao estoque o que a cozinha marcar na hora; em **Em rota ou Entregue** nada volta. Todo cancelamento exige motivo. A passagem para **Em preparo** é manual (o cozinheiro inicia). O pedido entra na fila (Novo) quando o pagamento é aprovado e gera o ticket da cozinha.
7. **Registro de atividades:** pedidos, compras, estoque, produção e (quando existirem) preços e financeiro gravam uma linha com quando, quem, a área, a ação e um resumo legível, na mesma transação da ação. O registro só recebe linhas novas: ninguém edita nem apaga. A tela **Registro de atividades** filtra por área, número do pedido ou documento e datas.
8. **Quem fez (provisório):** até o login existir, o topo da tela tem o seletor **Operador** (Kacius ou Irmão); o nome escolhido vai em cada requisição e é gravado no registro. Com o login (S3, no final), o nome passa a vir do usuário.
9. **Rotina inicial (decisão do Kacius em 12/11/2026):** abre de quarta a domingo; segunda e terça são dias de produção. O blend é produzido em lote e guardado **congelado**, em gavetas do freezer, dividido por lote e por gaveta; no dia da venda a gaveta vai para a cozinha. A meta de 45 a 50 pedidos com burger por dia é só a capacidade da cozinha e **não entra no sistema**; pedido só de acompanhamento, bebida ou sobremesa é lançado normalmente. Cada gaveta leva o nome da preparação; a capacidade em kg é opcional até ser medida; outras preparações entram em gavetas quando houver espaço.
10. **Quadro kanban do estoque das preparações:** cada cartão é um lote em uma gaveta, com a quantidade, a validade e a cor (vencido, vence logo, ok). As colunas são **A produzir** (abaixo do mínimo), **No freezer**, **Na geladeira**, **Descongelando**, **Na cozinha (hoje)**, **Sobra** e **Descartar** (vencidos). O cartão anda só nestes sentidos: freezer → descongelando → cozinha; geladeira → cozinha; sobra → cozinha; cozinha → sobra. **O que descongelou não volta ao freezer** (norma: é proibido recongelar). Descartar exige motivo e vira perda. A baixa dos pedidos sai da coluna **Na cozinha**.
11. **Validade (norma adotada: Portaria CVS 3/2026 de São Paulo, art. 44; conferir no texto oficial):** os prazos ficam numa tabela **editável** no sistema, com a fonte. Pontos de partida: congelado abaixo de −18 °C, 90 dias; de −11 a −18 °C, 30 dias; de −6 a −10 °C, 20 dias; de 0 a −5 °C, 10 dias; resfriado a 4 °C: preparações com carne moída, 2 dias; carnes cruas, 3 dias; pós-cocção e demais preparados, 3 dias; maionese e misturas com maionese, 2 dias. **A temperatura do freezer define o prazo do congelado**; sem a temperatura medida, vale 30 dias (decisão do Kacius). A validade conta da produção; ao descongelar (descer para a geladeira, abaixo de 5 °C), passa a contar do descongelamento, pelos dias de validade da ficha (ou 2 dias, o prazo de carne moída, quando a ficha não tem), e **nunca passa da validade do lote congelado** (a validade não se revalida).
12. **Etiquetas (identificação exigida pela norma: nome, data de preparo, validade, temperatura de conservação):** o sistema imprime etiquetas de **lote congelado**, **descongelado** (com a data e a hora do descongelamento e a frase **NÃO RECONGELAR**), **sobra** (também **NÃO RECONGELAR**) e **resfriado**, com o lote, a gaveta, a quantidade e o responsável. Tamanhos de rolo: 60 x 40, 100 x 50 e 50 x 30 mm. Cada impressão fica no Registro de atividades.

## 12. Financeiro

*(decisões do Kacius em 13/11/2026)*

1. **O financeiro nasce dos dados da operação e nada é copiado.** O **fluxo de caixa** lê as entradas dos **pagamentos aprovados dos pedidos** (por canal e forma de pagamento) e as saídas das **compras confirmadas**, classificadas pelo destino de cada item. Pedido cancelado não conta como entrada.
2. **As compras são pagas à vista** (Pix, dinheiro ou cartão). Na confirmação da entrada, o Kacius informa a forma; a data do pagamento é a da confirmação. Compras antigas, sem forma, contam na data da entrada. Contas a pagar com vencimento e parcelas ficam para quando houver compra a prazo.
3. **Na compra, o que sobra do valor dos itens** (frete, impostos, outras despesas da nota) aparece à parte nas saídas por categoria.
4. **Lançamento avulso:** despesa ou receita que não vem de pedido nem de compra (gás pago fora da nota, aporte, ajuste de caixa). Tem categoria, descrição, valor, data e forma. **Nunca se apaga:** só se cancela, com motivo, e some do saldo. Todo lançamento e cancelamento entra no Registro de atividades.
5. **Custos fixos do mês** aparecem como saída **prevista** quando o período é um mês inteiro, e o saldo é mostrado também com eles descontados (o aluguel conta o mês inteiro, regra 7.6). Não entram no saldo do caixa enquanto não forem pagos.
6. **Fica para depois:** CMV real a partir da baixa de estoque, DRE completa, conciliação bancária, contas a pagar com vencimento e exportação para o contador.
