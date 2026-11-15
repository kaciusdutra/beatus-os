"use client";

import { useCallback, useEffect, useState } from "react";

import Link from "next/link";

import { useSystem } from "@/core/system/SystemContext";

import ConferirPorQr from "@/modules/qr/components/ConferirPorQr";

import AjustesParaAmanha from "../components/AjustesParaAmanha";

import { carregarChecklistDoServidor } from "../services/checklistService";

import type { ChecklistDoDia, ChecklistDoTipo, EstoqueDoDia } from "../services/checklistDoDiaService";

import type { ItemDoChecklist, TipoDeChecklist } from "../services/checklist";

const CLASSE_CAMPO =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500";

const TEXTO_DO_ESTADO: Record<string, string> = {
  FECHADA: "Hoje não há venda. A operação está fechada.",
  AGUARDANDO_ABERTURA: "Ainda não deu o horário de abertura.",
  CHECKLIST: "Já deu o horário de abrir: falta concluir o checklist de abertura. Isso é um aviso, não trava a operação.",
  OPERANDO: "Operação em andamento.",
  FECHAMENTO: "O horário de venda acabou: hora de fechar a cozinha.",
};

function hora(iso: string | undefined): string {
  return iso ? new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "";
}

function dataBr(texto: string): string {
  const [ano, mes, dia] = texto.split("-");

  return `${dia}/${mes}/${ano}`;
}

function numero(valor: number): string {
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

function Item({
  item,
  bloqueado,
  onMarcar,
}: {
  item: ItemDoChecklist;
  bloqueado: boolean;
  onMarcar: (item: ItemDoChecklist, feito: boolean, observacao?: string) => Promise<void>;
}) {
  const [observacao, setObservacao] = useState("");

  const [pedindo, setPedindo] = useState(false);

  const problema = item.automatico && !item.automatico.ok;

  return (
    <li className={`rounded-xl border p-4 ${item.cumprido ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 font-semibold text-slate-900">
            <span>{item.cumprido ? "✅" : "⬜"}</span>

            {item.titulo}

            {item.categoria && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{item.categoria}</span>}

            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${item.obrigatorio ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-500"}`}>
              {item.obrigatorio ? "obrigatório" : "opcional"}
            </span>
          </p>

          {item.automatico && (
            <p className={`mt-1 text-xs ${item.automatico.ok ? "text-emerald-700" : "text-amber-700"}`}>
              {item.automatico.ok ? "✓ O sistema conferiu: " : "⚠ "}
              {item.automatico.detalhe}{" "}
              {!item.automatico.ok && item.automatico.link && (
                <Link href={item.automatico.link} className="font-semibold underline">
                  Resolver
                </Link>
              )}
            </p>
          )}

          {item.feito && (
            <p className="mt-1 text-xs text-slate-500">
              Marcado{item.feitoPor ? ` por ${item.feitoPor}` : ""} às {hora(item.feitoEm)}
              {item.observacao ? ` · ${item.observacao}` : ""}
            </p>
          )}
        </div>

        {!bloqueado && (
          <div className="flex flex-col items-end gap-1">
            {item.feito ? (
              <button type="button" onClick={() => void onMarcar(item, false)} className="cursor-pointer text-xs font-semibold text-slate-600 underline">
                Desmarcar
              </button>
            ) : problema ? (
              <button type="button" onClick={() => setPedindo(!pedindo)} className="cursor-pointer text-xs font-semibold text-amber-800 underline">
                Marcar mesmo assim
              </button>
            ) : !item.automatico ? (
              <button type="button" onClick={() => void onMarcar(item, true)} className="cursor-pointer rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800">
                Marcar como feito
              </button>
            ) : null}
          </div>
        )}
      </div>

      {pedindo && !bloqueado && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            aria-label="Observação"
            value={observacao}
            onChange={(evento) => setObservacao(evento.target.value)}
            placeholder="Por que marcar mesmo assim? (ex.: descarto depois do jantar)"
            className={`${CLASSE_CAMPO} max-w-md`}
          />

          <button
            type="button"
            onClick={() => void onMarcar(item, true, observacao).then(() => setPedindo(false))}
            className="cursor-pointer rounded-lg bg-amber-700 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-800"
          >
            Confirmar
          </button>
        </div>
      )}
    </li>
  );
}

