"use client";

import { useCallback, useEffect, useState } from "react";

import {
  NOMES_DOS_DIAS,
  calendarioDoMes,
  feriadosNacionais,
  textoDaData,
  type ConfiguracaoDeHorarios,
  type DiaDoCalendario,
  type ExcecaoDeHorario,
  type HorarioDoDia,
} from "@/modules/operacao/services/horarios";

import { carregarConfiguracaoDoServidor } from "@/core/operation/scheduleService";

const CLASSE_CAMPO =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500";

// Ordem de leitura da semana: segunda a domingo. O índice é o do sistema (0 = domingo).
const ORDEM_DA_SEMANA = [1, 2, 3, 4, 5, 6, 0];

const NOMES_DOS_MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function dataBr(texto: string): string {
  const [ano, mes, dia] = texto.split("-");

  return `${dia}/${mes}/${ano}`;
}

function descricao(horario: HorarioDoDia): string {
  return horario.aberto ? `${horario.abertura}–${horario.fechamento}` : "fechado";
}

function classeDoDia(dia: DiaDoCalendario): string {
  const { horario } = dia;

  if (horario.origem === "EXCECAO") {
    return horario.aberto
      ? "border-sky-300 bg-sky-50 text-sky-900"
      : "border-red-300 bg-red-50 text-red-900";
  }

  if (horario.aberto) {
    return "border-emerald-200 bg-emerald-50 text-emerald-900";
  }

  return horario.diaDeProducao
    ? "border-slate-200 bg-slate-100 text-slate-600"
    : "border-slate-300 bg-slate-200 text-slate-600";
}

function rotuloDoDia(dia: DiaDoCalendario): string {
  if (dia.horario.aberto) {
    return `${dia.horario.abertura}–${dia.horario.fechamento}`;
  }

  return dia.horario.origem === "EXCECAO" ? "Fechado" : dia.horario.diaDeProducao ? "Produção" : "Fechado";
}

interface FormularioDeExcecao {
  aberto: boolean;
  abertura: string;
  fechamento: string;
  observacao: string;
}

