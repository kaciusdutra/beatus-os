"use client";

import { useCallback, useEffect, useState } from "react";

import { TIPOS_DE_VANTAGEM, descreverVantagem, type TipoDeVantagem } from "../vantagens";

interface Vantagem {
  id: string;
  nome: string;
  descricao: string | null;
  tipo: TipoDeVantagem;
  categoria: string | null;
  valorMaximo: number | null;
  percentual: number | null;
  ativa: boolean;
  ordem: number;
  descricaoParaOCliente: string;
}

interface Formulario {
  id?: string;
  nome: string;
  descricao: string;
  tipo: TipoDeVantagem;
  categoria: string;
  valorMaximo: string;
  percentual: string;
  ativa: boolean;
  ordem: string;
}

const VAZIO: Formulario = { nome: "", descricao: "", tipo: "ITEM_GRATIS", categoria: "HAMBÚRGUER", valorMaximo: "", percentual: "", ativa: true, ordem: "0" };

const CLASSE_CAMPO = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500";

// O catálogo de vantagens do clube (seção 28): o que o cliente escolhe ao completar o cartão. O que ele já escolheu
// não muda quando você edita aqui (o resgate guarda uma cópia).
export default function VantagensPage() {
  const [vantagens, setVantagens] = useState<Vantagem[]>([]);

  const [formulario, setFormulario] = useState<Formulario | null>(null);

  const [erro, setErro] = useState("");

  const [mensagem, setMensagem] = useState("");

  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    const resposta = await fetch("/api/clube/vantagens", { cache: "no-store" });

    const dados = await resposta.json();

    if (!resposta.ok || !dados.sucesso) {
      throw new Error(dados.mensagem || "Não foi possível ler as vantagens.");
    }

    setVantagens(dados.vantagens);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await carregar();
      } catch (error) {
        setErro(error instanceof Error ? error.message : "Não foi possível ler as vantagens.");
      } finally {
        setCarregando(false);
      }
    })();
  }, [carregar]);

  async function salvar(corpo: object, id?: string) {
    try {
      setErro("");

      setMensagem("");

      const resposta = await fetch(id ? `/api/clube/vantagens/${id}` : "/api/clube/vantagens", { method: id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) });

      const dados = await resposta.json();

      if (!resposta.ok || !dados.sucesso) {
        throw new Error(dados.mensagem || "Não foi possível salvar a vantagem.");
      }

      setFormulario(null);

      setMensagem("Vantagem salva.");

      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível salvar a vantagem.");
    }
  }

  function editar(vantagem: Vantagem) {
    setErro("");

    setMensagem("");

    setFormulario({
      id: vantagem.id,
      nome: vantagem.nome,
      descricao: vantagem.descricao ?? "",
      tipo: vantagem.tipo,
      categoria: vantagem.categoria ?? "",
      valorMaximo: vantagem.valorMaximo === null ? "" : String(vantagem.valorMaximo).replace(".", ","),
      percentual: vantagem.percentual === null ? "" : String(vantagem.percentual).replace(".", ","),
      ativa: vantagem.ativa,
      ordem: String(vantagem.ordem),
    });
  }

  const ajuda = TIPOS_DE_VANTAGEM.find((item) => item.chave === formulario?.tipo)?.ajuda;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-slate-500">Configurações</p>

        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Vantagens do clube</h1>

        <p className="mt-2 max-w-3xl text-sm text-slate-500">
          O cliente que completa o cartão de selos escolhe <strong>uma</strong> destas vantagens (não são cumulativas). Mudar ou desativar uma vantagem aqui não altera a que o cliente já escolheu. O valor da vantagem é abatido no pedido pelo servidor.
        </p>
      </div>

      {erro && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>}

      {mensagem && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{mensagem}</div>}

      {!formulario && (
        <button type="button" onClick={() => setFormulario({ ...VAZIO })} className="cursor-pointer rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
          Nova vantagem
        </button>
      )}

      {formulario && (
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">{formulario.id ? "Editar vantagem" : "Nova vantagem"}</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="v-nome" className="mb-1 block text-xs font-semibold text-slate-600">
                Nome (o cliente lê)
              </label>

              <input id="v-nome" value={formulario.nome} onChange={(evento) => setFormulario({ ...formulario, nome: evento.target.value })} placeholder="Ex.: Hambúrguer por conta da casa" className={CLASSE_CAMPO} />
            </div>

            <div>
              <label htmlFor="v-tipo" className="mb-1 block text-xs font-semibold text-slate-600">
                Tipo
              </label>

              <select id="v-tipo" value={formulario.tipo} onChange={(evento) => setFormulario({ ...formulario, tipo: evento.target.value as TipoDeVantagem })} className={CLASSE_CAMPO}>
                {TIPOS_DE_VANTAGEM.map((tipo) => (
                  <option key={tipo.chave} value={tipo.chave}>
                    {tipo.rotulo}
                  </option>
                ))}
              </select>

              {ajuda && <p className="mt-1 text-xs text-slate-500">{ajuda}</p>}
            </div>

            <div>
              <label htmlFor="v-ordem" className="mb-1 block text-xs font-semibold text-slate-600">
                Ordem na lista
              </label>

              <input id="v-ordem" inputMode="numeric" value={formulario.ordem} onChange={(evento) => setFormulario({ ...formulario, ordem: evento.target.value })} className={CLASSE_CAMPO} />
            </div>

            {formulario.tipo === "ITEM_GRATIS" && (
              <>
                <div>
                  <label htmlFor="v-categoria" className="mb-1 block text-xs font-semibold text-slate-600">
                    Categoria do item (em branco = qualquer)
                  </label>

                  <input id="v-categoria" value={formulario.categoria} onChange={(evento) => setFormulario({ ...formulario, categoria: evento.target.value })} placeholder="HAMBÚRGUER" className={CLASSE_CAMPO} />
                </div>

                <div>
                  <label htmlFor="v-maximo" className="mb-1 block text-xs font-semibold text-slate-600">
                    Preço máximo do item (em branco = qualquer)
                  </label>

                  <input id="v-maximo" inputMode="decimal" value={formulario.valorMaximo} onChange={(evento) => setFormulario({ ...formulario, valorMaximo: evento.target.value })} placeholder="Ex.: 45" className={CLASSE_CAMPO} />
                </div>
              </>
            )}

            {formulario.tipo === "DESCONTO_PERCENTUAL" && (
              <div>
                <label htmlFor="v-percentual" className="mb-1 block text-xs font-semibold text-slate-600">
                  Porcentagem de desconto
                </label>

                <input id="v-percentual" inputMode="decimal" value={formulario.percentual} onChange={(evento) => setFormulario({ ...formulario, percentual: evento.target.value })} placeholder="Ex.: 10" className={CLASSE_CAMPO} />
              </div>
            )}

            <div className="sm:col-span-2">
              <label htmlFor="v-descricao" className="mb-1 block text-xs font-semibold text-slate-600">
                Descrição (opcional)
              </label>

              <input id="v-descricao" value={formulario.descricao} onChange={(evento) => setFormulario({ ...formulario, descricao: evento.target.value })} className={CLASSE_CAMPO} />
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={formulario.ativa} onChange={(evento) => setFormulario({ ...formulario, ativa: evento.target.checked })} />
              Ativa (aparece para o cliente escolher)
            </label>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => void salvar({ nome: formulario.nome, descricao: formulario.descricao, tipo: formulario.tipo, categoria: formulario.categoria, valorMaximo: formulario.valorMaximo, percentual: formulario.percentual, ativa: formulario.ativa, ordem: Number(formulario.ordem) || 0 }, formulario.id)}
              className="cursor-pointer rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Salvar
            </button>

            <button type="button" onClick={() => setFormulario(null)} className="cursor-pointer rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Cancelar
            </button>
          </div>
        </section>
      )}

      {carregando && <p className="text-sm text-slate-500">Carregando as vantagens...</p>}

      {!carregando && vantagens.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">Nenhuma vantagem cadastrada. O cartão do clube só pode ser ligado com pelo menos uma vantagem ativa.</p>}

      {vantagens.length > 0 && (
        <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white text-sm shadow-sm">
          {vantagens.map((vantagem) => (
            <li key={vantagem.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
              <div>
                <p className="font-semibold text-slate-900">
                  {vantagem.nome}
                  {!vantagem.ativa && <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600">desativada</span>}
                </p>

                <p className="text-xs text-slate-500">{descreverVantagem(vantagem)}</p>
              </div>

              <div className="flex gap-3 text-xs font-semibold">
                <button type="button" onClick={() => editar(vantagem)} className="cursor-pointer text-sky-700 underline">
                  Editar
                </button>

                <button
                  type="button"
                  onClick={() => void salvar({ nome: vantagem.nome, descricao: vantagem.descricao, tipo: vantagem.tipo, categoria: vantagem.categoria, valorMaximo: vantagem.valorMaximo, percentual: vantagem.percentual, ativa: !vantagem.ativa, ordem: vantagem.ordem }, vantagem.id)}
                  className="cursor-pointer text-slate-700 underline"
                >
                  {vantagem.ativa ? "Desativar" : "Ativar"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
