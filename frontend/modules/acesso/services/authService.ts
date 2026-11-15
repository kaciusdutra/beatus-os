import { conferirSenha, hashDaSenha, hashDoToken, hashParaDisfarce, normalizarLogin, novoTokenDeSessao, problemaNaSenha, problemaNoLogin } from "@/core/auth/senha";

import type { AuthRepositoryPort } from "../repositories/authRepositoryPort";

import { PAPEIS, ROTULO_DO_PAPEL, type Ator, type PapelDoUsuario, type UsuarioDaSessao, type UsuarioPublico, type UsuarioSalvo } from "../types/acesso";

// Quantos erros seguidos de senha bloqueiam o acesso, e por quanto tempo.
export const MAXIMO_DE_TENTATIVAS = 5;

export const MINUTOS_DE_BLOQUEIO = 15;

// Quanto dura uma entrada e de quanto em quanto tempo o uso é anotado.
export const DIAS_DE_SESSAO = 7;

export const MINUTOS_ENTRE_USOS_ANOTADOS = 5;

const ERRO_GENERICO = "Usuário ou senha incorretos.";

export type RegistrarNoDiario = (dados: {
  acao: string;
  resumo: string;
  referenciaId?: string;
  operador?: string | null;
}) => Promise<void>;

export interface EntradaFeita {
  token: string;
  expiraEm: Date;
  usuario: UsuarioPublico;
}

export function paraPublico(usuario: UsuarioSalvo): UsuarioPublico {
  return {
    id: usuario.id,
    login: usuario.login,
    nome: usuario.nome,
    email: usuario.email,
    papel: usuario.papel,
    ativo: usuario.ativo,
    bloqueadoAte: usuario.bloqueadoAte?.toISOString(),
    ultimoAcessoEm: usuario.ultimoAcessoEm?.toISOString(),
    criadoEm: usuario.criadoEm.toISOString(),
  };
}

function problemaNosDados(dados: { nome: string; email?: string }): string | null {
  const nome = dados.nome.trim();

  if (!nome) {
    return "Informe o nome.";
  }

  if (nome.length > 60) {
    return "O nome pode ter até 60 letras.";
  }

  if (dados.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.email.trim())) {
    return "O e-mail não parece válido.";
  }

  return null;
}

function validarPapel(papel: string): PapelDoUsuario {
  if (!PAPEIS.includes(papel as PapelDoUsuario)) {
    throw new Error("Escolha um perfil válido.");
  }

  return papel as PapelDoUsuario;
}

export class AuthService {
  constructor(
    private readonly repository: AuthRepositoryPort,
    private readonly registrar?: RegistrarNoDiario,
    // Para testar o tempo sem esperar.
    private readonly agora: () => Date = () => new Date()
  ) {}

  private em(minutos: number): Date {
    return new Date(this.agora().getTime() + minutos * 60000);
  }

  // ---------- Primeiro acesso ----------

  async precisaDePrimeiroAcesso(): Promise<boolean> {
    return (await this.repository.contarUsuarios()) === 0;
  }

  // Cria o administrador. Só funciona enquanto não existir nenhum usuário.
  async primeiroAcesso(dados: { nome: string; login: string; senha: string; email?: string }): Promise<UsuarioPublico> {
    const login = normalizarLogin(dados.login);

    const problema = problemaNoLogin(login) ?? problemaNosDados(dados) ?? problemaNaSenha(dados.senha, login);

    if (problema) {
      throw new Error(problema);
    }

    const criado = await this.repository.criarPrimeiroAdministrador({
      login,
      nome: dados.nome.trim(),
      email: dados.email?.trim() || undefined,
      senhaHash: await hashDaSenha(dados.senha),
    });

    if (!criado) {
      throw new Error("O primeiro acesso já foi feito. Peça ao administrador para criar o seu usuário.");
    }

    await this.registrar?.({
      acao: "PRIMEIRO_ACESSO",
      resumo: `Primeiro acesso: administrador ${criado.nome} (${criado.login}) criado.`,
      referenciaId: criado.id,
      operador: criado.nome,
    });

    return paraPublico(criado);
  }

  // ---------- Entrar e sair ----------

