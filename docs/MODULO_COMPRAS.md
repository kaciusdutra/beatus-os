# Módulo Compras

> Documentação do módulo ao fim da sprint global G07 (Compras e abastecimento). Última atualização: 12/11/2026.
> As regras de negócio completas estão em `docs/REGRAS_DE_NEGOCIO.md`, seção 9 (aqui há só o resumo e a referência). O estado do projeto e o histórico dos commits estão em `docs/ESTADO_ATUAL.md`.

## 1. O que o módulo faz

O módulo Compras registra tudo o que **entra** no restaurante vindo de fornecedores. Cada compra vira uma **entrada de compra**, com o documento (nota fiscal, cupom, recibo ou comprovante), os itens, os valores e a foto ou o arquivo original guardado.

Ele resolve quatro problemas:

1. **Lançar rápido e sem erro:** a entrada pode vir do QR Code da NFC-e, do XML da NF-e, da foto lida por IA (inclusive recibo manuscrito) ou de digitação, nesta ordem de preferência.
2. **Não duplicar:** a mesma nota (chave de acesso) não entra duas vezes, e o fornecedor é identificado pelo CNPJ ou CPF.
3. **Classificar o que foi comprado:** cada item recebe um destino (insumo, embalagem, limpeza, expediente, equipamento ou serviço), que alimenta estoque, financeiro e custos nos módulos seguintes.
4. **Aprender com o uso:** o sistema reconhece o item que o fornecedor já vendeu antes ("Item já conhecido") e sugere o destino.

**O que o módulo ainda não faz** (ver seção 11): dar entrada no estoque, lançar no financeiro e baixar as NF-e automaticamente da SEFAZ. A atualização do custo do insumo pela compra confirmada foi entregue na G08 e está documentada em `docs/MODULO_FICHAS_E_PRECIFICACAO.md`.

## 2. Como usar

### 2.1 Lista de Compras (`/compras`)

- Mostra as entradas com fornecedor, documento, data, total e situação, mais quatro totais no topo (total de entradas, rascunhos, confirmadas e valor das entradas, sem as canceladas).
- Busca por fornecedor, documento ou chave de acesso.
- Botões: **+ Nova entrada** e **Fornecedores**.

### 2.2 Nova entrada (`/compras/entradas/nova`)

A tela começa em **captura** e vai para o **formulário**. Há quatro caminhos:

| Caminho | Como | O que preenche |
|---|---|---|
| **QR Code da NFC-e** | A câmera lê o QR do cupom | Chave de acesso, série, número e fornecedor (pelo CNPJ). Os itens **não** vêm no QR. |
| **XML da NF-e/NFC-e** | Botão "Escolher arquivo XML" | Documento, fornecedor, todos os itens (com código, lote e validade), desconto de itens e frete. O XML é anexado como documento original. |
| **Foto lida por IA** | Anexar a foto e clicar em "Ler itens da foto" | Documento, fornecedor e itens, inclusive de recibo manuscrito. Exige a chave da Anthropic (seção 8). |
| **Digitação manual** | Botão "Digitar manualmente" | Nada: tudo é digitado. É o último recurso. |

Em todos os caminhos o formulário é o mesmo e **tudo é conferido antes de salvar**. Nenhuma leitura grava sozinha.

Detalhes do formulário:
- **Fornecedor:** lista dos ativos, com "+ Cadastrar fornecedor" e "↻ Atualizar lista". Se o emitente do XML, do QR ou da foto não estiver cadastrado, aparecem atalhos para cadastrar (inclusive **"Cadastrar com os dados da nota"** e **"Cadastrar com os dados lidos"**, que criam o fornecedor direto do documento).
- **Série e chave de acesso** só existem em nota fiscal; nos outros tipos os campos ficam desabilitados.
- **Itens:** descrição como está no documento, "Código do produto na nota" (opcional), quantidade, unidade, valor unitário e desconto. O botão "+ Adicionar item" fica sempre abaixo do último item.
- **Avisos da leitura:** XML sem autorização da SEFAZ, diferença entre o total da nota e o da entrada (ICMS-ST, IPI, seguro, outras despesas), soma dos itens diferente do total lido pela foto, CPF/CNPJ ou chave lidos com dígito errado. Itens que a IA ficou em dúvida aparecem em amarelo, com o motivo.
- Ao salvar, a entrada nasce em **RASCUNHO**, o documento original é anexado e a tela volta para a lista.

