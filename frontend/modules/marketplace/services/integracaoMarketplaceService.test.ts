import { IntegracaoMarketplaceService } from "./integracaoMarketplaceService";

import type { PedidosDoMarketplace } from "./integracaoMarketplaceService";

import { montarPedidoDoMarketplace } from "./montarPedidoDoMarketplace";

import type {
  ConfiguracaoSalva,
  MarketplaceRepositoryPort,
} from "../repositories/marketplaceRepositoryPort";

import type { PlataformaMarketplacePort } from "../plataformas/plataformaPort";

import type {
  EventoDaPlataforma,
  EventoRegistrado,
  PedidoDaPlataforma,
  VinculoDeItem,
} from "../types/marketplace";

let verificacoes = 0;

function verificar(condicao: boolean, mensagem: string): void {
  verificacoes++;

  if (!condicao) {
    throw new Error(`Falha: ${mensagem}`);
  }
}

// ---------- Banco de mentira ----------
class RepositorioFalso implements MarketplaceRepositoryPort {
  configuracao: ConfiguracaoSalva = { ativo: true, aceiteAutomatico: true, modoSimulacao: false };
  eventos: (EventoRegistrado & { bruto?: unknown })[] = [];
  vinculos: VinculoDeItem[] = [];
  contatos: (string | undefined)[] = [];

  async buscarConfiguracao() {
    return { ...this.configuracao };
  }

  async salvarConfiguracao(_c: string, dados: Pick<ConfiguracaoSalva, "ativo" | "aceiteAutomatico" | "modoSimulacao" | "idDaLoja">) {
    this.configuracao = { ...this.configuracao, ...dados };

    return { ...this.configuracao };
  }

  async registrarContato(_c: string, falha?: string) {
    this.contatos.push(falha);
  }

  async registrarEvento(canal: string, evento: EventoDaPlataforma) {
    const existente = this.eventos.find((e) => e.eventoId === evento.eventoId);

    if (existente) {
      return { registro: existente, novo: false };
    }

    const registro: EventoRegistrado = {
      id: `ev-${this.eventos.length + 1}`,
      canal,
      eventoId: evento.eventoId,
      pedidoExternoId: evento.pedidoExternoId,
      tipo: evento.tipo,
      status: "RECEBIDO",
      recebidoEm: new Date().toISOString(),
    };

    this.eventos.push(registro);

    return { registro, novo: true };
  }

  async atualizarEvento(id: string, dados: Parameters<MarketplaceRepositoryPort["atualizarEvento"]>[1]) {
    const evento = this.eventos.find((e) => e.id === id)!;

    if (dados.status) evento.status = dados.status;
    if (dados.erro !== undefined) evento.erro = dados.erro ?? undefined;
    if (dados.pedidoId !== undefined) evento.pedidoId = dados.pedidoId ?? undefined;
    if (dados.confirmadoEm !== undefined) evento.confirmadoEm = dados.confirmadoEm?.toISOString();
    if (dados.confirmacaoErro !== undefined) evento.confirmacaoErro = dados.confirmacaoErro ?? undefined;
  }

  async listarEventos() {
    return [...this.eventos];
  }

  async buscarPedidoCriado(_c: string, pedidoExternoId: string) {
    return (
      this.eventos.find(
        (e) => e.pedidoExternoId === pedidoExternoId && e.tipo === "PEDIDO_NOVO" && e.status === "PROCESSADO"
      )?.pedidoId ?? null
    );
  }

  async resolverVinculos(canal: string, itens: { codigoItemExterno: string; nome: string }[]) {
    const mapa = new Map<string, string | null>();

    for (const item of itens) {
      let vinculo = this.vinculos.find((v) => v.codigoItemExterno === item.codigoItemExterno);

      if (!vinculo) {
        vinculo = { id: `v-${this.vinculos.length + 1}`, canal, codigoItemExterno: item.codigoItemExterno, nomeExterno: item.nome };

        this.vinculos.push(vinculo);
      }

      mapa.set(item.codigoItemExterno, vinculo.produtoId ?? null);
    }

    return mapa;
  }

