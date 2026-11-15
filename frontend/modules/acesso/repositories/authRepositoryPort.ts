import type { PapelDoUsuario, SessaoSalva, UsuarioSalvo } from "../types/acesso";

export interface NovoUsuario {
  login: string;
  nome: string;
  email?: string;
  papel: PapelDoUsuario;
  senhaHash: string;
}

export interface MudancasDoUsuario {
  nome?: string;
  email?: string | null;
  papel?: PapelDoUsuario;
  ativo?: boolean;
  senhaHash?: string;
  tentativasFalhas?: number;
  bloqueadoAte?: Date | null;
  ultimoAcessoEm?: Date;
}

export interface AuthRepositoryPort {
  contarUsuarios(): Promise<number>;

  buscarPorLogin(login: string): Promise<UsuarioSalvo | null>;

  buscarPorId(id: string): Promise<UsuarioSalvo | null>;

  listarUsuarios(): Promise<UsuarioSalvo[]>;

  contarAdministradoresAtivos(): Promise<number>;

  // Cria o administrador só se ainda não existir nenhum usuário (de forma atômica,
  // mesmo com dois pedidos ao mesmo tempo). Devolve null se já existe usuário.
  criarPrimeiroAdministrador(dados: Omit<NovoUsuario, "papel">): Promise<UsuarioSalvo | null>;

  // Lança "Já existe um usuário com esse nome de usuário." se o login estiver em uso.
  criarUsuario(dados: NovoUsuario): Promise<UsuarioSalvo>;

  atualizarUsuario(id: string, mudancas: MudancasDoUsuario): Promise<UsuarioSalvo>;

  criarSessao(dados: { usuarioId: string; tokenHash: string; expiraEm: Date; dispositivo?: string }): Promise<void>;

  buscarSessaoPorHash(tokenHash: string): Promise<{ sessao: SessaoSalva; usuario: UsuarioSalvo } | null>;

  tocarSessao(id: string, em: Date): Promise<void>;

  revogarSessaoPorHash(tokenHash: string, em: Date): Promise<void>;

  // Revoga todas as sessões abertas da pessoa (menos a indicada, se houver).
  revogarSessoesDoUsuario(usuarioId: string, em: Date, manterSessaoId?: string): Promise<void>;
}
