# Desempenho: o sistema está rápido? Precisa de cache?

Pergunta do Kacius (17/11/2026): para o sistema não ficar lento, vale subir os itens do cardápio e a tabela de clientes para uma camada rápida de consulta, guardando numa área temporária o que ainda não existe e gravando no banco só depois que o processo termina?

**Resposta curta: hoje não.** Os números mostram que o banco responde em milissegundos, e a parte "gravar depois" é o único ponto perigoso da ideia. O que deixa o cliente com a sensação de lentidão são outras coisas (abaixo).

## O que foi medido

Em 17/11/2026, em modo de produção, neste computador de desenvolvimento (que também rodava o teste), contra o banco real:

| Rota | Um acesso por vez (mediana) | 20 acessos ao mesmo tempo (mediana / p95) | Vazão |
|---|---|---|---|
| Cardápio público (API, tem cache de 15 s) | 14 ms | 49 ms / 243 ms | 276 pedidos/s |
| Página `/cardapio` | 27 ms | 166 ms / 419 ms | 102 pedidos/s |
| Estimativa do checkout (preço e entrega) | 16 ms | 59 ms / 92 ms | 325 pedidos/s |
| Buscar cliente pelo telefone (PDV) | 16 ms | não medido | |
| Lista de pedidos (Cozinha, com login) | 28 ms | 120 ms / 198 ms | 151 pedidos/s |
| Detalhe de um pedido | 24 ms | não medido | |
| Dashboard (análise de vendas) | 16 ms | não medido | |

Sem nenhum erro. Para comparar: a operação planejada é de **45 hambúrgueres por dia**, algumas centenas de pedidos por mês. O sistema aguenta centenas de acessos **por segundo**. Os acessos já incluem a conferência do login no banco a cada pedido.

Para repetir a medição (no servidor de verdade, por exemplo): `node scripts/medirDesempenho.mjs https://seu-dominio LOGIN SENHA`.

## Por que não guardar "para gravar depois"

- **Perder dinheiro e pedido.** Se a gravação fica para depois e o sistema reinicia, falta luz ou dá erro no meio, o cadastro e o pedido que já foram cobrados somem. Pedido, pagamento e cadastro **sempre são gravados no banco antes de confirmar** ao cliente.
- **Isso já existe, e é seguro:** o checkout do site já guarda a operação pendente **no próprio banco** (tabela `CheckoutSite`), enquanto o cliente paga. Só quando o pagamento é aprovado nasce o pedido real, e o cadastro do cliente é feito nesse mesmo momento. É a "área temporária" que você descreveu, só que durável.
- **Preço velho.** Um cache do cardápio pode mostrar ou cobrar um preço que já mudou. Por isso o preço do pedido é sempre refeito no servidor, lendo o banco, e nunca vem de cache.

## O que deixa a sensação de lentidão (e o que fazer)

1. **O modo de desenvolvimento.** No `next dev` cada tela compila na primeira visita (3 a 12 segundos). No servidor, o sistema roda compilado, e a mesma tela abre em dezenas de milissegundos.
2. **Serviços de fora.** O que realmente demora é o que não é nosso: o Mercado Pago, a IA da Beatriz (alguns segundos por resposta) e a consulta de CEP. Para estes, o remédio é a **sensação de velocidade**: mostrar o carregamento, e fazer a Beatriz **escrever aos poucos** (resposta em fluxo, como o ChatGPT), em vez de esperar a resposta inteira.
3. **A distância do servidor.** Escolher a região do VPS mais próxima de Manaus.

## Quando um cache passaria a fazer sentido

Só **depois de medir** e com um destes sinais: a mediana de uma rota passar de uns 300 ms no servidor, ou o sistema crescer para vários servidores ou centenas de pedidos por hora. Aí, o desenho seguro é:

- **Leitura com cache curto** (por exemplo, o cardápio por 30 segundos e o cliente por telefone por poucos minutos) que se **apaga na hora** quando o preço ou o cadastro muda. Já existe um cache de 15 segundos no cardápio público.
- **Nunca** guardar pedido, pagamento ou cadastro "para gravar depois". A gravação no banco vem primeiro.
- Um servidor só usa a memória do próprio aplicativo; com mais de um servidor, aí sim um Redis.

## Pendências de desempenho (no backlog)

- Resposta da Beatriz em fluxo (aparece escrevendo), para o chat parecer mais rápido.
- Registrar no servidor as rotas lentas (mais de meio segundo) para enxergar problema real com cliente real.
- Repetir a medição no VPS, com o servidor de verdade.
