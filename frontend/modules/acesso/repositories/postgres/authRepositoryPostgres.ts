import { prisma } from "@/lib/prisma";

import { Prisma } from "@/lib/generated/prisma/client";

import type { EmpresaContext } from "@/core/context/empresaContext";

import type { AuthRepositoryPort, MudancasDoUsuario, NovoUsuario } from "../authRepositoryPort";

import type { PapelDoUsuario, UsuarioSalvo } from "../../types/acesso";

type LinhaDeUsuario = {
  id: string;
  empresaId: string;
  login: string;
  nome: string;
  email: string | null;
  papel: string;
  senhaHash: string;
  ativo: boolean;
  tentativasFalhas: number;
  bloqueadoAte: Date | null;
  ultimoAcessoEm: Date | null;
  criadoEm: Date;
};

function mapear(linha: LinhaDeUsuario): UsuarioSalvo {
  return {
    id: linha.id,
    empresaId: linha.empresaId,
    login: linha.login,
    nome: linha.nome,
    email: linha.email ?? undefined,
    papel: linha.papel as PapelDoUsuario,
    senhaHash: linha.senhaHash,
    ativo: linha.ativo,
    tentativasFalhas: linha.tentativasFalhas,
    bloqueadoAte: linha.bloqueadoAte ?? undefined,
    ultimoAcessoEm: linha.ultimoAcessoEm ?? undefined,
    criadoEm: linha.criadoEm,
  };
}

function loginEmUso(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export function criarAuthRepositoryPostgres(contexto: EmpresaContext): AuthRepositoryPort {
  const empresaId = contexto.empresaId;

  return {
    async contarUsuarios() {
      return prisma.usuario.count({ where: { empresaId } });
    },

    async buscarPorLogin(login) {
      const linha = await prisma.usuario.findUnique({ where: { empresaId_login: { empresaId, login } } });

      return linha ? mapear(linha) : null;
    },

    async buscarPorId(id) {
      const linha = await prisma.usuario.findFirst({ where: { id, empresaId } });

      return linha ? mapear(linha) : null;
    },

    async listarUsuarios() {
      const linhas = await prisma.usuario.findMany({ where: { empresaId }, orderBy: [{ ativo: "desc" }, { nome: "asc" }] });

      return linhas.map(mapear);
    },

    async contarAdministradoresAtivos() {
      return prisma.usuario.count({ where: { empresaId, papel: "ADMIN", ativo: true } });
    },

    async criarPrimeiroAdministrador(dados: Omit<NovoUsuario, "papel">) {
      return prisma.$transaction(async (tx) => {
        // Dois pedidos ao mesmo tempo: o segundo espera e já encontra o administrador criado.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"primeiro-acesso:" + empresaId}))`;

        if ((await tx.usuario.count({ where: { empresaId } })) > 0) {
          return null;
        }

        const criada = await tx.usuario.create({
          data: { empresaId, login: dados.login, nome: dados.nome, email: dados.email ?? null, papel: "ADMIN", senhaHash: dados.senhaHash },
        });

        return mapear(criada);
      });
    },

    async criarUsuario(dados: NovoUsuario) {
      try {
        const criada = await prisma.usuario.create({
          data: { empresaId, login: dados.login, nome: dados.nome, email: dados.email ?? null, papel: dados.papel, senhaHash: dados.senhaHash },
        });

        return mapear(criada);
      } catch (error) {
        if (loginEmUso(error)) {
          throw new Error("Já existe um usuário com esse nome de usuário.");
        }

        throw error;
      }
    },

    async atualizarUsuario(id, mudancas: MudancasDoUsuario) {
      const atualizada = await prisma.usuario.update({
        where: { id },
        data: {
          ...(mudancas.nome !== undefined ? { nome: mudancas.nome } : {}),
          ...(mudancas.email !== undefined ? { email: mudancas.email } : {}),
          ...(mudancas.papel !== undefined ? { papel: mudancas.papel } : {}),
          ...(mudancas.ativo !== undefined ? { ativo: mudancas.ativo } : {}),
          ...(mudancas.senhaHash !== undefined ? { senhaHash: mudancas.senhaHash } : {}),
          ...(mudancas.tentativasFalhas !== undefined ? { tentativasFalhas: mudancas.tentativasFalhas } : {}),
          ...(mudancas.bloqueadoAte !== undefined ? { bloqueadoAte: mudancas.bloqueadoAte } : {}),
          ...(mudancas.ultimoAcessoEm !== undefined ? { ultimoAcessoEm: mudancas.ultimoAcessoEm } : {}),
        },
      });

      return mapear(atualizada);
    },

    async criarSessao({ usuarioId, tokenHash, expiraEm, dispositivo }) {
      await prisma.sessao.create({ data: { usuarioId, tokenHash, expiraEm, dispositivo: dispositivo ?? null } });
    },

    async buscarSessaoPorHash(tokenHash) {
      const linha = await prisma.sessao.findUnique({ where: { tokenHash }, include: { usuario: true } });

      // A sessão só vale para usuários desta empresa.
      if (!linha || linha.usuario.empresaId !== empresaId) {
        return null;
      }

      return {
        sessao: {
          id: linha.id,
          usuarioId: linha.usuarioId,
          expiraEm: linha.expiraEm,
          ultimoUsoEm: linha.ultimoUsoEm,
          revogadaEm: linha.revogadaEm ?? undefined,
        },
        usuario: mapear(linha.usuario),
      };
    },

    async tocarSessao(id, em) {
      await prisma.sessao.update({ where: { id }, data: { ultimoUsoEm: em } });
    },

    async revogarSessaoPorHash(tokenHash, em) {
      await prisma.sessao.updateMany({ where: { tokenHash, revogadaEm: null }, data: { revogadaEm: em } });
    },

    async revogarSessoesDoUsuario(usuarioId, em, manterSessaoId) {
      await prisma.sessao.updateMany({
        where: { usuarioId, revogadaEm: null, ...(manterSessaoId ? { id: { not: manterSessaoId } } : {}) },
        data: { revogadaEm: em },
      });
    },
  };
}
