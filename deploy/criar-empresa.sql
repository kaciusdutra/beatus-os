-- Cadastra a empresa do Beatus num banco NOVO (só na primeira instalação).
-- O sistema trabalha com uma empresa única, de id fixo (core/context/empresaContext.ts); sem ela, nenhuma tela funciona.
-- É o equivalente, para produção, do prisma/seed/empresa.ts (que cria a "Beatus Desenvolvimento").
-- Pode rodar de novo sem problema: se a empresa já existe, não faz nada.
-- Troque "nome" pela razão social quando o CNPJ estiver regular.

INSERT INTO "Empresa" ("id", "nome", "nomeFantasia", "ativo", "criadoEm", "atualizadoEm")
VALUES ('00000000-0000-0000-0000-000000000001', 'Beatus', 'Beatus', true, NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
