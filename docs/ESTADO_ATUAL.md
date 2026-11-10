# Beatus OS: Estado Atual

> Atualizado ao fim de cada bloco (definição de pronto do `docs/PLANO_DE_SPRINTS.md`). Última atualização: 12/11/2026.

## Onde estamos

- **Sprint global:** G07 (Compras e abastecimento) concluída em 12/11/2026. Pendentes externos: a chave da Anthropic (do Kacius) e a baixa automática da SEFAZ (depende do CNPJ e do certificado digital). O custo do insumo pela última compra ficou para a G08 (regra 7.12).
- **S5 (diagnóstico do código legado):** concluída. Resultado em `docs/DIAGNOSTICO_LEGADO.md`. O Kacius aprovou as 5 decisões; o código morto (grupos A a G) foi removido e o dashboard marcado como demonstração. As migrações das telas Pedidos, Clientes e PDV seguem nas sprints S2 e G03.
- **Branch principal:** `main`, igual a `origin/main`.
- **Bloco concluído:** 7F, leitura dos itens por foto com IA, inclusive recibo manuscrito (commit `3483b9e`; falta só a chave da Anthropic). Antes dele, a 7E (`f77d31c`), a 7D (`2c9eb0e`), a 7C (`274f1a7`), a 7B (`126ea63`) e a 7A (`43ce3f8`).
- **Documentação do módulo:** `docs/MODULO_COMPRAS.md` (telas, regras, API, dados, configuração, testes e pendências).
- **G08 (fichas, custo automático e precificação):** plano aprovado em 12/11/2026 (regras 7.5 e 7.12 a 7.16). Bloco **8A** (vínculo item da compra → insumo) concluído (commit `8576697`). Bloco **8B** (equivalência de unidade, perda de limpeza e edição de insumo) concluído (commit `0a51110`). Seguem **8D** (tela de fichas técnicas, com ficha dentro de ficha, que o Kacius monta digitando as quantidades), **8C** (custo automático pelo último preço e histórico de preços, migração; guarda também a quantidade convertida, que servirá ao estoque) e 8E a 8G (precificação).
- **Próximo passo:** terminar a **G08**, e então S2, S3, S4 e S6, nessa ordem. A chave da Anthropic entra quando o Kacius avaliar o custo por foto.

## Ambiente

- Next.js 16 com App Router, React 19, TypeScript, Tailwind e Prisma 7, tudo em `frontend/`. A API fica em `frontend/app/api/`.
- PostgreSQL 17 instalado no notebook (serviço `postgresql-x64-17`, início automático), em `localhost:5432`, banco `beatus`. O banco `beatus_shadow` é usado só pelo Prisma para testar migrações.
- 16 migrações aplicadas, de 19/08 a 10/11/2026. As últimas (`add_destino_itens_compra`, `add_endereco_inscricao_fornecedor` e `add_equivalencia_e_perda_limpeza_insumo`) têm os checkpoints `checkpoint-antes-7b`, `checkpoint-antes-7e` e `checkpoint-antes-8b` antes delas.
- Os dados atuais são fictícios, usados para testar telas e sprints.
- Verificação única: `npm run check` (tipos, lint e testes), rodado a partir de `frontend/`. O lint tem uma linha de base de 10 erros e 7 avisos antigos, e o check só falha se piorar.
- Repositório remoto: GitHub `kaciusdutra/beatus-os`.

## Histórico recente

