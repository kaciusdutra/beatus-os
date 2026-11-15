import type { AuthRepositoryPort, MudancasDoUsuario, NovoUsuario } from "../repositories/authRepositoryPort";

import type { SessaoSalva, UsuarioSalvo } from "../types/acesso";

import { AuthService, DIAS_DE_SESSAO, MAXIMO_DE_TENTATIVAS, MINUTOS_DE_BLOQUEIO } from "./authService";

let verificacoes = 0;

function verificar(condicao: boolean, mensagem: string): void {
  verificacoes++;

  if (!condicao) {
    throw new Error(`Falha: ${mensagem}`);
  }
}

async function recusa(promessa: Promise<unknown>): Promise<string> {
  try {
    await promessa;
  } catch (error) {
    return error instanceof Error ? error.message : "erro";
  }

  return "";
}

class BancoFalso implements AuthRepositoryPort {
  usuarios: UsuarioSalvo[] = [];
  sessoes: (SessaoSalva & { tokenHash: string })[] = [];
  contador = 0;
  toques = 0;

  async contarUsuarios() {
    return this.usuarios.length;
  }
  async buscarPorLogin(login: string) {
    const u = this.usuarios.find((x) => x.login === login);

    return u ? { ...u } : null;
  }
  async buscarPorId(id: string) {
    const u = this.usuarios.find((x) => x.id === id);

    return u ? { ...u } : null;
  }
  async listarUsuarios() {
    return [...this.usuarios];
  }
  async contarAdministradoresAtivos() {
    return this.usuarios.filter((u) => u.papel === "ADMIN" && u.ativo).length;
  }
  async criarPrimeiroAdministrador(dados: Omit<NovoUsuario, "papel">) {
    if (this.usuarios.length > 0) {
      return null;
    }

    return this.criarUsuario({ ...dados, papel: "ADMIN" });
  }
  async criarUsuario(dados: NovoUsuario) {
    if (this.usuarios.some((u) => u.login === dados.login)) {
      throw new Error("Já existe um usuário com esse nome de usuário.");
    }

    this.contador++;

    const usuario: UsuarioSalvo = { id: `u${this.contador}`, empresaId: "e1", ...dados, ativo: true, tentativasFalhas: 0, criadoEm: new Date(2026, 10, 15) };

    this.usuarios.push(usuario);

    return usuario;
  }
  async atualizarUsuario(id: string, mudancas: MudancasDoUsuario) {
    const usuario = this.usuarios.find((u) => u.id === id);

    if (!usuario) {
      throw new Error("sumiu");
    }

    const { email, bloqueadoAte, ...resto } = mudancas;

    Object.assign(usuario, resto);

    if (email !== undefined) {
      usuario.email = email ?? undefined;
    }

    if (bloqueadoAte !== undefined) {
      usuario.bloqueadoAte = bloqueadoAte ?? undefined;
    }

    return usuario;
  }
  async criarSessao(dados: { usuarioId: string; tokenHash: string; expiraEm: Date }) {
    this.contador++;

    this.sessoes.push({ id: `s${this.contador}`, usuarioId: dados.usuarioId, tokenHash: dados.tokenHash, expiraEm: dados.expiraEm, ultimoUsoEm: relogio });
  }
  async buscarSessaoPorHash(tokenHash: string) {
    const sessao = this.sessoes.find((s) => s.tokenHash === tokenHash);

    const usuario = sessao && this.usuarios.find((u) => u.id === sessao.usuarioId);

    return sessao && usuario ? { sessao: { ...sessao }, usuario: { ...usuario } } : null;
  }
  async tocarSessao(id: string, em: Date) {
    this.toques++;

    const sessao = this.sessoes.find((s) => s.id === id);

    if (sessao) {
      sessao.ultimoUsoEm = em;
    }
  }
  async revogarSessaoPorHash(tokenHash: string, em: Date) {
    this.sessoes.filter((s) => s.tokenHash === tokenHash).forEach((s) => (s.revogadaEm = em));
  }
  async revogarSessoesDoUsuario(usuarioId: string, em: Date, manter?: string) {
    this.sessoes.filter((s) => s.usuarioId === usuarioId && s.id !== manter && !s.revogadaEm).forEach((s) => (s.revogadaEm = em));
  }
}