### 2.3 Detalhe da entrada (`/compras/entradas/[id]`)

- Mostra fornecedor, tipo e número do documento, chave de acesso, itens, totais, observações e documentos anexados (botão **Abrir**).
- **Em RASCUNHO:**
  - dá para anexar uma foto;
  - cada item mostra "Item já conhecido" ou "Item novo" e uma caixa de **destino**, que vem preenchida quando há sugestão ("Destino das compras anteriores" ou "Destino padrão do fornecedor");
  - **Salvar classificação** grava os destinos;
  - **Confirmar** só libera com todos os itens classificados e a classificação salva (confirmação em dois passos).
- **Itens de compras (módulo Insumos, `/insumos/vinculos`):** liga cada item que o fornecedor vende ao insumo certo, uma única vez (regra 7.13). As próximas compras do mesmo item já nascem ligadas ao confirmar a entrada.
- **Em CONFIRMADA:** o destino aparece só para leitura, e há o botão **Cancelar**, que exige um **motivo** (ele é anotado nas observações da entrada).

### 2.4 Fornecedores (`/compras/fornecedores`)

- Lista com busca por nome, CNPJ ou CPF e filtro Ativos, Inativos ou Todos. Mostra nome fantasia, razão social, documento, município/UF, telefone, destino padrão e situação.
- **Cadastro:**
  - CNPJ (empresa) ou CPF (informal), com máscara e **conferência dos dígitos**;
  - **🔎 Buscar dados pelo CNPJ** (Receita Federal, via BrasilAPI) preenche razão social, nome fantasia, telefone, e-mail e endereço, e avisa se o CNPJ não estiver "ativo";
  - **CEP** preenche rua, bairro, cidade e UF (você digita o número e o complemento);
  - inscrição estadual, destino padrão dos itens (opcional) e observação.
- **Inativar e reativar** na própria linha (confirmação "Sim, inativar"). Não existe excluir pela tela. O inativo some da lista da nova entrada, mas continua aparecendo nas entradas antigas.
- A tela aceita `?cnpj=` na URL: abre o cadastro com o CNPJ preenchido e já faz a busca (usado pelo atalho da nova entrada).

## 3. Situações da entrada

```
RASCUNHO ──confirmar──▶ CONFIRMADA ──cancelar (com motivo)──▶ CANCELADA
    │
    └──excluir (só rascunho)
```

| Situação | Pode |
|---|---|
| **RASCUNHO** | Alterar dados e itens, anexar e remover documentos, classificar itens, confirmar, excluir. |
| **CONFIRMADA** | Só ser cancelada (com motivo). Não se altera. |
| **CANCELADA** | Nada. Não conta no valor das entradas e libera a chave de acesso para lançar de novo. |

Os status são textos validados no serviço (o schema não usa enum do Prisma).

## 4. Regras de negócio (resumo)

Texto completo e datas das decisões em `REGRAS_DE_NEGOCIO.md`, seção 9.

| Regra | Resumo |
|---|---|
| 9.1 a 9.5 | Origens da entrada, fornecedor por CNPJ ou CPF, recibo para informal, documento original sempre guardado por empresa, ano e mês. |
| 9.6 | Destinos: Insumo, Embalagem, Limpeza e higiene, Expediente, Equipamento e utensílio, Serviço. |
| 9.8 a 9.10 | Só confirma com todos os itens classificados; só o destino na entrada (a ligação com o insumo fica para as fichas, G08); classificação só em rascunho. |
| 9.11 | Custo do insumo pela compra confirmada: fica para um bloco seguinte. |
| 9.12 | Série e chave só em nota fiscal. |
| 9.13 | Chave do item do fornecedor (maiúsculas, sem acento nem símbolos) e "Item já conhecido" ou "Item novo". |
| 9.14 a 9.17 | Fornecedor só inativa; dígitos do CNPJ e CPF conferidos; aproveitar ao máximo os dados que chegam (Receita, CEP, XML, foto); destino padrão opcional. |
| 9.18 | A mesma nota não entra duas vezes (vale para XML, QR, foto e digitação). |
| 9.19 e 9.20 | Importação do XML; impostos e outras despesas da nota ainda fora do total da entrada. |
| 9.21 | Fornecedor guarda inscrição estadual e endereço; o XML não altera fornecedor já existente. |
| 9.22 a 9.24 | Leitura por foto: só ao clicar, nunca salva sozinha, itens em dúvida em amarelo, custo por leitura, foto enviada à Anthropic só nesse momento. |

