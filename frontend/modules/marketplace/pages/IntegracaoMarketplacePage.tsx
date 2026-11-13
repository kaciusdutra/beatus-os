"use client";

import { useCallback, useEffect, useState } from "react";

import Link from "next/link";

import type {
  EventoRegistrado,
  IntegracaoDoMarketplace,
  PendenciasDaIntegracao,
  VinculoDeItem,
} from "../types/marketplace";

interface ProdutoDoCardapio {
  id: string;
  nome: string;
  categoria: string;
  ativo: boolean;
}

const CLASSE_CAMPO =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500";

const CANAIS = [
  { chave: "IFOOD", rotulo: "iFood" },
  { chave: "99FOOD", rotulo: "99Food" },
  { chave: "KEETA", rotulo: "Keeta" },
];

const COR_STATUS: Record<string, string> = {
  RECEBIDO: "bg-slate-100 text-slate-700",
  PROCESSADO: "bg-emerald-100 text-emerald-800",
  ERRO: "bg-red-100 text-red-800",
  IGNORADO: "bg-slate-200 text-slate-600",
};

function dataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default function IntegracaoMarketplacePage() {
  const [canal, setCanal] = useState("IFOOD");

  const [integracao, setIntegracao] = useState<IntegracaoDoMarketplace | null>(null);

  const [pendencias, setPendencias] = useState<PendenciasDaIntegracao | null>(null);

  const [vinculos, setVinculos] = useState<VinculoDeItem[]>([]);

  const [eventos, setEventos] = useState<EventoRegistrado[]>([]);

  const [produtos, setProdutos] = useState<ProdutoDoCardapio[]>([]);

  const [erro, setErro] = useState("");

  const [mensagem, setMensagem] = useState("");

  const [idDaLoja, setIdDaLoja] = useState("");

  const [simItens, setSimItens] = useState([{ codigoItemExterno: "SIM-1", nome: "", quantidade: "1", precoUnitario: "" }]);

  const [simNome, setSimNome] = useState("");

  const [simCodigo, setSimCodigo] = useState("");

  const carregar = useCallback(async () => {
    const [config, vinc, evts, prods] = await Promise.all([
      fetch(`/api/integracoes/marketplace/${canal}`, { cache: "no-store" }).then((r) => r.json()),
      fetch(`/api/integracoes/marketplace/${canal}/vinculos`, { cache: "no-store" }).then((r) => r.json()),
      fetch(`/api/integracoes/marketplace/eventos?canal=${canal}`, { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/produtos", { cache: "no-store" }).then((r) => r.json()),
    ]);

    if (!config.sucesso) {
      throw new Error(config.mensagem || "Não foi possível ler a integração.");
    }

    setIntegracao(config.integracao);
    setPendencias(config.pendencias);
    setIdDaLoja(config.integracao.idDaLoja ?? "");
    setVinculos(vinc.vinculos ?? []);
    setEventos(evts.eventos ?? []);
    setProdutos(
      (prods.produtos ?? []).filter(
        (produto: ProdutoDoCardapio) => produto.ativo && produto.categoria.toUpperCase() !== "ADICIONAL"
      )
    );
  }, [canal]);

  useEffect(() => {
    void (async () => {
      try {
        await carregar();

        setErro("");
      } catch (error) {
        setErro(error instanceof Error ? error.message : "Não foi possível carregar a integração.");
      }
    })();
  }, [carregar]);

  async function chamar(url: string, metodo: string, corpo: object, falha: string) {
    const resposta = await fetch(url, {
      method: metodo,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corpo),
    });

    const dados = await resposta.json();

    if (!resposta.ok || !dados.sucesso) {
      throw new Error(dados.mensagem || falha);
    }

    return dados;
  }

  async function salvar(mudanca: Partial<IntegracaoDoMarketplace>) {
    if (!integracao) {
      return;
    }

    try {
      setErro("");
      setMensagem("");

      await chamar(
        `/api/integracoes/marketplace/${canal}`,
        "PUT",
        {
          ativo: mudanca.ativo ?? integracao.ativo,
          aceiteAutomatico: mudanca.aceiteAutomatico ?? integracao.aceiteAutomatico,
          modoSimulacao: mudanca.modoSimulacao ?? integracao.modoSimulacao,
          idDaLoja: mudanca.idDaLoja ?? idDaLoja,
        },
        "Não foi possível salvar a integração."
      );

      setMensagem("Integração salva.");

      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível salvar a integração.");
    }
  }

  async function consultarAgora() {
    try {
      setErro("");

      const dados = await chamar("/api/integracoes/marketplace/consultar", "POST", {}, "Não foi possível consultar.");

      const resultado = dados.resultados?.[canal];

      setMensagem(
        resultado?.falha
          ? `Falha na consulta: ${resultado.falha}`
          : resultado?.motivo
            ? resultado.motivo
            : `${resultado?.consultados ?? 0} evento(s) recebido(s).`
      );

      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível consultar.");
    }
  }

  async function simular() {
    try {
      setErro("");
      setMensagem("");

      const dados = await chamar(
        `/api/integracoes/marketplace/${canal}/simular`,
        "POST",
        {
          itens: simItens.map((item) => ({ ...item, quantidade: Number(item.quantidade) })),
          nomeCliente: simNome,
          codigoExibicao: simCodigo,
        },
        "Não foi possível simular."
      );

      const resumo =
        dados.evento?.status === "ERRO"
          ? `Erro: ${dados.evento.erro}`
          : `Pedido simulado entrou na fila da Cozinha.${dados.avisos?.length ? ` Avisos: ${dados.avisos.join(" ")}` : ""}`;

      setMensagem(resumo);

      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível simular.");
    }
  }

  async function ligar(vinculo: VinculoDeItem, produtoId: string) {
    try {
      setErro("");

      await chamar(
        `/api/integracoes/marketplace/${canal}/vinculos`,
        "PATCH",
        { id: vinculo.id, produtoId },
        "Não foi possível ligar o item."
      );

      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível ligar o item.");
    }
  }

  const pendentes = vinculos.filter((vinculo) => !vinculo.produtoId);

  const ligados = vinculos.filter((vinculo) => vinculo.produtoId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">Integrações</p>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Marketplaces</h1>

          <p className="mt-2 max-w-3xl text-sm text-slate-500">
            O pedido do marketplace entra sozinho, é aceito na hora e vai direto para a{" "}
            <Link href="/cozinha" className="font-semibold underline">Cozinha</Link>. Item sem produto ligado entra pelo preço da
            plataforma e não baixa estoque, até você ligá-lo abaixo.
          </p>
        </div>

        <select aria-label="Canal" value={canal} onChange={(evento) => setCanal(evento.target.value)} className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold">
          {CANAIS.map((item) => (
            <option key={item.chave} value={item.chave}>{item.rotulo}</option>
          ))}
        </select>
      </div>

      {erro && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>}

      {mensagem && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{mensagem}</div>}

      {integracao && (
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Configuração</h2>

          <div className="grid gap-3 md:grid-cols-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input type="checkbox" checked={integracao.ativo} onChange={(evento) => void salvar({ ativo: evento.target.checked })} />
              Integração ligada
            </label>

            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input type="checkbox" checked={integracao.aceiteAutomatico} onChange={(evento) => void salvar({ aceiteAutomatico: evento.target.checked })} />
              Aceitar o pedido automaticamente
            </label>

            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input type="checkbox" checked={integracao.modoSimulacao} onChange={(evento) => void salvar({ modoSimulacao: evento.target.checked })} />
              Modo simulação (sem credenciais)
            </label>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-60">
              <label htmlFor="id-loja" className="mb-1 block text-xs font-semibold text-slate-600">Código da loja na plataforma</label>

              <input id="id-loja" value={idDaLoja} onChange={(evento) => setIdDaLoja(evento.target.value)} className={CLASSE_CAMPO} />
            </div>

            <button type="button" onClick={() => void salvar({ idDaLoja })} className="cursor-pointer rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800">
              Salvar código
            </button>

            <button type="button" onClick={() => void consultarAgora()} className="cursor-pointer rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              Consultar agora
            </button>
          </div>

          <ul className="space-y-1 text-xs text-slate-600">
            <li>
              Credenciais no servidor:{" "}
              <strong className={integracao.credenciaisConfiguradas ? "text-emerald-700" : "text-amber-700"}>
                {integracao.credenciaisConfiguradas ? "preenchidas" : "ainda não preenchidas"}
              </strong>{" "}
              (ficam só no arquivo .env do servidor; esta tela não mostra nem grava segredos).
            </li>

            <li>
              Último contato com a plataforma: {integracao.ultimoContatoEm ? dataHora(integracao.ultimoContatoEm) : "nunca"}
              {integracao.ultimaFalha ? ` · última falha: ${integracao.ultimaFalha}` : ""}
            </li>

            {integracao.modoSimulacao && (
              <li className="font-semibold text-amber-700">
                Em modo simulação o sistema não fala com a plataforma. Para ligar de verdade, coloque as credenciais no .env e
                desmarque o modo simulação. O ajuste ao formato real do {canal} depende da documentação oficial.
              </li>
            )}
          </ul>
        </section>
      )}

      {integracao?.modoSimulacao && (
        <section className="space-y-3 rounded-2xl border border-dashed border-orange-300 bg-orange-50 p-5">
          <h2 className="text-lg font-bold text-orange-900">Simular um pedido da plataforma</h2>

          <p className="text-xs text-orange-800">
            Testa o caminho inteiro: o pedido entra, é aceito e cai na fila da Cozinha. Use o código do item como ele aparece no
            cardápio da plataforma; item sem vínculo entra pelo preço informado.
          </p>

          {simItens.map((item, indice) => (
            <div key={indice} className="grid gap-2 md:grid-cols-4">
              <input aria-label="Código do item" placeholder="Código do item" value={item.codigoItemExterno} onChange={(evento) => setSimItens(simItens.map((x, i) => (i === indice ? { ...x, codigoItemExterno: evento.target.value } : x)))} className={CLASSE_CAMPO} />

              <input aria-label="Nome do item" placeholder="Nome do item" value={item.nome} onChange={(evento) => setSimItens(simItens.map((x, i) => (i === indice ? { ...x, nome: evento.target.value } : x)))} className={CLASSE_CAMPO} />

              <input aria-label="Quantidade" placeholder="Qtd" inputMode="numeric" value={item.quantidade} onChange={(evento) => setSimItens(simItens.map((x, i) => (i === indice ? { ...x, quantidade: evento.target.value } : x)))} className={CLASSE_CAMPO} />

              <input aria-label="Preço unitário" placeholder="Preço (R$)" inputMode="decimal" value={item.precoUnitario} onChange={(evento) => setSimItens(simItens.map((x, i) => (i === indice ? { ...x, precoUnitario: evento.target.value } : x)))} className={CLASSE_CAMPO} />
            </div>
          ))}

          <div className="grid gap-2 md:grid-cols-2">
            <input aria-label="Número do pedido" placeholder="Número do pedido (opcional)" value={simCodigo} onChange={(evento) => setSimCodigo(evento.target.value)} className={CLASSE_CAMPO} />

            <input aria-label="Nome do cliente" placeholder="Nome do cliente (opcional)" value={simNome} onChange={(evento) => setSimNome(evento.target.value)} className={CLASSE_CAMPO} />
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => setSimItens([...simItens, { codigoItemExterno: `SIM-${simItens.length + 1}`, nome: "", quantidade: "1", precoUnitario: "" }])} className="cursor-pointer text-xs font-semibold text-orange-900 underline">
              + Outro item
            </button>

            <button type="button" onClick={() => void simular()} className="cursor-pointer rounded-lg bg-orange-600 px-4 py-2 text-xs font-semibold text-white hover:bg-orange-700">
              Simular pedido
            </button>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-3">
          <h2 className="text-lg font-bold text-slate-800">Itens da plataforma e produtos</h2>

          <p className="text-xs text-slate-500">
            {pendentes.length} sem produto ligado · {ligados.length} ligado(s). Item ligado baixa estoque pela ficha e usa o preço do canal.
            {pendencias && pendencias.eventosComErro > 0 ? ` · ${pendencias.eventosComErro} evento(s) com erro` : ""}
          </p>
        </div>

        {vinculos.length === 0 ? (
          <p className="p-5 text-sm text-slate-400">Nenhum item recebido ainda. Eles aparecem aqui quando o primeiro pedido chegar.</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {[...pendentes, ...ligados].map((vinculo) => (
              <li key={vinculo.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <div>
                  <p className="font-semibold text-slate-900">{vinculo.nomeExterno || vinculo.codigoItemExterno}</p>

                  <p className="text-xs text-slate-500">código {vinculo.codigoItemExterno}</p>
                </div>

                <select aria-label={`Produto de ${vinculo.nomeExterno ?? vinculo.codigoItemExterno}`} value={vinculo.produtoId ?? ""} onChange={(evento) => void ligar(vinculo, evento.target.value)} className="w-64 rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  <option value="">Sem produto ligado</option>

                  {produtos.map((produto) => (
                    <option key={produto.id} value={produto.id}>{produto.nome}</option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <h2 className="border-b border-slate-100 px-5 py-3 text-lg font-bold text-slate-800">Eventos recentes</h2>

        {eventos.length === 0 ? (
          <p className="p-5 text-sm text-slate-400">Nenhum evento recebido.</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {eventos.map((evento) => (
              <li key={evento.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <div>
                  <p className="font-semibold text-slate-900">
                    {evento.tipo === "PEDIDO_NOVO" ? "Pedido novo" : evento.tipo === "PEDIDO_CANCELADO" ? "Cancelamento" : evento.tipo}{" "}
                    <span className="font-normal text-slate-500">· {evento.pedidoExternoId ?? evento.eventoId}</span>
                  </p>

                  <p className="text-xs text-slate-500">
                    {dataHora(evento.recebidoEm)}
                    {evento.confirmadoEm ? " · aceito" : ""}
                    {evento.confirmacaoErro ? ` · falha ao aceitar: ${evento.confirmacaoErro}` : ""}
                    {evento.erro ? ` · ${evento.erro}` : ""}
                  </p>
                </div>

                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${COR_STATUS[evento.status] ?? COR_STATUS.RECEBIDO}`}>
                  {evento.status.toLowerCase()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