let relogio = new Date(2026, 10, 15, 10, 0, 0);

function avancar(minutos: number): void {
  relogio = new Date(relogio.getTime() + minutos * 60000);
}

async function executarTestes(): Promise<void> {
  const banco = new BancoFalso();

  const diario: { acao: string; resumo: string; operador?: string | null }[] = [];

  const servico = new AuthService(banco, async (dados) => void diario.push(dados), () => relogio);

  const SENHA = "Hamburguer#2026";

  // ---------- Primeiro acesso ----------
  verificar(await servico.precisaDePrimeiroAcesso(), "sistema novo precisa do primeiro acesso");
  verificar((await recusa(servico.primeiroAcesso({ nome: "Kacius", login: "ka", senha: SENHA }))).includes("3 a 30"), "usuário curto");
  verificar((await recusa(servico.primeiroAcesso({ nome: "Kacius", login: "kacius", senha: "123" }))).includes("pelo menos"), "senha curta");
  verificar((await recusa(servico.primeiroAcesso({ nome: " ", login: "kacius", senha: SENHA }))).includes("nome"), "nome vazio");

  const admin = await servico.primeiroAcesso({ nome: "Kacius", login: "  Kacius ", senha: SENHA });

  verificar(admin.papel === "ADMIN" && admin.login === "kacius", "cria o administrador, usuário minúsculo");
  verificar(!("senhaHash" in admin) && !JSON.stringify(admin).includes("scrypt"), "o retorno público não leva a senha");
  verificar(banco.usuarios[0].senhaHash.startsWith("scrypt$") && !banco.usuarios[0].senhaHash.includes("Hamburguer"), "só o hash é guardado");
  verificar(!(await servico.precisaDePrimeiroAcesso()), "depois do primeiro, não precisa mais");
  verificar((await recusa(servico.primeiroAcesso({ nome: "Outro", login: "outro", senha: SENHA }))).includes("já foi feito"), "segundo primeiro acesso é recusado");
  verificar(diario.some((d) => d.acao === "PRIMEIRO_ACESSO"), "primeiro acesso no diário");

  // ---------- Entrar ----------
  verificar((await recusa(servico.entrar("kacius", "errada123"))) === "Usuário ou senha incorretos.", "senha errada");
  verificar((await recusa(servico.entrar("ninguem", SENHA))) === "Usuário ou senha incorretos.", "usuário inexistente dá a mesma mensagem");
  verificar((await recusa(servico.entrar("", ""))) === "Usuário ou senha incorretos.", "campos vazios");

  const entrada = await servico.entrar("KACIUS", SENHA, "Chrome no notebook");

  verificar(entrada.token.length >= 43 && entrada.usuario.nome === "Kacius", "entrou (usuário sem diferenciar maiúsculas)");
  verificar(banco.sessoes.length === 1 && banco.sessoes[0].tokenHash !== entrada.token, "o banco guarda só o hash do token");
  verificar(entrada.expiraEm.getTime() === relogio.getTime() + DIAS_DE_SESSAO * 86400000, "a sessão dura 7 dias");
  verificar(banco.usuarios[0].tentativasFalhas === 0 && banco.usuarios[0].ultimoAcessoEm !== undefined, "anota o último acesso");

  // ---------- Quem é o token ----------
  const eu = await servico.usuarioDoToken(entrada.token);

  verificar(eu?.nome === "Kacius" && eu.papel === "ADMIN", "token válido");
  verificar((await servico.usuarioDoToken("token-inventado")) === null, "token inventado");
  verificar((await servico.usuarioDoToken("")) === null, "token vazio");
  verificar(banco.toques === 0, "uso recente não grava toda hora");

  avancar(6);

  await servico.usuarioDoToken(entrada.token);

  verificar(banco.toques === 1, "depois de alguns minutos anota o uso");

  // ---------- Bloqueio por tentativas ----------
  for (let i = 1; i < MAXIMO_DE_TENTATIVAS; i++) {
    await recusa(servico.entrar("kacius", "errada123"));
  }

  verificar(banco.usuarios[0].tentativasFalhas === MAXIMO_DE_TENTATIVAS - 1 && !banco.usuarios[0].bloqueadoAte, "quase bloqueado");

  await recusa(servico.entrar("kacius", "errada123"));

  verificar(banco.usuarios[0].bloqueadoAte !== undefined, "bloqueou na tentativa limite");
  verificar(diario.some((d) => d.acao === "USUARIO_BLOQUEADO"), "bloqueio no diário");
  verificar((await recusa(servico.entrar("kacius", SENHA))).includes("Muitas tentativas"), "bloqueado nem com a senha certa");

  avancar(MINUTOS_DE_BLOQUEIO + 1);

  verificar((await servico.entrar("kacius", SENHA)).usuario.login === "kacius", "passado o tempo, entra de novo");
  verificar(banco.usuarios[0].tentativasFalhas === 0 && !banco.usuarios[0].bloqueadoAte, "zera o bloqueio ao entrar");

  // Acerto no meio das tentativas zera a contagem.
  await recusa(servico.entrar("kacius", "errada123"));
  await recusa(servico.entrar("kacius", "errada123"));
  await servico.entrar("kacius", SENHA);

  verificar(banco.usuarios[0].tentativasFalhas === 0, "acerto zera as tentativas");

  // ---------- Sessão: validade, saída ----------
  const outra = await servico.entrar("kacius", SENHA);

  verificar((await servico.usuarioDoToken(outra.token)) !== null, "sessão nova vale");

  await servico.sair(outra.token);

  verificar((await servico.usuarioDoToken(outra.token)) === null, "depois de sair, o token não vale");

  const longa = await servico.entrar("kacius", SENHA);

  avancar(DIAS_DE_SESSAO * 24 * 60 + 1);

  verificar((await servico.usuarioDoToken(longa.token)) === null, "sessão vencida não vale");

  // ---------- Criar usuários ----------
  const maria = await servico.criarUsuario({ nome: "Maria", login: "maria", papel: "OPERADOR", senha: "Cozinha#2026" }, { id: admin.id, nome: "Kacius" });

  verificar(maria.papel === "OPERADOR" && maria.ativo, "cria operador");
  verificar((await recusa(servico.criarUsuario({ nome: "Maria 2", login: "maria", papel: "OPERADOR", senha: "Cozinha#2026" }, { id: admin.id, nome: "Kacius" }))).includes("Já existe"), "usuário repetido");
  verificar((await recusa(servico.criarUsuario({ nome: "X", login: "xis", papel: "DONO", senha: "Cozinha#2026" }, { id: admin.id, nome: "Kacius" }))).includes("perfil"), "perfil inventado");
  verificar((await recusa(servico.criarUsuario({ nome: "X", login: "xis", papel: "GESTOR", senha: "12345678" }, { id: admin.id, nome: "Kacius" }))).includes("comum"), "senha fraca");
  verificar((await recusa(servico.criarUsuario({ nome: "X", login: "xis", papel: "GESTOR", senha: "Cozinha#2026", email: "naoeemail" }, { id: admin.id, nome: "Kacius" }))).includes("e-mail"), "e-mail inválido");
  verificar(diario.some((d) => d.acao === "USUARIO_CRIADO" && d.operador === "Kacius"), "criação no diário, com quem fez");

  const sessaoMaria = await servico.entrar("maria", "Cozinha#2026");

  verificar((await servico.usuarioDoToken(sessaoMaria.token))?.papel === "OPERADOR", "maria entra como operador");

  // ---------- Alterar usuários ----------
  const ator = { id: admin.id, nome: "Kacius" };

  await servico.atualizarUsuario(maria.id, { papel: "GESTOR" }, ator);

  verificar((await servico.usuarioDoToken(sessaoMaria.token))?.papel === "GESTOR", "mudança de perfil vale na hora (o perfil é lido do banco)");
  verificar(diario.some((d) => d.acao === "USUARIO_ALTERADO" && d.resumo.includes("Operador de caixa para Gestor")), "mudança de perfil no diário com antes e depois");

  verificar((await recusa(servico.atualizarUsuario(admin.id, { ativo: false }, ator))).includes("próprio acesso"), "não desativa a si mesmo");
  verificar((await recusa(servico.atualizarUsuario(admin.id, { papel: "GESTOR" }, ator))).includes("próprio acesso"), "não rebaixa a si mesmo");

  const segundoAdmin = await servico.criarUsuario({ nome: "Irmão", login: "irmao", papel: "ADMIN", senha: "Cozinha#2026" }, ator);

  // O segundo admin tenta tirar o primeiro: pode, porque sobra ele. Depois não pode tirar o último.
  await servico.atualizarUsuario(admin.id, { papel: "GESTOR" }, { id: segundoAdmin.id, nome: "Irmão" });

  verificar((await recusa(servico.atualizarUsuario(segundoAdmin.id, { papel: "GESTOR" }, { id: admin.id, nome: "Kacius" }))).includes("pelo menos um administrador"), "não tira o último administrador");

  await servico.atualizarUsuario(admin.id, { papel: "ADMIN" }, { id: segundoAdmin.id, nome: "Irmão" });

  await servico.atualizarUsuario(maria.id, { ativo: false }, ator);

  verificar((await servico.usuarioDoToken(sessaoMaria.token)) === null, "desativar encerra as entradas na hora");
  verificar((await recusa(servico.entrar("maria", "Cozinha#2026"))) === "Usuário ou senha incorretos.", "desativado não entra, sem dizer que existe");

  await servico.atualizarUsuario(maria.id, { ativo: true }, ator);

  verificar((await servico.entrar("maria", "Cozinha#2026")).usuario.login === "maria", "reativado entra");

  // ---------- Senhas ----------
  const antes = await servico.entrar("maria", "Cozinha#2026");

  await servico.redefinirSenha(maria.id, "NovaSenha#99", ator);

  verificar((await servico.usuarioDoToken(antes.token)) === null, "redefinir a senha encerra as entradas");
  verificar((await recusa(servico.entrar("maria", "Cozinha#2026"))) !== "", "senha antiga não vale");
  verificar((await servico.entrar("maria", "NovaSenha#99")).usuario.login === "maria", "senha nova vale");
  verificar((await recusa(servico.redefinirSenha(maria.id, "curta", ator))).includes("pelo menos"), "senha nova precisa ser boa");
  verificar(diario.some((d) => d.acao === "SENHA_REDEFINIDA"), "redefinição no diário");

  // Desbloquear
  for (let i = 0; i < MAXIMO_DE_TENTATIVAS; i++) {
    await recusa(servico.entrar("maria", "errada123"));
  }

  verificar((await recusa(servico.entrar("maria", "NovaSenha#99"))).includes("Muitas tentativas"), "maria bloqueada");

  await servico.desbloquear(maria.id, ator);

  verificar((await servico.entrar("maria", "NovaSenha#99")).usuario.login === "maria", "desbloqueada entra");

  // Trocar a própria senha: mantém esta entrada, encerra as outras.
  const celular = await servico.entrar("maria", "NovaSenha#99");

  const notebook = await servico.entrar("maria", "NovaSenha#99");

  const dona = (await servico.usuarioDoToken(notebook.token))!;

  verificar((await recusa(servico.trocarMinhaSenha(dona, "errada", "OutraSenha#77"))).includes("não confere"), "senha atual errada");

  await servico.trocarMinhaSenha(dona, "NovaSenha#99", "OutraSenha#77");

  verificar((await servico.usuarioDoToken(notebook.token)) !== null, "a entrada atual continua");
  verificar((await servico.usuarioDoToken(celular.token)) === null, "as outras entradas saem");
  verificar((await servico.entrar("maria", "OutraSenha#77")).usuario.login === "maria", "senha trocada vale");

  verificar((await servico.listarUsuarios()).length === 3, "lista os usuários");
  verificar(!JSON.stringify(await servico.listarUsuarios()).includes("scrypt"), "a lista nunca leva hash");
}

void executarTestes().then(() => {
  console.log(`✅ Testes do serviço de acesso passaram (${verificacoes} verificações).`);
});