  async listarVinculos() {
    return [...this.vinculos];
  }

  async ligarVinculo(id: string, produtoId: string | null) {
    const vinculo = this.vinculos.find((v) => v.id === id)!;

    vinculo.produtoId = produtoId ?? undefined;

    return vinculo;
  }

  async contarPendencias() {
    return {
      vinculosPendentes: this.vinculos.filter((v) => !v.produtoId).length,
      eventosComErro: this.eventos.filter((e) => e.status === "ERRO").length,
    };
  }
}

// ---------- Pedidos de mentira ----------
class PedidosFalsos implements PedidosDoMarketplace {
  criados: Parameters<PedidosDoMarketplace["criar"]>[0][] = [];
  cancelados: string[] = [];
  falhar = false;
  statusAtual: "CANCELADO" | "IGNORADO" = "CANCELADO";

  async criar(pedido: Parameters<PedidosDoMarketplace["criar"]>[0]) {
    if (this.falhar) {
      throw new Error("Já existe um pedido do iFood com esse código.");
    }

    this.criados.push(pedido);

    return { id: `ped-${this.criados.length}`, numero: String(100 + this.criados.length), total: 130 };
  }

  async cancelar(pedidoId: string) {
    this.cancelados.push(pedidoId);

    return this.statusAtual;
  }
}

// ---------- Plataforma de mentira ----------
class PlataformaFalsa implements PlataformaMarketplacePort {
  canal = "IFOOD" as const;
  aceitos: string[] = [];
  falharAceite = false;
  eventosDaConsulta: EventoDaPlataforma[] = [];
  confirmados: string[] = [];
  consultaFalha = false;
  credenciais = true;

  credenciaisConfiguradas() {
    return this.credenciais;
  }

  async consultarEventos() {
    if (this.consultaFalha) {
      throw new Error("sem rede");
    }

    return this.eventosDaConsulta;
  }

  async confirmarRecebimento(ids: string[]) {
    this.confirmados.push(...ids);
  }

  async aceitarPedido(id: string) {
    if (this.falharAceite) {
      throw new Error("prazo do aceite esgotado");
    }

    this.aceitos.push(id);
  }
}

const pedidoDaPlataforma: PedidoDaPlataforma = {
  canal: "IFOOD",
  idExterno: "abc-123",
  codigoExibicao: "7421",
  nomeCliente: "Ana",
  totalDaPlataforma: 130,
  itens: [
    { codigoItemExterno: "I-1", nome: "Sanctum (iFood)", quantidade: 2, precoUnitario: 65 },
    { codigoItemExterno: "I-2", nome: "Combo novo", quantidade: 1, precoUnitario: 30 },
  ],
};

function novoEvento(id: string, extra: Partial<EventoDaPlataforma> = {}): EventoDaPlataforma {
  return {
    eventoId: id,
    tipo: "PEDIDO_NOVO",
    pedidoExternoId: "abc-123",
    pedido: pedidoDaPlataforma,
    bruto: {},
    ...extra,
  };
}

function montar() {
  const repo = new RepositorioFalso();
  const pedidos = new PedidosFalsos();
  const plataforma = new PlataformaFalsa();
  const avisos: string[] = [];

  const servico = new IntegracaoMarketplaceService(repo, pedidos, () => plataforma, async (dados) => {
    avisos.push(dados.resumo);
  });

  return { repo, pedidos, plataforma, servico, avisos };
}