## 5. Telas

| Rota | Arquivo da tela |
|---|---|
| `/compras` | `modules/compras/pages/ComprasPage.tsx` |
| `/compras/entradas/nova` | `modules/compras/pages/NovaEntradaCompraPage.tsx` (usa `components/CapturaDocumentoNota.tsx`) |
| `/compras/entradas/[id]` | `app/compras/entradas/[id]/page.tsx` |
| `/compras/fornecedores` | `modules/fornecedores/pages/FornecedoresPage.tsx` |

## 6. API (rotas em `frontend/app/api/`)

| Método e rota | Para quê |
|---|---|
| `GET /api/compras/entradas` | Lista as entradas, ou uma só com `?id=`. |
| `POST /api/compras/entradas` | Cria a entrada (nasce em RASCUNHO). Devolve 409 se a nota já foi lançada. |
| `PUT /api/compras/entradas/[id]` | Altera uma entrada em RASCUNHO. |
| `DELETE /api/compras/entradas/[id]` | Exclui uma entrada em RASCUNHO. |
| `POST /api/compras/entradas/[id]/confirmar` | Confirma (exige todos os itens classificados). |
| `POST /api/compras/entradas/[id]/cancelar` | Cancela uma confirmada (exige `motivo`). |
| `POST /api/compras/entradas/[id]/documentos` | Anexa um documento (multipart: `arquivo`, `tipoDocumento`, `origem`, opcional `statusLeitura`). Aceita PDF, XML, JPG, PNG e WEBP. |
| `GET /api/compras/entradas/[id]/documentos/[documentoId]` | Abre o arquivo. |
| `DELETE /api/compras/entradas/[id]/documentos/[documentoId]` | Remove o documento (só em rascunho). |
| `GET /api/compras/entradas/[id]/itens/classificacao` | Identifica cada item (conhecido ou novo) e sugere o destino. |
| `PATCH /api/compras/entradas/[id]/itens/classificacao` | Grava o destino dos itens. |
| `GET /api/compras/leitura-foto` | Diz se a leitura por IA está configurada. |
| `POST /api/compras/leitura-foto` | Lê uma foto (multipart: `imagem`, opcional `tipoDocumento`) e devolve os dados **sem gravar nada**. |
| `GET /api/compras/vinculos-itens` | Itens de compras confirmadas (destino Insumo ou Embalagem) com o insumo ligado e a última compra (bloco 8A). |
| `PATCH /api/compras/vinculos-itens/[id]` | Liga ou desliga (`insumoId` null) o insumo de um item do fornecedor; vale para as próximas compras e as já confirmadas. |
| `GET /api/fornecedores` | Lista os fornecedores, ou busca por `?id=`, `?cnpj=` ou `?cpf=`. |
| `POST /api/fornecedores` | Cadastra. |
| `PUT /api/fornecedores/[id]` | Altera (a tela usa também para inativar e reativar). |
| `DELETE /api/fornecedores/[id]` | Existe, mas a tela não usa (o banco recusa excluir quem tem entradas). |
| `GET /api/fornecedores/consulta-cnpj?cnpj=` | Dados públicos do CNPJ para preencher o cadastro. |
| `GET /api/cep/[cep]` | Endereço pelo CEP. Rota compartilhada: servirá também ao cadastro de clientes. |

## 7. Dados (PostgreSQL, via Prisma)