| Data | Commit | O que mudou |
|---|---|---|
| 12/11/2026 | `0a51110` | G08 8B: equivalência de unidade e perda de limpeza no insumo (migração), tela Editar insumo, custo pelo aproveitamento (limpeza × cocção) e conversão por equivalência; regra 7.17 |
| 12/11/2026 | `8576697` | G08 8A: tela "Itens de compras" em Insumos liga cada item do fornecedor ao insumo, uma única vez; as compras seguintes já nascem ligadas; regras 7.5 e 7.12 a 7.16 |
| 12/11/2026 | `3483b9e` | G07 7F: leitura dos itens por foto com IA (Claude, SDK `@anthropic-ai/sdk`) para nota, cupom e recibo manuscrito; itens em amarelo para conferir, avisos de soma e de CPF/CNPJ, fornecedor achado pelo documento ou sugerido pelo nome, cadastro com os dados lidos, tokens e custo por leitura; sem a chave, a leitura fica "não configurada"; regras 9.22 a 9.24 |
| 11/11/2026 | `f77d31c` | G07 7E: inscrição estadual e endereço do fornecedor (migração aditiva); busca do endereço pelo CEP (rota `/api/cep/[cep]`, compartilhada); endereço também vindo da busca pelo CNPJ; botão "Cadastrar com os dados da nota" na nova entrada; regra 9.21 |
| 11/11/2026 | `2c9eb0e` | G07 7D: importação do XML da NF-e/NFC-e na nova entrada (documento, fornecedor pelo CNPJ, itens com lote e validade, frete; XML anexado como documento original); avisos de XML sem autorização e de diferença no total por ICMS-ST, IPI, seguro e outras despesas; a mesma nota (chave de acesso) não entra duas vezes; regras 9.18 a 9.20 |
| 10/11/2026 | `274f1a7` | G07 7C: tela de fornecedores em Compras (CNPJ ou CPF, busca dos dados pelo CNPJ na Receita via BrasilAPI, dígitos conferidos, destino padrão, inativar e reativar sem excluir); atalhos "Cadastrar este fornecedor" e "Atualizar lista" na nova entrada; regras 9.14 a 9.17 |
| 06/11/2026 | `126ea63` | G07 7B: destino de cada item da entrada (Insumo, Embalagem, Limpeza e higiene, Expediente, Equipamento e utensílio, Serviço), obrigatório para confirmar; chave do item em caixa alta e etiqueta "Item já conhecido" ou "Item novo"; memória do destino por fornecedor, gravada na confirmação; ligação com o insumo fica para a G08; botão "Adicionar item" abaixo do último item; regras 9.8 a 9.13 |
| 04/11/2026 | `43ce3f8` | G07 7A: nome do fornecedor na lista; card "Valor das entradas" sem as canceladas; tela de detalhe com fornecedor, itens, totais, documentos e botões Confirmar e Cancelar (com motivo); a nova entrada volta para a lista depois de salvar; série e chave de acesso só em nota fiscal; decisões de Compras registradas nas regras 9.8 a 9.12 |
| 04/11/2026 | `a120bd5` | Documentos do projeto em `docs/` (regras de negócio, backlog, plano de sprints e estado atual) |
| 04/11/2026 | `a24eb8a` | Leitura do QR da NFC-e (v2 e v3, online e contingência) e dados da chave; a nova entrada preenche chave, série e número e seleciona o fornecedor pelo CNPJ; a data de entrada passa a usar o horário local; inclui a tela de nova entrada e a captura de documento, que estavam fora do Git |
| 07/10/2026 | `4b73ba7` | S1: verificação única `npm run check` |
| 22/09/2026 | `e407d17` | Consolida o módulo Compras e a captura de documentos |

## Pontos de atenção

- **Legado diagnosticado na S5** (`docs/DIAGNOSTICO_LEGADO.md`): o PDV grava pedidos no banco, mas as telas Pedidos e Clientes ainda leem o `localStorage` (pedido lançado no PDV não aparece na fila de Pedidos); o catálogo do PDV é fixo no código; o dashboard tem números fixos; horários e checklist da operação ficam só em memória; há código morto em Pedidos, Clientes, Fornecedores e Compras. Não existem tabelas de estoque, financeiro, produção, horários/checklist e login. Já existem tabelas de produto, insumo e ficha técnica.
- Clientes, Pedidos, PDV, Dashboard e Operação não têm teste automático: escrever testes antes de migrar essas telas.
- Ainda não há login: o sistema não deve ir para a internet antes da S3.
- A leitura por foto usa a API da Anthropic. Variáveis do `frontend/.env` (nunca vão para o Git): `ANTHROPIC_API_KEY` (a chave; sem ela a leitura fica desligada) e, opcionais, `ANTHROPIC_PRECO_ENTRADA_REAIS_MILHAO`, `ANTHROPIC_PRECO_SAIDA_REAIS_MILHAO` (reais por milhão de tokens, para a tela mostrar o custo em reais) e `ANTHROPIC_MODELO` (padrão `claude-sonnet-5-5`). A foto da nota é enviada à Anthropic só quando se clica em "Ler itens da foto".
- As consultas de CNPJ e de CEP usam a BrasilAPI (serviço público externo): só o CNPJ ou o CEP sai do sistema; sem internet, o cadastro é feito à mão.
- Feche no VS Code os arquivos que o Claude estiver alterando, para que uma versão antiga não seja salva por cima.
