"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

import Link from "next/link";

import { chamarApi } from "@/shared/api/chamarApi";

import { useUsuario } from "@/shared/auth/UsuarioContext";

import { PAPEIS, ROTULO_DO_PAPEL, type PapelDoUsuario, type UsuarioPublico } from "../types/acesso";

const CLASSE_CAMPO =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500";

function dataHora(iso?: string): string {
  return iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "nunca";
}

function bloqueado(usuario: UsuarioPublico): boolean {
  return Boolean(usuario.bloqueadoAte && new Date(usuario.bloqueadoAte) > new Date());
}

export default function UsuariosPage() {
  const eu = useUsuario();

  const [usuarios, setUsuarios] = useState<UsuarioPublico[]>([]);

  const [erro, setErro] = useState("");

  const [aviso, setAviso] = useState("");

  const [nome, setNome] = useState("");

  const [login, setLogin] = useState("");

  const [email, setEmail] = useState("");

  const [papel, setPapel] = useState<PapelDoUsuario>("OPERADOR");

  const [senha, setSenha] = useState("");

  const [redefinindo, setRedefinindo] = useState<string | null>(null);

  const [novaSenha, setNovaSenha] = useState("");

  const carregar = useCallback(async () => {
    const dados = await chamarApi<{ usuarios: UsuarioPublico[] }>("/api/usuarios", { falha: "Não foi possível ler os usuários." });

    setUsuarios(dados.usuarios);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await carregar();
      } catch (error) {
        setErro(error instanceof Error ? error.message : "Não foi possível ler os usuários.");
      }
    })();
  }, [carregar]);

  async function executar(acao: () => Promise<unknown>, sucesso: string) {
    try {
      setErro("");
      setAviso("");

      await acao();

      setAviso(sucesso);

      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível concluir.");
    }
  }

  async function criar(evento: FormEvent) {
    evento.preventDefault();

    await executar(async () => {
      await chamarApi("/api/usuarios", { corpo: { nome, login, email, papel, senha }, falha: "Não foi possível criar o usuário." });

      setNome("");
      setLogin("");
      setEmail("");
      setSenha("");
    }, "Usuário criado. Passe a senha para a pessoa e peça que a troque em Minha conta.");
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/configuracoes" className="text-sm font-medium text-slate-500 hover:text-slate-700">
          ← Configurações
        </Link>

        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Usuários e acessos</h1>

        <p className="mt-2 max-w-3xl text-sm text-slate-500">
          Cada pessoa entra com o próprio usuário e senha, e o perfil define o que ela vê e faz. O nome dela fica registrado em tudo que ela fizer
          (Registro de atividades). Desativar uma pessoa encerra as entradas dela na hora.
        </p>
      </div>

      {erro && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>}

      {aviso && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{aviso}</div>}

      <form onSubmit={(evento) => void criar(evento)} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Novo usuário</h2>

        <div className="grid gap-3 md:grid-cols-5">
          <input aria-label="Nome" value={nome} onChange={(evento) => setNome(evento.target.value)} placeholder="Nome" className={CLASSE_CAMPO} />

          <input aria-label="Usuário" value={login} onChange={(evento) => setLogin(evento.target.value)} placeholder="Usuário (para entrar)" autoCapitalize="none" className={CLASSE_CAMPO} />

          <input aria-label="E-mail" value={email} onChange={(evento) => setEmail(evento.target.value)} placeholder="E-mail (opcional)" className={CLASSE_CAMPO} />

          <select aria-label="Perfil" value={papel} onChange={(evento) => setPapel(evento.target.value as PapelDoUsuario)} className={CLASSE_CAMPO}>
            {PAPEIS.map((opcao) => (
              <option key={opcao} value={opcao}>{ROTULO_DO_PAPEL[opcao]}</option>
            ))}
          </select>

          <input aria-label="Senha inicial" type="password" value={senha} onChange={(evento) => setSenha(evento.target.value)} placeholder="Senha inicial" autoComplete="new-password" className={CLASSE_CAMPO} />
        </div>

        <button type="submit" disabled={!nome.trim() || !login.trim() || !senha} className="cursor-pointer rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40">
          Criar usuário
        </button>
      </form>

      <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Pessoa</th>
              <th className="px-4 py-3">Perfil</th>
              <th className="px-4 py-3">Situação</th>
              <th className="px-4 py-3">Último acesso</th>
              <th className="px-4 py-3">Ações</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {usuarios.map((usuario) => {
              const sou = usuario.id === eu?.id;

              return (
                <tr key={usuario.id} className={usuario.ativo ? "" : "bg-slate-50 text-slate-400"}>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{usuario.nome}{sou ? " (você)" : ""}</p>

                    <p className="text-xs text-slate-400">{usuario.login}{usuario.email ? ` · ${usuario.email}` : ""}</p>
                  </td>

                  <td className="px-4 py-3">
                    <select
                      aria-label={`Perfil de ${usuario.nome}`}
                      value={usuario.papel}
                      disabled={sou}
                      onChange={(evento) => void executar(() => chamarApi(`/api/usuarios/${usuario.id}`, { metodo: "PUT", corpo: { papel: evento.target.value }, falha: "Não foi possível mudar o perfil." }), "Perfil alterado.")}
                      className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm disabled:opacity-60"
                    >
                      {PAPEIS.map((opcao) => (
                        <option key={opcao} value={opcao}>{ROTULO_DO_PAPEL[opcao]}</option>
                      ))}
                    </select>
                  </td>

                  <td className="px-4 py-3">
                    {!usuario.ativo ? "Desativado" : bloqueado(usuario) ? <span className="font-semibold text-amber-700">Bloqueado até {dataHora(usuario.bloqueadoAte)}</span> : "Ativo"}
                  </td>

                  <td className="px-4 py-3 text-xs">{dataHora(usuario.ultimoAcessoEm)}</td>

                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
                      {!sou && (
                        <button
                          type="button"
                          onClick={() => void executar(() => chamarApi(`/api/usuarios/${usuario.id}`, { metodo: "PUT", corpo: { ativo: !usuario.ativo }, falha: "Não foi possível alterar." }), usuario.ativo ? "Usuário desativado." : "Usuário reativado.")}
                          className="cursor-pointer text-slate-700 underline"
                        >
                          {usuario.ativo ? "Desativar" : "Reativar"}
                        </button>
                      )}

                      <button type="button" onClick={() => { setRedefinindo(redefinindo === usuario.id ? null : usuario.id); setNovaSenha(""); }} className="cursor-pointer text-slate-700 underline">
                        Redefinir senha
                      </button>

                      {bloqueado(usuario) && (
                        <button type="button" onClick={() => void executar(() => chamarApi(`/api/usuarios/${usuario.id}/desbloquear`, { corpo: {}, falha: "Não foi possível desbloquear." }), "Desbloqueado.")} className="cursor-pointer text-amber-700 underline">
                          Desbloquear
                        </button>
                      )}
                    </div>

                    {redefinindo === usuario.id && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <input aria-label={`Nova senha de ${usuario.nome}`} type="password" value={novaSenha} onChange={(evento) => setNovaSenha(evento.target.value)} placeholder="Nova senha" autoComplete="new-password" className="w-44 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />

                        <button
                          type="button"
                          disabled={!novaSenha}
                          onClick={() => void executar(async () => { await chamarApi(`/api/usuarios/${usuario.id}/senha`, { corpo: { novaSenha }, falha: "Não foi possível redefinir." }); setRedefinindo(null); setNovaSenha(""); }, "Senha redefinida. As entradas da pessoa foram encerradas.")}
                          className="cursor-pointer rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                        >
                          Salvar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}

            {usuarios.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">Nenhum usuário.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
