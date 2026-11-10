# Beatus OS: Estado Atual

> Atualizado ao fim de cada bloco (definição de pronto do `docs/PLANO_DE_SPRINTS.md`). Última atualização: 10/11/2026.

## Onde estamos

- **Sprint global:** G07, Compras e abastecimento.
- **Branch principal:** `main`, igual a `origin/main`.
- **Bloco concluído:** 7C, cadastro de fornecedores com busca dos dados pelo CNPJ (commit `274f1a7`). Antes dele, a 7B (commit `126ea63`) e a 7A (commit `43ce3f8`).
- **Próximo bloco:** 7D, a definir com o Kacius entre a importação do XML da NF-e (com endereço e inscrição estadual do fornecedor, que exigem migração) e a leitura dos itens pela foto.

## Ambiente

- Next.js 16 com App Router, React 19, TypeScript, Tailwind e Prisma 7, tudo em `frontend/`. A API fica em `frontend/app/api/`.
- PostgreSQL 17 instalado no notebook (serviço `postgresql-x64-17`, início automático), em `localhost:5432`, banco `beatus`. O banco `beatus_shadow` é usado só pelo Prisma para testar migrações.
- 14 migrações aplicadas, de 19/08 a 04/11/2026. A última (`add_destino_itens_compra`) tem o checkpoint `checkpoint-antes-7b` antes dela.
- Os dados atuais são fictícios, usados para testar telas e sprints.
- Verificação única: `npm run check` (tipos, lint e testes), rodado a partir de `frontend/`. O lint tem uma linha de base de 10 erros e 7 avisos antigos, e o check só falha se piorar.
- Repositório remoto: GitHub `kaciusdutra/beatus-os`.

## Histórico recente

| Data | Commit | O que mudou |
|---|---|---|
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
- A consulta do CNPJ usa a BrasilAPI (serviço público externo): só o CNPJ sai do sistema; sem internet, o cadastro é feito à mão.
- Feche no VS Code os arquivos que o Claude estiver alterando, para que uma versão antiga não seja salva por cima.