async function executarTestes(): Promise<void> {
  // 1) Pedido novo: item ligado vira produto, item novo fica sem vínculo e o pedido entra mesmo assim
  {
    const { repo, pedidos, plataforma, servico, avisos } = montar();

    repo.vinculos.push({ id: "v-0", canal: "IFOOD", codigoItemExterno: "I-1", produtoId: "burger-sanctum" });

    const r = await servico.receberEvento("IFOOD", novoEvento("E1"));

    verificar(r.novo && r.evento.status === "PROCESSADO", "pedido novo é processado");
    verificar(pedidos.criados.length === 1, "criou um pedido");

    const criado = pedidos.criados[0];

    verificar(criado.canal === "IFOOD" && criado.marketplace?.codigo === "7421", "código de exibição vira o código do pedido");
    verificar(criado.itens.length === 1 && criado.itens[0].produtoId === "burger-sanctum", "item ligado vira produto");
    verificar(criado.itens[0].precoDaPlataforma === 65, "carrega o preço da plataforma como reserva");
    verificar(criado.marketplace?.itensSemVinculo?.length === 1 && criado.marketplace.itensSemVinculo[0].nome === "Combo novo", "item sem vínculo entra pelo preço da plataforma");
    verificar(r.avisos.some((a) => a.includes("sem produto ligado")), "avisa do item sem vínculo");
    verificar(avisos.some((a) => a.includes("Combo novo")), "o aviso vai para o registro de atividades");
    verificar(repo.vinculos.some((v) => v.codigoItemExterno === "I-2" && !v.produtoId), "item novo fica pendente de vínculo");
    verificar(plataforma.aceitos.includes("abc-123"), "aceite automático enviado à plataforma");
    verificar(repo.eventos[0].confirmadoEm !== undefined, "aceite registrado no evento");
    verificar((await servico.pendencias()).vinculosPendentes === 1, "1 vínculo pendente");

    // 2) O mesmo evento de novo: nada se repete
    const repetido = await servico.receberEvento("IFOOD", novoEvento("E1"));

    verificar(!repetido.novo && pedidos.criados.length === 1 && plataforma.aceitos.length === 1, "evento repetido não cria nem aceita de novo");

    // 3) Cancelamento pela plataforma
    const cancelado = await servico.receberEvento("IFOOD", { eventoId: "E2", tipo: "PEDIDO_CANCELADO", pedidoExternoId: "abc-123", bruto: {} });

    verificar(cancelado.evento.status === "PROCESSADO" && pedidos.cancelados[0] === "ped-1", "cancelamento cancela o pedido criado");
  }

  // 4) Pedido que não pôde ser criado: evento em ERRO, sem aceite
  {
    const { pedidos, plataforma, servico, repo } = montar();

    pedidos.falhar = true;

    const r = await servico.receberEvento("IFOOD", novoEvento("E3"));

    verificar(r.evento.status === "ERRO" && (r.evento.erro ?? "").includes("Já existe"), "falha na criação vira evento em erro, com a mensagem");
    verificar(plataforma.aceitos.length === 0, "sem pedido criado não há aceite");
    verificar((await repo.contarPendencias()).eventosComErro === 1, "conta 1 evento com erro");
  }

  // 5) Aceite que falha não desfaz o pedido
  {
    const { pedidos, plataforma, servico, repo } = montar();

    plataforma.falharAceite = true;

    const r = await servico.receberEvento("IFOOD", novoEvento("E4"));

    verificar(r.evento.status === "PROCESSADO" && pedidos.criados.length === 1, "o pedido existe mesmo se o aceite falhar");
    verificar((repo.eventos[0].confirmacaoErro ?? "").includes("prazo"), "a falha do aceite fica registrada");
  }

  // 6) Aceite automático desligado: não avisa a plataforma
  {
    const { repo, plataforma, servico } = montar();

    repo.configuracao.aceiteAutomatico = false;

    await servico.receberEvento("IFOOD", novoEvento("E5"));

    verificar(plataforma.aceitos.length === 0, "com o aceite automático desligado, nada é aceito");
  }

  // 7) Cancelamento de pedido desconhecido é ignorado
  {
    const { servico } = montar();

    const r = await servico.receberEvento("IFOOD", { eventoId: "E6", tipo: "PEDIDO_CANCELADO", pedidoExternoId: "nao-existe", bruto: {} });

    verificar(r.evento.status === "IGNORADO", "cancelamento de pedido que não está no Beatus é ignorado");
  }

  // 8) Simulação: só no modo simulação
  {
    const { repo, pedidos, plataforma, servico } = montar();

    repo.configuracao.modoSimulacao = true;

    const r = await servico.simularPedido("IFOOD", {
      itens: [{ codigoItemExterno: "X", nome: "Teste", quantidade: 1, precoUnitario: 20 }],
    });

    verificar(r.evento.status === "PROCESSADO" && pedidos.criados.length === 1, "simulação cria o pedido");
    verificar(plataforma.aceitos.length === 0 && r.evento.confirmadoEm !== undefined, "na simulação o aceite não chama a plataforma, mas fica registrado");

    repo.configuracao.modoSimulacao = false;

    let recusou = false;

    try {
      await servico.simularPedido("IFOOD", { itens: [{ codigoItemExterno: "X", nome: "T", quantidade: 1, precoUnitario: 1 }] });
    } catch {
      recusou = true;
    }

    verificar(recusou, "fora do modo simulação a simulação é recusada");
  }

  // 9) Configuração: sair da simulação exige credenciais
  {
    const { plataforma, servico } = montar();

    plataforma.credenciais = false;

    let recusou = false;

    try {
      await servico.salvarIntegracao("IFOOD", { ativo: true, aceiteAutomatico: true, modoSimulacao: false });
    } catch {
      recusou = true;
    }

    verificar(recusou, "sair do modo simulação sem credenciais é recusado");

    plataforma.credenciais = true;

    const ok = await servico.salvarIntegracao("IFOOD", { ativo: true, aceiteAutomatico: true, modoSimulacao: false, idDaLoja: " L1 " });

    verificar(ok.modoSimulacao === false && ok.idDaLoja === "L1", "com credenciais, sai da simulação");

    let canalRuim = false;

    try {
      await servico.obterIntegracao("RAPPI");
    } catch {
      canalRuim = true;
    }

    verificar(canalRuim, "canal fora da lista é recusado");
  }

  // 10) Consulta periódica
  {
    const { repo, plataforma, pedidos, servico } = montar();

    repo.configuracao.modoSimulacao = true;

    verificar((await servico.consultar("IFOOD")).motivo?.includes("simulação") === true, "em modo simulação não consulta");

    repo.configuracao.modoSimulacao = false;
    plataforma.eventosDaConsulta = [novoEvento("E7"), novoEvento("E8", { pedidoExternoId: "x", pedido: { ...pedidoDaPlataforma, idExterno: "x", codigoExibicao: "8000" } })];

    const consulta = await servico.consultar("IFOOD");

    verificar(consulta.consultados === 2 && pedidos.criados.length === 2, "consulta processa os eventos");
    verificar(plataforma.confirmados.length === 2, "confirma o recebimento dos eventos");
    verificar(repo.contatos.length === 1 && repo.contatos[0] === undefined, "registra o contato bem-sucedido");

    plataforma.consultaFalha = true;

    const falha = await servico.consultar("IFOOD");

    verificar(falha.falha === "sem rede" && repo.contatos[1] === "sem rede", "falha na consulta fica registrada");

    repo.configuracao.ativo = false;

    verificar((await servico.consultar("IFOOD")).motivo === "Integração desligada.", "desligada não consulta");
  }

  // 11) Montagem pura
  {
    const m = montarPedidoDoMarketplace(
      { ...pedidoDaPlataforma, codigoExibicao: undefined },
      new Map([["I-1", "burger"], ["I-2", null]])
    );

    verificar(m.codigo === "abc-123", "sem número de exibição, usa o id do pedido na plataforma");
    verificar(m.semVinculo.length === 1, "1 item sem vínculo");

    let semItens = false;

    try {
      montarPedidoDoMarketplace({ ...pedidoDaPlataforma, itens: [] }, new Map());
    } catch {
      semItens = true;
    }

    verificar(semItens, "pedido sem itens é recusado");
  }
}

executarTestes()
  .then(() => {
    console.log(`✅ Testes da integração com marketplace passaram (${verificacoes} verificações).`);
  })
  .catch((erro) => {
    console.error(erro);

    process.exitCode = 1;
  });