| Tabela | Conteúdo |
|---|---|
| `EntradaCompra` | Cabeçalho: fornecedor, tipo, número, série, chave de acesso, situação, datas, valores (produtos, desconto, frete, total) e observação. |
| `EntradaCompraItem` | Itens: descrição original, código do produto na nota, quantidade, unidade, valor unitário, desconto, total, lote, validade, **destino** e `insumoId` (preenchido pelo vínculo do bloco 8A). |
| `EntradaCompraDocumento` | Referência do arquivo original: nome, tipo MIME, tamanho, tipo do documento, **origem** (FOTOGRAFIA, UPLOAD, XML ou IMPORTACAO), situação da leitura (PENDENTE, PROCESSANDO, EXTRAIDO, ERRO), caminho e hash do arquivo. |
| `ClassificacaoItemCompra` | Memória do fornecedor: chave do item → destino e **insumo ligado**, com contador de usos. Gravada na confirmação; o insumo é ligado na tela Itens de compras. |
| `Fornecedor` | Razão social, nome fantasia, CNPJ ou CPF (únicos por empresa), contato, **destino padrão**, **inscrição estadual**, **endereço** (CEP, logradouro, número, complemento, bairro, município, UF) e situação ativo. |

Todas as consultas são limitadas à empresa (`core/context/empresaContext.ts`).

**Arquivos originais:** ficam no disco, em `empresas/<empresaId>/entradas-compra/<ano>/<mês>/<id>-<nome>`, dentro da pasta `frontend/storage/` (ou da pasta definida em `BEATUS_STORAGE_PATH`). A pasta não vai para o Git. O banco guarda só a referência.

Migrações do módulo: `add_destino_itens_compra` (7B) e `add_endereco_inscricao_fornecedor` (7E). Os checkpoints Git `checkpoint-antes-7b` e `checkpoint-antes-7e` marcam o estado de antes de cada uma.

## 8. Serviços externos e configuração

| Serviço | Para quê | O que sai do sistema | Configuração |
|---|---|---|---|
| **BrasilAPI** (público, gratuito) | Dados do CNPJ e endereço do CEP | Só o CNPJ ou o CEP | Nenhuma. Sem internet, o cadastro é feito à mão. |
| **API da Anthropic (Claude)** | Leitura da foto por IA | A imagem do documento, só quando se clica em "Ler itens da foto" | `frontend/.env` (veja abaixo). |

Variáveis do `frontend/.env` (nunca vão para o Git; os valores não aparecem em tela nem em log):

| Variável | Obrigatória | Função |
|---|---|---|
| `ANTHROPIC_API_KEY` | Para a leitura por foto | A chave. Sem ela, a leitura fica "não configurada" e o lançamento manual segue igual. |
| `ANTHROPIC_PRECO_ENTRADA_REAIS_MILHAO` e `ANTHROPIC_PRECO_SAIDA_REAIS_MILHAO` | Não | Reais por milhão de tokens, para a tela mostrar o custo em reais de cada leitura. |
| `ANTHROPIC_MODELO` | Não | Troca o modelo (padrão `claude-sonnet-5-5`). |
| `BEATUS_STORAGE_PATH` | Não | Pasta dos arquivos originais (padrão `frontend/storage`). |

Cada leitura mostra na tela os tokens usados e registra o consumo no log do servidor, para o dono avaliar o custo por foto e repassar aos preços.

## 9. Arquitetura (onde está cada coisa)

```
frontend/
├─ app/
│  ├─ compras/                         telas (rotas do App Router)
│  └─ api/compras, api/fornecedores, api/cep   rotas HTTP
└─ modules/
   ├─ compras/
   │  ├─ domain/destinoItemCompra.ts          destinos e chave do item
   │  ├─ services/entradaCompraService.ts     regras da entrada (situações, duplicidade, classificação)
   │  ├─ services/documentos/                 leitores: QR, XML e resposta da IA (sem dependências de servidor)
   │  ├─ services/server/lerDocumentoPorFoto.ts   chamada à IA (só no servidor)
   │  ├─ services/storage/                    gravação dos arquivos originais
   │  └─ repositories/                        Port + Postgres (e versão em memória legada)
   └─ fornecedores/
      ├─ domain/                              CNPJ, CPF, máscaras, endereço
      ├─ services/fornecedorService.ts        regras do fornecedor
      └─ services/server/                     consulta de CNPJ e de CEP (só no servidor)
```

