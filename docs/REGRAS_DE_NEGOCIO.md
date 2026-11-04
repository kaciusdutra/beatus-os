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
5. A ficha considera o percentual de perda de cada insumo.
6. O custo do produto inclui o rateio dos custos fixos: mão de obra, gás, energia, aluguel (R$ 1.500 de referência, contado pelo mês inteiro mesmo nos dias fechados), internet, hospedagem do site e tráfego pago.
7. O sistema deve mostrar CMV, DRE, markup e margem.
8. Os impostos de cada insumo devem ficar visíveis, para compor um preço justo.
9. Promoções só depois de analisar a margem. O sistema deve mostrar se uma promoção dá lucro ou prejuízo.
10. A precificação conversa com o financeiro e considera a margem dos marketplaces.
11. **iFood:** comissão de cerca de 25,2% mais R$ 150 por mês, tratada como custo de aquisição de clientes.

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
9. Itens com destino **Insumo** ou **Embalagem** precisam estar ligados a um insumo cadastrado (a embalagem é cadastrada como insumo da categoria "Embalagem"). Os outros destinos guardam só o destino. *(04/11/2026)*
10. A classificação dos itens (destino e insumo) só pode ser feita ou alterada enquanto a entrada estiver em **rascunho**. *(04/11/2026)*
11. A atualização do custo do insumo a partir da compra confirmada fica para um bloco seguinte, porque exige a conversão de unidades. *(04/11/2026)*
12. Série e chave de acesso só existem em **nota fiscal**. Nos outros tipos de documento (recibo, comprovante, outro), esses campos ficam desabilitados. *(04/11/2026)*

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