  async entrar(loginDigitado: string, senha: string, dispositivo?: string): Promise<EntradaFeita> {
    const login = normalizarLogin(loginDigitado);

    const usuario = login && senha ? await this.repository.buscarPorLogin(login) : null;

    if (!usuario) {
      // Gasta o mesmo tempo de uma conferência, para não revelar quais usuários existem.
      await conferirSenha(senha || "x", await hashParaDisfarce());

      throw new Error(ERRO_GENERICO);
    }

    const agora = this.agora();

    if (usuario.bloqueadoAte && usuario.bloqueadoAte > agora) {
      const minutos = Math.max(1, Math.ceil((usuario.bloqueadoAte.getTime() - agora.getTime()) / 60000));

      throw new Error(`Muitas tentativas erradas. Tente de novo em ${minutos} minuto(s).`);
    }

    const confere = await conferirSenha(senha, usuario.senhaHash);

    if (!confere || !usuario.ativo) {
      if (!confere) {
        await this.anotarFalha(usuario);
      }

      throw new Error(ERRO_GENERICO);
    }

    const token = novoTokenDeSessao();

    const expiraEm = this.em(DIAS_DE_SESSAO * 24 * 60);

    await this.repository.criarSessao({ usuarioId: usuario.id, tokenHash: hashDoToken(token), expiraEm, dispositivo: dispositivo?.slice(0, 200) });

    const atualizado = await this.repository.atualizarUsuario(usuario.id, { tentativasFalhas: 0, bloqueadoAte: null, ultimoAcessoEm: agora });

    return { token, expiraEm, usuario: paraPublico(atualizado) };
  }

  private async anotarFalha(usuario: UsuarioSalvo): Promise<void> {
    const tentativas = usuario.tentativasFalhas + 1;

    if (tentativas >= MAXIMO_DE_TENTATIVAS) {
      await this.repository.atualizarUsuario(usuario.id, { tentativasFalhas: 0, bloqueadoAte: this.em(MINUTOS_DE_BLOQUEIO) });

      await this.registrar?.({
        acao: "USUARIO_BLOQUEADO",
        resumo: `Acesso de ${usuario.nome} (${usuario.login}) bloqueado por ${MINUTOS_DE_BLOQUEIO} minutos após ${MAXIMO_DE_TENTATIVAS} senhas erradas.`,
        referenciaId: usuario.id,
        operador: null,
      });

      return;
    }

    await this.repository.atualizarUsuario(usuario.id, { tentativasFalhas: tentativas });
  }

  // Quem é a pessoa deste token? Nulo se a entrada não vale mais (acabou, foi
  // encerrada ou o usuário foi desativado).
  async usuarioDoToken(token: string): Promise<UsuarioDaSessao | null> {
    if (!token) {
      return null;
    }

    const achado = await this.repository.buscarSessaoPorHash(hashDoToken(token));

    if (!achado) {
      return null;
    }

    const { sessao, usuario } = achado;

    const agora = this.agora();

    if (sessao.revogadaEm || sessao.expiraEm <= agora || !usuario.ativo) {
      return null;
    }

    if (agora.getTime() - sessao.ultimoUsoEm.getTime() > MINUTOS_ENTRE_USOS_ANOTADOS * 60000) {
      await this.repository.tocarSessao(sessao.id, agora);
    }

    return { id: usuario.id, login: usuario.login, nome: usuario.nome, papel: usuario.papel, sessaoId: sessao.id };
  }

  async sair(token: string): Promise<void> {
    if (token) {
      await this.repository.revogarSessaoPorHash(hashDoToken(token), this.agora());
    }
  }

  // ---------- A própria conta ----------

  async trocarMinhaSenha(usuario: UsuarioDaSessao, senhaAtual: string, novaSenha: string): Promise<void> {
    const salvo = await this.repository.buscarPorId(usuario.id);

    if (!salvo || !(await conferirSenha(senhaAtual, salvo.senhaHash))) {
      throw new Error("A senha atual não confere.");
    }

    const problema = problemaNaSenha(novaSenha, salvo.login);

    if (problema) {
      throw new Error(problema);
    }

    await this.repository.atualizarUsuario(salvo.id, { senhaHash: await hashDaSenha(novaSenha) });

    // Quem estava com a senha antiga em outro aparelho sai; esta entrada continua.
    await this.repository.revogarSessoesDoUsuario(salvo.id, this.agora(), usuario.sessaoId);

    await this.registrar?.({ acao: "SENHA_TROCADA", resumo: `${salvo.nome} trocou a própria senha.`, referenciaId: salvo.id, operador: salvo.nome });
  }

  // ---------- Administração de usuários ----------

  async listarUsuarios(): Promise<UsuarioPublico[]> {
    return (await this.repository.listarUsuarios()).map(paraPublico);
  }

