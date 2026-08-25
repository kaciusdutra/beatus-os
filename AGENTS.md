# Beatus OS — Instruções para Agentes

## Objetivo

Preservar e evoluir o Beatus OS com segurança, respeitando a arquitetura,
as regras de negócio e as decisões já existentes no projeto.

Antes de alterar arquivos dentro de subdiretórios, leia e siga qualquer
`AGENTS.md` mais específico encontrado no caminho.

## Estrutura atual

- `frontend/`: aplicação Next.js com App Router, React, TypeScript e Tailwind.
- `frontend/app/`: rotas de interface e rotas de API.
- `frontend/modules/`: módulos de domínio, como Clientes, PDV, Pedidos,
  Operação e Dashboard.
- `frontend/core/`: regras transversais de operação, permissões, entrega,
  pagamento, persistência e contexto de empresa.
- `frontend/shared/`: componentes e tipos reutilizáveis.
- `frontend/prisma/`: schema e migrações.
- `frontend/lib/prisma.ts`: cliente Prisma para PostgreSQL.

O backend HTTP está dentro da própria aplicação Next.js, nas rotas em
`frontend/app/api/`.

## Princípios obrigatórios

1. Preserve o código, a estrutura e as decisões existentes.
2. Nunca apague, mova, renomeie ou substitua arquivos sem autorização explícita.
3. Nunca altere arquitetura, stack, dependências, banco de dados, schema Prisma
   ou migrações por iniciativa própria.
4. Nunca crie mocks quando já existir uma implementação real aplicável.
5. Nunca altere regras de negócio sem autorização explícita.
6. Priorize preservar o que já funciona em vez de refatorar por preferência técnica.
7. Faça alterações pequenas, localizadas e verificáveis.
8. Em caso de dúvida sobre arquitetura, regra de negócio, escopo ou fonte de
   dados, pare e peça orientação antes de implementar.
9. Solicite autorização antes de alterações de alto risco que afetem múltiplos
   módulos, persistência, banco de dados ou arquitetura, permitindo que seja
   criado um checkpoint Git antes da alteração.
10. Inconsistências, código legado, duplicidade de fontes de dados ou divergências
    entre schema e migrações devem ser primeiro diagnosticadas e apresentadas.
    Não corrija, remova, migre ou unifique essas estruturas automaticamente.
11. Decisões de negócio definidas pelo responsável pelo projeto e documentadas
    no projeto devem ser preservadas, mesmo que outra abordagem pareça
    tecnicamente melhor.

## Domínio e regras de negócio

- O `Pedido` é a entidade central do sistema.
- Clientes, pagamentos, entrega, operação e dashboard se relacionam ao ciclo
  do pedido.
- Respeite as regras existentes em `frontend/core/` e
  `frontend/modules/*/domain/`.
- Não altere transições de status de pedido, regras de pagamento, cálculo de
  entrega, permissões ou estado operacional sem autorização.
- Preserve o escopo de empresa definido em `core/context/empresaContext.ts`.
- Não introduza comunicação direta entre módulos quando a arquitetura existente
  já fornecer uma camada de serviço, repository ou API para isso.

## Persistência e Prisma

- PostgreSQL é a persistência de produção prevista, e Prisma é o mecanismo de
  acesso a ela. O projeto também possui implementações legadas em
  memória/localStorage.
- Não execute `prisma migrate`, `prisma db push`, `prisma db pull`,
  `prisma generate`, seed, Studio ou comandos equivalentes sem autorização.
- Não exponha valores de `.env`, `DATABASE_URL`, tokens, chaves ou segredos.
- Use as rotas de API e serviços server-side para acessar a persistência real.
- Diferencie implementações em memória/localStorage de implementações PostgreSQL;
  não trate uma como substituta da outra sem confirmação.

## Qualidade e verificação

- Após alterações de código, execute as verificações apropriadas a partir de
  `frontend/`, quando aplicável:
  - `npm run lint`
  - validação de tipos/build compatível com a tarefa
- Lint, typecheck e build validam aspectos técnicos, mas não substituem a
  validação funcional das regras de negócio.
- Não execute builds, testes, migrações ou comandos que escrevam dados quando a
  tarefa pedir apenas análise.
- Antes de concluir, informe o que foi alterado, como foi validado e eventuais
  limitações encontradas.
- Mostre ou resuma o diff das alterações relevantes.

## Git e segurança

- Nunca faça `git commit`, `git push`, `git pull`, `git fetch`, `git reset`,
  `git clean`, `git checkout`, alteração de branch ou rebase sem autorização
  explícita.
- Nunca execute comandos destrutivos sem autorização explícita.
- Antes de operações Git autorizadas, verifique o status do repositório.
- Respeite o `.gitignore`; nunca adicione `.env`, `node_modules`, `.next`,
  arquivos gerados, logs, chaves ou credenciais.
- Não altere configurações globais do Git.

## Forma de trabalho

1. Inspecione o contexto e identifique as regras e camadas afetadas.
2. Para alterações que afetem múltiplos módulos ou camadas, informe previamente
   o impacto e os arquivos/camadas envolvidos antes da implementação.
3. Explique brevemente o plano antes de mudanças relevantes.
4. Implemente apenas o necessário para a solicitação.
5. Verifique o resultado proporcionalmente ao risco.
6. Apresente o diff, as verificações realizadas e o estado final.