export default function HorariosPage() {
  const [configuracao, setConfiguracao] = useState<ConfiguracaoDeHorarios | null>(null);

  const [semana, setSemana] = useState<HorarioDoDia[]>([]);

  const [erro, setErro] = useState("");

  const [mensagem, setMensagem] = useState("");

  const hoje = textoDaData(new Date());

  const [ano, setAno] = useState(() => new Date().getFullYear());

  const [mes, setMes] = useState(() => new Date().getMonth() + 1);

  const [diaEscolhido, setDiaEscolhido] = useState<string | null>(null);

  const [formDia, setFormDia] = useState<FormularioDeExcecao>({
    aberto: true,
    abertura: "18:00",
    fechamento: "22:00",
    observacao: "",
  });

  const [periodo, setPeriodo] = useState({
    inicio: hoje,
    fim: hoje,
    aberto: false,
    abertura: "18:00",
    fechamento: "22:00",
    observacao: "",
  });

  const carregar = useCallback(async () => {
    const resposta = await fetch("/api/operacao/horarios", { cache: "no-store" });

    const dados = await resposta.json();

    if (!resposta.ok || !dados.sucesso) {
      throw new Error(dados.mensagem || "Não foi possível carregar os horários.");
    }

    setConfiguracao(dados.configuracao);
    setSemana(dados.configuracao.semanal);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await carregar();

        setErro("");
      } catch (error) {
        setErro(error instanceof Error ? error.message : "Não foi possível carregar os horários.");
      }
    })();
  }, [carregar]);

  async function chamar(url: string, metodo: string, corpo: object | undefined, falha: string) {
    const resposta = await fetch(url, {
      method: metodo,
      headers: { "Content-Type": "application/json" },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });

    const dados = await resposta.json();

    if (!resposta.ok || !dados.sucesso) {
      throw new Error(dados.mensagem || falha);
    }

    return dados;
  }

  async function depoisDeMudar(texto: string) {
    setMensagem(texto);

    await carregar();

    // O estado da operação no resto do sistema acompanha na hora.
    await carregarConfiguracaoDoServidor();
  }

  async function salvarSemana() {
    try {
      setErro("");
      setMensagem("");

      await chamar("/api/operacao/horarios", "PUT", { semanal: semana }, "Não foi possível salvar os horários.");

      await depoisDeMudar("Horário da semana salvo.");
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível salvar os horários.");
    }
  }

  async function criarExcecao(dados: { inicio: string; fim: string } & FormularioDeExcecao) {
    try {
      setErro("");
      setMensagem("");

      await chamar(
        "/api/operacao/horarios/excecoes",
        "POST",
        {
          inicio: dados.inicio,
          fim: dados.fim,
          aberto: dados.aberto,
          abertura: dados.aberto ? dados.abertura : undefined,
          fechamento: dados.aberto ? dados.fechamento : undefined,
          observacao: dados.observacao,
        },
        "Não foi possível criar a exceção."
      );

      await depoisDeMudar("Exceção salva.");
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível criar a exceção.");
    }
  }

  async function removerExcecao(id: string) {
    try {
      setErro("");
      setMensagem("");

      await chamar(`/api/operacao/horarios/excecoes/${id}`, "DELETE", undefined, "Não foi possível remover a exceção.");

      await depoisDeMudar("Exceção removida; o dia volta ao horário normal.");
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível remover a exceção.");
    }
  }

  function mudarDiaDaSemana(indice: number, mudanca: Partial<HorarioDoDia>) {
    setSemana(semana.map((dia, posicao) => (posicao === indice ? { ...dia, ...mudanca } : dia)));
  }

  function irParaMes(deslocamento: number) {
    const novo = new Date(ano, mes - 1 + deslocamento, 1);

    setAno(novo.getFullYear());
    setMes(novo.getMonth() + 1);
    setDiaEscolhido(null);
  }

  function escolherDia(dia: DiaDoCalendario) {
    setDiaEscolhido(dia.data);

    // Sugestão: o contrário do que está valendo, com as horas mais usadas.
    setFormDia({
      aberto: !dia.horario.aberto,
      abertura: dia.horario.abertura ?? "18:00",
      fechamento: dia.horario.fechamento ?? "22:00",
      observacao: dia.feriado ?? "",
    });
  }

  const dias = configuracao ? calendarioDoMes(ano, mes, configuracao, feriadosNacionais(ano)) : [];

  const deslocamento = dias.length > 0 ? dias[0].diaDaSemana : 0;

  const dia = dias.find((item) => item.data === diaEscolhido);

  const pendencias = dias.filter((item) => item.feriadoEmDiaDeProducao);

  const proximasExcecoes: ExcecaoDeHorario[] = (configuracao?.excecoes ?? []).filter((excecao) => excecao.fim >= hoje);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-slate-500">Configurações</p>

        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Horários de funcionamento</h1>

        <p className="mt-2 max-w-3xl text-sm text-slate-500">
          O horário normal da semana e as exceções por dia ou por período. Segunda e terça são dias de produção, sem venda; se cair um
          feriado nelas, escolha o dia no calendário e decida se vai abrir. O sistema inteiro (Dashboard, estado da operação,
          checklist) segue o que estiver aqui.
        </p>
      </div>

      {erro && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>}

      {mensagem && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{mensagem}</div>}

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Horário normal da semana</h2>

        {semana.length === 7 && (
          <div className="space-y-2">
            {ORDEM_DA_SEMANA.map((indice) => {
              const horario = semana[indice];

              return (
                <div key={indice} className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="w-32 font-semibold text-slate-700">{NOMES_DOS_DIAS[indice]}</span>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={horario.aberto}
                      onChange={(evento) =>
                        mudarDiaDaSemana(
                          indice,
                          evento.target.checked
                            ? { aberto: true, abertura: horario.abertura ?? "18:00", fechamento: horario.fechamento ?? "22:00" }
                            : { aberto: false }
                        )
                      }
                    />
                    Abre
                  </label>

                  {horario.aberto ? (
                    <>
                      <input type="time" aria-label={`Abertura de ${NOMES_DOS_DIAS[indice]}`} value={horario.abertura ?? ""} onChange={(evento) => mudarDiaDaSemana(indice, { abertura: evento.target.value })} className={`${CLASSE_CAMPO} max-w-32`} />

                      <span className="text-slate-400">às</span>

                      <input type="time" aria-label={`Fechamento de ${NOMES_DOS_DIAS[indice]}`} value={horario.fechamento ?? ""} onChange={(evento) => mudarDiaDaSemana(indice, { fechamento: evento.target.value })} className={`${CLASSE_CAMPO} max-w-32`} />
                    </>
                  ) : (
                    <span className="text-xs text-slate-500">{indice === 1 || indice === 2 ? "dia de produção, sem venda" : "fechado"}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <button type="button" onClick={() => void salvarSemana()} className="cursor-pointer rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
          Salvar horário da semana
        </button>
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-900">Calendário</h2>

          <div className="flex items-center gap-2">
            <button type="button" aria-label="Mês anterior" onClick={() => irParaMes(-1)} className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              ←
            </button>

            <span className="w-40 text-center text-sm font-bold text-slate-800">
              {NOMES_DOS_MESES[mes - 1]} de {ano}
            </span>

            <button type="button" aria-label="Próximo mês" onClick={() => irParaMes(1)} className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              →
            </button>
          </div>
        </div>

        {pendencias.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <strong>Feriado em dia de produção neste mês:</strong>{" "}
            {pendencias.map((item) => `${dataBr(item.data).slice(0, 5)} (${item.feriado})`).join(", ")}. Clique no dia se quiser abrir.
          </div>
        )}

        <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-bold uppercase tracking-wider text-slate-500">
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((nome) => (
            <div key={nome}>{nome}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: deslocamento }, (_, indice) => (
            <div key={`vazio-${indice}`} />
          ))}

          {dias.map((item) => (
            <button
              key={item.data}
              type="button"
              onClick={() => escolherDia(item)}
              className={`min-h-16 cursor-pointer rounded-lg border p-1.5 text-left text-xs transition hover:brightness-95 ${classeDoDia(item)} ${
                item.data === diaEscolhido ? "ring-2 ring-slate-900" : item.data === hoje ? "ring-2 ring-orange-400" : ""
              } ${item.feriadoEmDiaDeProducao ? "outline outline-2 outline-amber-400" : ""}`}
            >
              <span className="block text-sm font-bold">{Number(item.data.slice(8))}</span>

              <span className="block leading-tight">{rotuloDoDia(item)}</span>

              {item.feriado && <span className="mt-0.5 block text-[10px] font-semibold leading-tight text-amber-800">★ {item.feriado}</span>}

              {item.horario.excecao?.observacao && !item.feriado && (
                <span className="mt-0.5 block text-[10px] leading-tight opacity-80">{item.horario.excecao.observacao}</span>
              )}
            </button>
          ))}
        </div>

        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
          <li><span className="mr-1 inline-block h-3 w-3 rounded border border-emerald-200 bg-emerald-50 align-middle" />horário normal</li>
          <li><span className="mr-1 inline-block h-3 w-3 rounded border border-sky-300 bg-sky-50 align-middle" />aberto por exceção</li>
          <li><span className="mr-1 inline-block h-3 w-3 rounded border border-red-300 bg-red-50 align-middle" />fechado por exceção</li>
          <li><span className="mr-1 inline-block h-3 w-3 rounded border border-slate-200 bg-slate-100 align-middle" />produção</li>
          <li>★ feriado nacional (feriados de Manaus e do Amazonas: cadastre como exceção)</li>
        </ul>

        {dia && (
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div>
              <h3 className="font-bold text-slate-900">
                {NOMES_DOS_DIAS[dia.diaDaSemana]}, {dataBr(dia.data)}
                {dia.feriado ? ` · ${dia.feriado}` : ""}
              </h3>

              <p className="text-sm text-slate-600">
                Hoje vale: <strong>{descricao(dia.horario)}</strong>
                {dia.horario.origem === "EXCECAO" ? " (exceção)" : dia.horario.diaDeProducao ? " (dia de produção)" : " (horário normal)"}.
              </p>
            </div>

            {dia.horario.excecao && (
              <div className="flex flex-wrap items-center gap-3 rounded-lg bg-white px-3 py-2 text-sm">
                <span>
                  Exceção de {dataBr(dia.horario.excecao.inicio)}
                  {dia.horario.excecao.inicio !== dia.horario.excecao.fim ? ` a ${dataBr(dia.horario.excecao.fim)}` : ""}
                  {dia.horario.excecao.observacao ? ` · ${dia.horario.excecao.observacao}` : ""}
                </span>

                <button type="button" onClick={() => void removerExcecao(dia.horario.excecao!.id)} className="cursor-pointer text-xs font-semibold text-red-700 hover:text-red-900">
                  Remover exceção
                </button>
              </div>
            )}

            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label htmlFor="dia-tipo" className="mb-1 block text-xs font-semibold text-slate-600">Neste dia</label>

                <select id="dia-tipo" value={formDia.aberto ? "ABRIR" : "FECHAR"} onChange={(evento) => setFormDia({ ...formDia, aberto: evento.target.value === "ABRIR" })} className={CLASSE_CAMPO}>
                  <option value="ABRIR">Abrir</option>

                  <option value="FECHAR">Ficar fechado</option>
                </select>
              </div>

              {formDia.aberto && (
                <>
                  <div>
                    <label htmlFor="dia-abertura" className="mb-1 block text-xs font-semibold text-slate-600">Abre às</label>

                    <input id="dia-abertura" type="time" value={formDia.abertura} onChange={(evento) => setFormDia({ ...formDia, abertura: evento.target.value })} className={CLASSE_CAMPO} />
                  </div>

                  <div>
                    <label htmlFor="dia-fechamento" className="mb-1 block text-xs font-semibold text-slate-600">Fecha às</label>

                    <input id="dia-fechamento" type="time" value={formDia.fechamento} onChange={(evento) => setFormDia({ ...formDia, fechamento: evento.target.value })} className={CLASSE_CAMPO} />
                  </div>
                </>
              )}

              <div className="min-w-48 flex-1">
                <label htmlFor="dia-obs" className="mb-1 block text-xs font-semibold text-slate-600">Observação</label>

                <input id="dia-obs" value={formDia.observacao} onChange={(evento) => setFormDia({ ...formDia, observacao: evento.target.value })} className={CLASSE_CAMPO} />
              </div>

              <button type="button" onClick={() => void criarExcecao({ inicio: dia.data, fim: dia.data, ...formDia })} className="cursor-pointer rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800">
                Aplicar a este dia
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Exceção por período</h2>

        <p className="text-xs text-slate-500">Para uma folga de vários dias, férias ou uma semana de horário diferente.</p>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="per-inicio" className="mb-1 block text-xs font-semibold text-slate-600">De</label>

            <input id="per-inicio" type="date" value={periodo.inicio} onChange={(evento) => setPeriodo({ ...periodo, inicio: evento.target.value, fim: periodo.fim < evento.target.value ? evento.target.value : periodo.fim })} className={CLASSE_CAMPO} />
          </div>

          <div>
            <label htmlFor="per-fim" className="mb-1 block text-xs font-semibold text-slate-600">Até</label>

            <input id="per-fim" type="date" value={periodo.fim} onChange={(evento) => setPeriodo({ ...periodo, fim: evento.target.value })} className={CLASSE_CAMPO} />
          </div>

          <div>
            <label htmlFor="per-tipo" className="mb-1 block text-xs font-semibold text-slate-600">Nesses dias</label>

            <select id="per-tipo" value={periodo.aberto ? "ABRIR" : "FECHAR"} onChange={(evento) => setPeriodo({ ...periodo, aberto: evento.target.value === "ABRIR" })} className={CLASSE_CAMPO}>
              <option value="FECHAR">Ficar fechado</option>

              <option value="ABRIR">Abrir no horário abaixo</option>
            </select>
          </div>

          {periodo.aberto && (
            <>
              <input type="time" aria-label="Abertura do período" value={periodo.abertura} onChange={(evento) => setPeriodo({ ...periodo, abertura: evento.target.value })} className={`${CLASSE_CAMPO} max-w-32`} />

              <input type="time" aria-label="Fechamento do período" value={periodo.fechamento} onChange={(evento) => setPeriodo({ ...periodo, fechamento: evento.target.value })} className={`${CLASSE_CAMPO} max-w-32`} />
            </>
          )}

          <div className="min-w-48 flex-1">
            <label htmlFor="per-obs" className="mb-1 block text-xs font-semibold text-slate-600">Observação</label>

            <input id="per-obs" value={periodo.observacao} onChange={(evento) => setPeriodo({ ...periodo, observacao: evento.target.value })} placeholder="Ex.: férias" className={CLASSE_CAMPO} />
          </div>

          <button type="button" onClick={() => void criarExcecao(periodo)} className="cursor-pointer rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800">
            Salvar exceção
          </button>
        </div>

        <h3 className="pt-2 text-sm font-bold text-slate-700">Exceções de hoje em diante</h3>

        {proximasExcecoes.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhuma exceção cadastrada.</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {proximasExcecoes.map((excecao) => (
              <li key={excecao.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
                <span>
                  <strong>
                    {dataBr(excecao.inicio)}
                    {excecao.inicio !== excecao.fim ? ` a ${dataBr(excecao.fim)}` : ""}
                  </strong>{" "}
                  · {descricao(excecao)}
                  {excecao.observacao ? ` · ${excecao.observacao}` : ""}
                </span>

                <button type="button" onClick={() => void removerExcecao(excecao.id)} className="cursor-pointer text-xs font-semibold text-red-700 hover:text-red-900">
                  Remover
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