  async criarUsuario(dados: { nome: string; login: string; email?: string; papel: string; senha: string }, ator: Ator): Promise<UsuarioPublico> {
    const login = normalizarLogin(dados.login);

    const papel = validarPapel(dados.papel);

    const problema = problemaNoLogin(login) ?? problemaNosDados(dados) ?? problemaNaSenha(dados.senha, login);

    if (problema) {
      throw new Error(problema);
    }

    const criado = await this.repository.criarUsuario({
      login,
      nome: dados.nome.trim(),
      email: dados.email?.trim() || undefined,
      papel,
      senhaHash: await hashDaSenha(dados.senha),
    });

    await this.registrar?.({
      acao: "USUARIO_CRIADO",
      resumo: `Usuário criado: ${criado.nome} (${criado.login}), perfil ${ROTULO_DO_PAPEL[criado.papel]}.`,
      referenciaId: criado.id,
      operador: ator.nome,
    });

    return paraPublico(criado);
  }

  async atualizarUsuario(
    id: string,
    mudancas: { nome?: string; email?: string | null; papel?: string; ativo?: boolean },
    ator: Ator
  ): Promise<UsuarioPublico> {
    const alvo = await this.repository.buscarPorId(id);

    if (!alvo) {
      throw new Error("Usuário não encontrado.");
    }

    const novoPapel = mudancas.papel !== undefined ? validarPapel(mudancas.papel) : alvo.papel;

    const novoNome = mudancas.nome !== undefined ? mudancas.nome : alvo.nome;

    const novoEmail = mudancas.email === undefined ? alvo.email : mudancas.email || undefined;

    const problema = problemaNosDados({ nome: novoNome, email: novoEmail });

    if (problema) {
      throw new Error(problema);
    }

    const novoAtivo = mudancas.ativo ?? alvo.ativo;

    const perdeAcessoDeAdmin = alvo.papel === "ADMIN" && alvo.ativo && (novoPapel !== "ADMIN" || !novoAtivo);

    if (alvo.id === ator.id && (!novoAtivo || novoPapel !== alvo.papel)) {
      throw new Error("Você não pode desativar nem mudar o perfil do seu próprio acesso. Peça a outro administrador.");
    }

    if (perdeAcessoDeAdmin && (await this.repository.contarAdministradoresAtivos()) <= 1) {
      throw new Error("Precisa existir pelo menos um administrador ativo.");
    }

    const atualizado = await this.repository.atualizarUsuario(id, {
      nome: novoNome.trim(),
      email: novoEmail ?? null,
      papel: novoPapel,
      ativo: novoAtivo,
    });

    if (alvo.ativo && !novoAtivo) {
      await this.repository.revogarSessoesDoUsuario(id, this.agora());
    }

    const partes: string[] = [];

    if (novoPapel !== alvo.papel) {
      partes.push(`perfil de ${ROTULO_DO_PAPEL[alvo.papel]} para ${ROTULO_DO_PAPEL[novoPapel]}`);
    }

    if (novoAtivo !== alvo.ativo) {
      partes.push(novoAtivo ? "reativado" : "desativado");
    }

    if (novoNome.trim() !== alvo.nome) {
      partes.push(`nome de ${alvo.nome} para ${novoNome.trim()}`);
    }

    if ((novoEmail ?? "") !== (alvo.email ?? "")) {
      partes.push("e-mail alterado");
    }

    if (partes.length > 0) {
      await this.registrar?.({ acao: "USUARIO_ALTERADO", resumo: `Usuário ${alvo.login} alterado: ${partes.join("; ")}.`, referenciaId: id, operador: ator.nome });
    }

    return paraPublico(atualizado);
  }

  // O administrador define uma senha nova (esqueceu, trocou de pessoa...). Encerra as entradas da pessoa.
  async redefinirSenha(id: string, novaSenha: string, ator: Ator): Promise<void> {
    const alvo = await this.repository.buscarPorId(id);

    if (!alvo) {
      throw new Error("Usuário não encontrado.");
    }

    const problema = problemaNaSenha(novaSenha, alvo.login);

    if (problema) {
      throw new Error(problema);
    }

    await this.repository.atualizarUsuario(id, { senhaHash: await hashDaSenha(novaSenha), tentativasFalhas: 0, bloqueadoAte: null });

    await this.repository.revogarSessoesDoUsuario(id, this.agora());

    await this.registrar?.({ acao: "SENHA_REDEFINIDA", resumo: `A senha de ${alvo.nome} (${alvo.login}) foi redefinida.`, referenciaId: id, operador: ator.nome });
  }

  async desbloquear(id: string, ator: Ator): Promise<void> {
    const alvo = await this.repository.buscarPorId(id);

    if (!alvo) {
      throw new Error("Usuário não encontrado.");
    }

    await this.repository.atualizarUsuario(id, { tentativasFalhas: 0, bloqueadoAte: null });

    await this.registrar?.({ acao: "USUARIO_DESBLOQUEADO", resumo: `Acesso de ${alvo.nome} (${alvo.login}) desbloqueado.`, referenciaId: id, operador: ator.nome });
  }
}
