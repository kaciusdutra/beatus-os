"use client";

import { useCallback, useEffect, useState } from "react";

import Link from "next/link";

import type {
  CustoFixo,
  ResumoCustosFixos,
} from "../types/custoFixo";

const NOMES_SUGERIDOS = [
  "Mão de obra",
  "Gás",
  "Energia",
  "Aluguel",
  "Internet",
  "Hospedagem do site",
  "Tráfego pago",
];

const CLASSE_CAMPO =
  "w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200";

function moeda(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function data(iso?: string): string {
  return iso ? new Date(iso).toLocaleDateString("pt-BR") : "—";
}

// "2026-11-11" para o campo de data.
function paraCampoData(iso?: string): string {
  return iso ? iso.slice(0, 10) : "";
}

interface Formulario {
  nome: string;
  valorMensal: string;
  inicioVigencia: string;
  fimVigencia: string;
  observacao: string;
}

const FORMULARIO_VAZIO: Formulario = {
  nome: "",
  valorMensal: "",
  inicioVigencia: "",
  fimVigencia: "",
  observacao: "",
};

export default function CustosFixosPage() {
  const [custos, setCustos] = useState<CustoFixo[]>([]);

  const [resumo, setResumo] = useState<ResumoCustosFixos | null>(
    null
  );

  const [carregando, setCarregando] = useState(true);

  const [erro, setErro] = useState("");

  const [aviso, setAviso] = useState("");

  const [formulario, setFormulario] =
    useState<Formulario>(FORMULARIO_VAZIO);

  const [editandoId, setEditandoId] = useState<string | null>(null);

  const [salvando, setSalvando] = useState(false);

  const [pedidos, setPedidos] = useState("");

  const carregar = useCallback(async () => {
    const resposta = await fetch("/api/custos-fixos", {
      cache: "no-store",
    });

    const dados = await resposta.json();

    if (!resposta.ok || !dados.sucesso) {
      throw new Error(
        dados.mensagem || "Não foi possível carregar os custos fixos."
      );
    }

    setCustos(dados.custos ?? []);

    setResumo(dados.resumo ?? null);

    setPedidos(String(dados.resumo?.pedidosMensaisEstimados ?? 0));
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await carregar();
      } catch (error) {
        setErro(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar os custos fixos."
        );
      } finally {
        setCarregando(false);
      }
    })();
  }, [carregar]);

  function alterar(campo: keyof Formulario, valor: string) {
    setFormulario((anterior) => ({ ...anterior, [campo]: valor }));
  }

  function editar(custo: CustoFixo) {
    setEditandoId(custo.id);

    setFormulario({
      nome: custo.nome,
      valorMensal: String(custo.valorMensal),
      inicioVigencia: paraCampoData(custo.inicioVigencia),
      fimVigencia: paraCampoData(custo.fimVigencia),
      observacao: custo.observacao ?? "",
    });

    setErro("");
    setAviso("");
  }

  function limparFormulario() {
    setEditandoId(null);
    setFormulario(FORMULARIO_VAZIO);
  }

  async function enviar(
    url: string,
    metodo: string,
    corpo: unknown
  ): Promise<void> {
    const resposta = await fetch(url, {
      method: metodo,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corpo),
    });

    const dados = await resposta.json();

    if (!resposta.ok || !dados.sucesso) {
      throw new Error(dados.mensagem || "Não foi possível salvar.");
    }
  }

  async function salvar(evento: React.FormEvent) {
    evento.preventDefault();

    try {
      setSalvando(true);
      setErro("");
      setAviso("");

      const corpo = {
        nome: formulario.nome,
        valorMensal: Number(formulario.valorMensal.replace(",", ".")),
        inicioVigencia: formulario.inicioVigencia || undefined,
        fimVigencia: formulario.fimVigencia,
        observacao: formulario.observacao,
      };

      await enviar(
        editandoId
          ? `/api/custos-fixos/${editandoId}`
          : "/api/custos-fixos",
        editandoId ? "PATCH" : "POST",
        corpo
      );

      limparFormulario();

      await carregar();

      setAviso("Custo fixo salvo.");
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o custo fixo."
      );
    } finally {
      setSalvando(false);
    }
  }

  async function alternarAtivo(custo: CustoFixo) {
    try {
      setErro("");
      setAviso("");

      await enviar(`/api/custos-fixos/${custo.id}`, "PATCH", {
        nome: custo.nome,
        valorMensal: custo.valorMensal,
        ativo: !custo.ativo,
      });

      await carregar();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível alterar o custo fixo."
      );
    }
  }

  async function salvarPedidos() {
    try {
      setErro("");
      setAviso("");

      await enviar("/api/custos-fixos/configuracao", "PUT", {
        pedidosMensaisEstimados: Number(pedidos),
      });

      await carregar();

      setAviso("Pedidos por mês salvos.");
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar os pedidos por mês."
      );
    }
  }

  if (carregando) {
    return (
      <p className="p-10 text-center text-sm text-slate-500">
        Carregando custos fixos...
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/insumos"
          className="text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          ← Insumos
        </Link>

        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
          Custos fixos
        </h1>

        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Os custos do mês que não dependem do que se vende: mão de
          obra, gás, energia, aluguel, internet, hospedagem do site e
          tráfego pago. O sistema divide o total pelos pedidos do mês
          para chegar ao custo fixo de cada pedido. O aluguel conta o
          mês inteiro, mesmo nos dias fechados.
        </p>
      </div>

      {erro && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </div>
      )}

      {aviso && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {aviso}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total dos custos fixos no mês
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {moeda(resumo?.totalMensal ?? 0)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <label
            htmlFor="pedidos"
            className="text-xs font-semibold uppercase tracking-wider text-slate-500"
          >
            Pedidos esperados por mês
          </label>

          <div className="mt-2 flex gap-2">
            <input
              id="pedidos"
              type="number"
              min="0"
              step="1"
              value={pedidos}
              onChange={(evento) => setPedidos(evento.target.value)}
              className={CLASSE_CAMPO}
            />

            <button
              type="button"
              onClick={() => void salvarPedidos()}
              className="cursor-pointer rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Salvar
            </button>
          </div>

          <p className="mt-2 text-xs text-slate-500">
            Sua estimativa por enquanto. Depois passa a vir dos
            pedidos reais.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Custo fixo por pedido
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {resumo?.custoPorPedido !== undefined
              ? moeda(resumo.custoPorPedido)
              : "—"}
          </p>

          {resumo?.custoPorPedido === undefined && (
            <p className="mt-2 text-xs text-slate-500">
              Informe os pedidos esperados por mês.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-900">
            {editandoId ? "Editar custo fixo" : "Novo custo fixo"}
          </h2>
        </div>

        <form
          onSubmit={salvar}
          className="grid gap-5 p-6 md:grid-cols-2"
        >
          <datalist id="nomes-custos">
            {NOMES_SUGERIDOS.map((nome) => (
              <option key={nome} value={nome} />
            ))}
          </datalist>

          <div>
            <label
              htmlFor="nome"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Nome
            </label>

            <input
              id="nome"
              list="nomes-custos"
              value={formulario.nome}
              onChange={(evento) => alterar("nome", evento.target.value)}
              placeholder="Ex.: Aluguel"
              className={CLASSE_CAMPO}
            />
          </div>

          <div>
            <label
              htmlFor="valor"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Valor por mês (R$)
            </label>

            <input
              id="valor"
              type="number"
              min="0"
              step="0.01"
              value={formulario.valorMensal}
              onChange={(evento) =>
                alterar("valorMensal", evento.target.value)
              }
              className={CLASSE_CAMPO}
            />
          </div>

          <div>
            <label
              htmlFor="inicio"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Vale a partir de
            </label>

            <input
              id="inicio"
              type="date"
              value={formulario.inicioVigencia}
              onChange={(evento) =>
                alterar("inicioVigencia", evento.target.value)
              }
              className={CLASSE_CAMPO}
            />

            <p className="mt-1 text-xs text-slate-500">
              Vazio = hoje.
            </p>
          </div>

          <div>
            <label
              htmlFor="fim"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Vale até (opcional)
            </label>

            <input
              id="fim"
              type="date"
              value={formulario.fimVigencia}
              onChange={(evento) =>
                alterar("fimVigencia", evento.target.value)
              }
              className={CLASSE_CAMPO}
            />
          </div>

          <div className="md:col-span-2">
            <label
              htmlFor="observacao"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Observação
            </label>

            <input
              id="observacao"
              value={formulario.observacao}
              onChange={(evento) =>
                alterar("observacao", evento.target.value)
              }
              placeholder="Opcional"
              className={CLASSE_CAMPO}
            />
          </div>

          <div className="flex gap-3 md:col-span-2">
            <button
              type="submit"
              disabled={salvando}
              className="cursor-pointer rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {salvando ? "Salvando..." : "Salvar custo fixo"}
            </button>

            {editandoId && (
              <button
                type="button"
                onClick={limparFormulario}
                className="cursor-pointer rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancelar edição
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-5 py-3">Custo</th>
              <th className="px-5 py-3 text-right">Por mês</th>
              <th className="px-5 py-3">Vale de</th>
              <th className="px-5 py-3">Situação</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            {custos.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-5 py-8 text-center text-slate-500"
                >
                  Nenhum custo fixo cadastrado ainda.
                </td>
              </tr>
            )}

            {custos.map((custo) => (
              <tr key={custo.id}>
                <td className="px-5 py-3 font-medium text-slate-900">
                  {custo.nome}
                  {custo.observacao && (
                    <p className="text-xs font-normal text-slate-500">
                      {custo.observacao}
                    </p>
                  )}
                </td>

                <td className="px-5 py-3 text-right text-slate-800">
                  {moeda(custo.valorMensal)}
                </td>

                <td className="whitespace-nowrap px-5 py-3 text-slate-600">
                  {data(custo.inicioVigencia)}
                  {custo.fimVigencia
                    ? ` a ${data(custo.fimVigencia)}`
                    : ""}
                </td>

                <td className="px-5 py-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      custo.ativo
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {custo.ativo ? "Ativo" : "Inativo"}
                  </span>
                </td>

                <td className="whitespace-nowrap px-5 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => editar(custo)}
                    className="mr-4 cursor-pointer text-sm font-semibold text-sky-700 hover:text-sky-900"
                  >
                    Editar
                  </button>

                  <button
                    type="button"
                    onClick={() => void alternarAtivo(custo)}
                    className="cursor-pointer text-sm font-semibold text-slate-600 hover:text-slate-900"
                  >
                    {custo.ativo ? "Inativar" : "Reativar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