function EstoqueDoDiaPainel({ estoque }: { estoque: EstoqueDoDia }) {
  const vazio =
    estoque.abaixoDoMinimo.length === 0 &&
    estoque.aProduzir.length === 0 &&
    estoque.cartoesVencidos.length === 0 &&
    estoque.cartoesVencendo.length === 0 &&
    estoque.descongelando.length === 0;

  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Estoque do dia</h2>

        <Link href="/estoque/quadro" className="text-xs font-semibold text-sky-700 underline">
          Abrir o quadro
        </Link>
      </div>

      {vazio && <p className="text-sm text-emerald-700">Nada pedindo atenção no estoque.</p>}

      <div className="grid gap-4 md:grid-cols-2">
        {estoque.abaixoDoMinimo.length > 0 && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-700">Abaixo do mínimo</h3>

            <ul className="mt-1 space-y-0.5 text-sm text-slate-700">
              {estoque.abaixoDoMinimo.map((item) => (
                <li key={item.nome}>
                  {item.nome}: {numero(item.saldo)} {item.unidade} <span className="text-slate-400">(mínimo {numero(item.minimo)})</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {estoque.aProduzir.length > 0 && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-700">A produzir</h3>

            <ul className="mt-1 space-y-0.5 text-sm text-slate-700">
              {estoque.aProduzir.map((item) => (
                <li key={item.nome}>
                  {item.nome}: {numero(item.saldo)} {item.unidade} <span className="text-slate-400">(mínimo {numero(item.minimo)})</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {estoque.cartoesVencidos.length > 0 && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-red-700">Vencidos (descartar)</h3>

            <ul className="mt-1 space-y-0.5 text-sm text-slate-700">
              {estoque.cartoesVencidos.map((item, indice) => (
                <li key={`${item.nome}-${indice}`}>
                  {item.nome}: {numero(item.quantidade)} {item.unidade}
                </li>
              ))}
            </ul>
          </div>
        )}

        {estoque.cartoesVencendo.length > 0 && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-700">Vencendo logo</h3>

            <ul className="mt-1 space-y-0.5 text-sm text-slate-700">
              {estoque.cartoesVencendo.map((item, indice) => (
                <li key={`${item.nome}-${indice}`}>
                  {item.nome}: {numero(item.quantidade)} {item.unidade}
                  {item.validadeAte ? <span className="text-slate-400"> (até {new Date(item.validadeAte).toLocaleDateString("pt-BR")})</span> : null}
                </li>
              ))}
            </ul>
          </div>
        )}

        {estoque.descongelando.length > 0 && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-sky-700">Descongelando</h3>

            <ul className="mt-1 space-y-0.5 text-sm text-slate-700">
              {estoque.descongelando.map((item, indice) => (
                <li key={`${item.nome}-${indice}`}>
                  {item.nome}: {numero(item.quantidade)} {item.unidade}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

export default function OperacaoPage() {
  const { systemState } = useSystem();

  const [checklist, setChecklist] = useState<ChecklistDoDia | null>(null);

  const [estoque, setEstoque] = useState<EstoqueDoDia | null>(null);

  const [tipoAtivo, setTipoAtivo] = useState<TipoDeChecklist | null>(null);

  const [erro, setErro] = useState("");

  const [mensagem, setMensagem] = useState("");

  const carregar = useCallback(async () => {
    const [resposta, respostaEstoque] = await Promise.all([
      fetch("/api/operacao/checklist", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/operacao/checklist/estoque", { cache: "no-store" }).then((r) => r.json()),
    ]);

    if (!resposta.sucesso) {
      throw new Error(resposta.mensagem || "Não foi possível carregar o checklist.");
    }

    setChecklist(resposta.checklist);
    setEstoque(respostaEstoque.sucesso ? respostaEstoque.estoque : null);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await carregar();

        setErro("");
      } catch (error) {
        setErro(error instanceof Error ? error.message : "Não foi possível carregar o checklist.");
      }
    })();

    // Uma temperatura registrada em outra tela aparece aqui sozinha.
    const intervalo = setInterval(() => {
      void carregar().catch(() => undefined);
    }, 30000);

    return () => clearInterval(intervalo);
  }, [carregar]);

  async function chamar(url: string, corpo: object | undefined, falha: string) {
    const resposta = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });

    const dados = await resposta.json();

    if (!resposta.ok || !dados.sucesso) {
      throw new Error(dados.mensagem || falha);
    }
  }

  async function marcar(item: ItemDoChecklist, feito: boolean, observacao?: string) {
    try {
      setErro("");
      setMensagem("");

      await chamar(`/api/operacao/checklist/itens/${item.id}`, { feito, observacao }, "Não foi possível marcar o item.");

      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível marcar o item.");
    }
  }

  async function concluirOuReabrir(tipo: ChecklistDoTipo, acao: "concluir" | "reabrir") {
    try {
      setErro("");
      setMensagem("");

      await chamar(`/api/operacao/checklist/${tipo.execucaoId}/${acao}`, undefined, "Não foi possível atualizar o checklist.");

      setMensagem(acao === "concluir" ? `Checklist de ${tipo.rotulo.toLowerCase()} concluído.` : "Checklist reaberto.");

      await carregar();

      // O estado da operação no resto do sistema acompanha na hora.
      await carregarChecklistDoServidor();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível atualizar o checklist.");
    }
  }

  const tipos = checklist?.tipos ?? [];

  const atual = tipos.find((tipo) => tipo.tipo === tipoAtivo) ?? tipos[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">Operação</p>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Checklist do dia</h1>

          <p className="mt-2 max-w-3xl text-sm text-slate-500">
            {checklist ? dataBr(checklist.data) : ""}
            {checklist?.horario.aberto ? ` · aberto das ${checklist.horario.abertura} às ${checklist.horario.fechamento}${checklist.horario.excecao ? " (exceção)" : ""}` : ""}
            {checklist && !checklist.horario.aberto ? " · sem venda hoje" : ""}
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-700">{TEXTO_DO_ESTADO[systemState.operation] ?? ""}</p>
        </div>

        <Link href="/celular" className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
          📱 Modo celular
        </Link>

        <Link href="/operacao/editar" className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
          Editar a lista
        </Link>
      </div>

      {erro && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>}

      {mensagem && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{mensagem}</div>}

      {checklist && tipos.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
          Hoje não há checklist: o dia está fechado e não é de produção. Para abrir num dia específico, use o calendário em{" "}
          <Link href="/configuracoes/horarios" className="font-semibold underline">Configurações → Horários</Link>.
        </p>
      )}

      {tipos.length > 1 && (
        <div className="flex gap-2">
          {tipos.map((tipo) => (
            <button
              key={tipo.tipo}
              type="button"
              onClick={() => setTipoAtivo(tipo.tipo)}
              className={`cursor-pointer rounded-lg border px-4 py-2 text-sm font-semibold ${
                atual?.tipo === tipo.tipo ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
            >
              {tipo.rotulo} {tipo.concluido ? "✓" : `(${tipo.situacao.cumpridos}/${tipo.situacao.total})`}
            </button>
          ))}
        </div>
      )}

      {atual && (
        <>
          {(atual.tipo === "ABERTURA" || atual.tipo === "PRODUCAO") && <AjustesParaAmanha modo="VER" />}

          {(atual.tipo === "ABERTURA" || atual.tipo === "PRODUCAO") && estoque && <EstoqueDoDiaPainel estoque={estoque} />}

          {(atual.tipo === "ABERTURA" || atual.tipo === "PRODUCAO") && <ConferirPorQr />}

          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-slate-900">Checklist de {atual.rotulo.toLowerCase()}</h2>

              <span className="text-sm font-semibold text-slate-600">
                {atual.situacao.cumpridos} de {atual.situacao.total} · {atual.situacao.percentual}%
              </span>
            </div>

            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
              <div className="h-full bg-emerald-600 transition-all" style={{ width: `${atual.situacao.percentual}%` }} />
            </div>

            {atual.concluido ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                <span>
                  Concluído{atual.concluidoPor ? ` por ${atual.concluidoPor}` : ""} às {hora(atual.concluidoEm)}.
                </span>

                <button type="button" onClick={() => void concluirOuReabrir(atual, "reabrir")} className="cursor-pointer text-xs font-semibold underline">
                  Reabrir para corrigir
                </button>
              </div>
            ) : (
              <p className="text-sm text-slate-600">
                {atual.situacao.podeConcluir
                  ? "Todos os itens obrigatórios estão cumpridos. Pode concluir."
                  : `Faltam ${atual.situacao.obrigatoriosPendentes.length} item(ns) obrigatório(s).`}
              </p>
            )}

            <ul className="space-y-2">
              {atual.itens.map((item) => (
                <Item key={item.id} item={item} bloqueado={atual.concluido} onMarcar={marcar} />
              ))}
            </ul>

            {atual.tipo === "FECHAMENTO" && <AjustesParaAmanha modo="ANOTAR" />}

            {!atual.concluido && (
              <button
                type="button"
                disabled={!atual.situacao.podeConcluir}
                onClick={() => void concluirOuReabrir(atual, "concluir")}
                className="cursor-pointer rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Concluir checklist de {atual.rotulo.toLowerCase()}
              </button>
            )}
          </section>
        </>
      )}
    </div>
  );
}