Padrões seguidos: serviço → repositório (Port) → Postgres; fábricas em `services/server/*Factory.ts` com o contexto da empresa; telas só falam com as rotas da API.

## 10. Testes

`npm run check` (a partir de `frontend/`) roda tipos, lint e todos os `*.test.ts`. O módulo tem testes para:

- destinos e chave do item (`destinoItemCompra.test.ts`);
- leitura do QR da NFC-e (`interpretarQrNfce.test.ts`) e do XML da NF-e (`interpretarXmlNfe.test.ts`);
- leitura da resposta da IA e custo (`leituraFotoDocumento.test.ts`), com respostas simuladas: **a leitura real da IA ainda não foi testada, porque falta a chave**;
- regras da entrada: situações, classificação, memória e nota em duplicidade (`entradaCompraService.test.ts`);
- regras do fornecedor: documento, destino padrão e endereço (`fornecedorService.test.ts`, `documentoFornecedor.test.ts`, `enderecoFornecedor.test.ts`).

O teste do repositório Postgres de fornecedores só roda com `--integracao` (usa o banco).

## 11. Limitações e pendências

| Pendência | Situação |
|---|---|
| **Chave da Anthropic** | Falta o dono avaliar o custo por foto e colocar a chave. Depois, testar com fotos reais, principalmente recibos manuscritos. |
| **Custo do insumo** | A compra confirmada ainda não atualiza o custo do insumo. Exige conversão de unidades (nota × compra do insumo) e a ligação item → insumo (G08). |
| **Estoque e financeiro** | A confirmação ainda não dá entrada no estoque nem lança no financeiro. Entram com os módulos G05/G06 e G09. |
| **Baixa da SEFAZ** | Depende do CNPJ e do certificado digital do Beatus. |
| **Impostos da nota** | ICMS-ST, IPI, seguro e outras despesas só aparecem como aviso; falta decidir onde entram no custo. |
| **Custo da leitura no banco** | Hoje o consumo só aparece na tela e no log. Guardar por entrada exige migração. |
| **Completar fornecedor existente pelo XML** | O XML não altera o cadastro de um fornecedor que já existe (regra 9.21). |
| **Código do produto para reconhecer o item** | O "Item já conhecido" usa só a descrição; o código da nota (cProd) poderia reforçar. |
| **CEP no cadastro de clientes** | A rota já existe; falta ligar na tela de Clientes (bloco separado). |
| **Sem login** | Pela matriz de permissões, só o perfil ADMIN tem `compras.visualizar`, mas ainda não há login: o sistema não deve ir para a internet antes da S3. |
| **Código legado** | `repositories/entradaCompraRepository.ts` é uma versão em memória que convive com a do Postgres (diagnóstico previsto na S5). |

## 12. Histórico dos blocos da G07

| Bloco | Commit | O que entregou |
|---|---|---|
| QR | `a24eb8a` | Leitura do QR da NFC-e (v2 e v3) e fornecedor pelo CNPJ. |
| 7A | `43ce3f8` | Detalhe da entrada, confirmar e cancelar, nome do fornecedor na lista, série e chave só em nota fiscal. |
| 7B | `126ea63` | Destino dos itens, "Item já conhecido" ou "Item novo" e memória por fornecedor. |
| 7C | `274f1a7` | Tela de fornecedores, busca pelo CNPJ, dígitos conferidos, inativar. |
| 7D | `2c9eb0e` | Importação do XML da NF-e e bloqueio de nota em duplicidade. |
| 7E | `f77d31c` | Endereço e inscrição estadual do fornecedor, busca por CEP, cadastro pela nota. |
| 7F | `3483b9e` | Leitura por foto com IA, inclusive recibo manuscrito, e custo por leitura. |
