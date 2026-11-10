# Beatus OS: Estado Atual

> Atualizado ao fim de cada bloco (definição de pronto do `docs/PLANO_DE_SPRINTS.md`). Última atualização: 11/11/2026.

## Onde estamos

- **Sprint global:** G07, Compras e abastecimento.
- **Branch principal:** `main`, igual a `origin/main`.
- **Bloco concluído:** 7E, endereço e inscrição estadual do fornecedor, busca por CEP e cadastro pela nota (commit `f77d31c`). Antes dele, a 7D (`2c9eb0e`), a 7C (`274f1a7`), a 7B (`126ea63`) e a 7A (`43ce3f8`).
- **Próximo bloco:** a definir com o Kacius entre a leitura dos itens pela foto (IA) e a busca de endereço por CEP no cadastro de clientes.

## Ambiente

- Next.js 16 com App Router, React 19, TypeScript, Tailwind e Prisma 7, tudo em `frontend/`. A API fica em `frontend/app/api/`.
- PostgreSQL 17 instalado no notebook (serviço `postgresql-x64-17`, início automático), em `localhost:5432`, banco `beatus`. O banco `beatus_shadow` é usado só pelo Prisma para testar migrações.
- 15 migrações aplicadas, de 19/08 a 10/11/2026. As duas últimas (`add_destino_itens_compra` e `add_endereco_inscricao_fornecedor`) têm os checkpoints `checkpoint-antes-7b` e `checkpoint-antes-7e` antes delas.
- Os dados atuais são fictícios, usados para testar telas e sprints.
- Verificação única: `npm run check` (tipos, lint e testes), rodado a partir de `frontend/`. O lint tem uma linha de base de 10 erros e 7 avisos antigos, e o check só falha se piorar.
- Repositório remoto: GitHub `kaciusdutra/beatus-os`.

## Histórico recente

| Data | Commit | O que mudou |
|---|---|---|
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

- Estoque, financeiro, produção, receitas e ingredientes ainda não têm tabela no banco (legado em memória ou localStorage). Diagnóstico previsto na S5.
- Clientes e pedidos têm dois repositórios cada (`repositories/` e `services/`): provável legado convivendo com o PostgreSQL. Diagnóstico previsto na S5.
- Ainda não há login: o sistema não deve ir para a internet antes da S3.
- As consultas de CNPJ e de CEP usam a BrasilAPI (serviço público externo): só o CNPJ ou o CEP sai do sistema; sem internet, o cadastro é feito à mão.
- Feche no VS Code os arquivos que o Claude estiver alterando, para que uma versão antiga não seja salva por cima.
