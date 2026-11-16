import {
  EnvioDeAvisosService,
  ErroDeEnvio,
  MAXIMO_DE_TENTATIVAS,
  VALIDADE_DO_AVISO_MS,
  telefoneParaWhatsapp,
  type AvisoParaEnviar,
  type EnviadorDeAviso,
  type FilaDeAvisosPort,
  type MensagemDeAviso,
} from "./envioDeAvisos";

import { WhatsAppCloudGateway } from "./whatsappCloudGateway";

let verificacoes = 0;

function verificar(condicao: boolean, mensagem: string): void {
  verificacoes++;

  if (!condicao) {
    throw new Error(`Falha: ${mensagem}`);
  }
}

const agora = new Date("2026-11-16T15:00:00.000Z");

// ---------- Telefone ----------

verificar(telefoneParaWhatsapp("92988880001") === "5592988880001", "celular com DDD ganha o 55");
verificar(telefoneParaWhatsapp("(92) 98888-0001") === "5592988880001", "tira a máscara");
verificar(telefoneParaWhatsapp("5592988880001") === "5592988880001", "já com o 55 fica igual");
verificar(telefoneParaWhatsapp("+55 92 98888-0001") === "5592988880001", "com + e espaços");
verificar(telefoneParaWhatsapp("9232221234") === "559232221234", "fixo com DDD");
verificar(telefoneParaWhatsapp("988880001") === undefined, "sem DDD não vale");
verificar(telefoneParaWhatsapp("0192988880001") === undefined, "DDD com zero não vale");
verificar(telefoneParaWhatsapp("92888880001") === undefined, "celular de 11 dígitos precisa começar em 9");
verificar(telefoneParaWhatsapp("") === undefined && telefoneParaWhatsapp(undefined) === undefined && telefoneParaWhatsapp(null) === undefined, "vazio não vale");

// ---------- Serviço ----------

const aviso = (id: string, extras: Partial<AvisoParaEnviar> = {}): AvisoParaEnviar => ({
  id,
  evento: "EM_PREPARO",
  canal: "WHATSAPP",
  texto: `Aviso ${id}`,
  tentativas: 0,
  criadoEm: new Date(agora.getTime() - 60_000),
  numeroDoPedido: "33",
  situacaoDoPedido: "EM_PREPARO",
  telefoneDoCliente: "92988880001",
  ...extras,
});

function criarFila(avisos: AvisoParaEnviar[], ocupados: string[] = []) {
  const estado = new Map<string, { status: string; erro?: string; tentativas: number }>();

  for (const item of avisos) {
    estado.set(item.id, { status: "PENDENTE", tentativas: item.tentativas });
  }

  const fila: FilaDeAvisosPort = {
    async pendentes(limite) {
      return avisos.filter((item) => estado.get(item.id)?.status === "PENDENTE").slice(0, limite);
    },
    async reservar(id) {
      if (ocupados.includes(id)) return false;
      estado.get(id)!.tentativas += 1;
      return true;
    },
    async marcarEnviado(id) {
      estado.get(id)!.status = "ENVIADO";
    },
    async marcarDispensado(id, motivo) {
      Object.assign(estado.get(id)!, { status: "DISPENSADO", erro: motivo });
    },
    async registrarFalha(id, erro, finalizar) {
      Object.assign(estado.get(id)!, { erro, ...(finalizar ? { status: "FALHOU" } : {}) });
    },
  };

  return { fila, estado };
}

function enviadorQue(comportamento: (m: MensagemDeAviso) => Promise<{ idExterno?: string }>) {
  const enviadas: MensagemDeAviso[] = [];

  const enviador: EnviadorDeAviso = {
    async enviar(mensagem) {
      enviadas.push(mensagem);

      return comportamento(mensagem);
    },
  };

  return { enviador, enviadas };
}

async function principal() {
  // Envio normal
  {
    const { fila, estado } = criarFila([aviso("a")]);

    const { enviador, enviadas } = enviadorQue(async () => ({ idExterno: "wamid.1" }));

    const r = await new EnvioDeAvisosService({ fila, enviador, agora: () => agora }).enviarPendentes();

    verificar(r.configurado && r.enviados === 1 && estado.get("a")!.status === "ENVIADO", "aviso do WhatsApp é enviado e marcado ENVIADO");
    verificar(enviadas[0].telefone === "5592988880001" && enviadas[0].numeroDoPedido === "33" && enviadas[0].texto === "Aviso a", "a mensagem leva telefone com DDI, número do pedido e texto");

    const de_novo = await new EnvioDeAvisosService({ fila, enviador, agora: () => agora }).enviarPendentes();

    verificar(de_novo.enviados === 0 && enviadas.length === 1, "o que já foi enviado não sai duas vezes");
  }

  // Sem a conexão com a Meta: nada sai, o do site é dispensado
  {
    const { fila, estado } = criarFila([aviso("w"), aviso("s", { canal: "SITE" })]);

    const r = await new EnvioDeAvisosService({ fila, enviador: null, agora: () => agora }).enviarPendentes();

    verificar(!r.configurado && r.adiados === 1 && r.enviados === 0, "sem conexão: o aviso do WhatsApp espera");
    verificar(estado.get("w")!.status === "PENDENTE", "e continua aguardando envio");
    verificar(estado.get("s")!.status === "DISPENSADO" && r.dispensados === 1, "o aviso do site é dispensado (a página do pedido já mostra)");
  }

  // Pedido cancelado e aviso velho
  {
    const { fila, estado } = criarFila([aviso("c", { situacaoDoPedido: "CANCELADO" }), aviso("v", { criadoEm: new Date(agora.getTime() - VALIDADE_DO_AVISO_MS - 1000) })]);

    const { enviador, enviadas } = enviadorQue(async () => ({}));

    const r = await new EnvioDeAvisosService({ fila, enviador, agora: () => agora }).enviarPendentes();

    verificar(estado.get("c")!.status === "DISPENSADO" && estado.get("v")!.status === "DISPENSADO" && r.dispensados === 2 && enviadas.length === 0, "pedido cancelado e aviso com mais de 6 horas não saem");
  }

  // Telefone inválido
  {
    const { fila, estado } = criarFila([aviso("t", { telefoneDoCliente: "123" })]);

    const { enviador, enviadas } = enviadorQue(async () => ({}));

    const r = await new EnvioDeAvisosService({ fila, enviador, agora: () => agora }).enviarPendentes();

    verificar(estado.get("t")!.status === "FALHOU" && r.falhas === 1 && enviadas.length === 0, "telefone inválido falha na hora, sem chamar a Meta");
  }

  // Reservado por outra tela
  {
    const { fila, estado } = criarFila([aviso("r")], ["r"]);

    const { enviador, enviadas } = enviadorQue(async () => ({}));

    await new EnvioDeAvisosService({ fila, enviador, agora: () => agora }).enviarPendentes();

    verificar(enviadas.length === 0 && estado.get("r")!.status === "PENDENTE", "aviso que outra tela já pegou não é enviado de novo");
  }

  // Falha definitiva
  {
    const { fila, estado } = criarFila([aviso("d")]);

    const { enviador } = enviadorQue(async () => {
      throw new ErroDeEnvio("telefone sem WhatsApp", true);
    });

    const r = await new EnvioDeAvisosService({ fila, enviador, agora: () => agora }).enviarPendentes();

    verificar(estado.get("d")!.status === "FALHOU" && estado.get("d")!.erro === "telefone sem WhatsApp" && r.falhas === 1, "falha definitiva vira FALHOU com o motivo");
  }

  // Falha passageira: tenta de novo e, no limite, desiste
  {
    const { fila, estado } = criarFila([aviso("p")]);

    const { enviador, enviadas } = enviadorQue(async () => {
      throw new ErroDeEnvio("rede", false);
    });

    const servico = new EnvioDeAvisosService({ fila, enviador, agora: () => agora });

    const primeira = await servico.enviarPendentes();

    verificar(primeira.adiados === 1 && estado.get("p")!.status === "PENDENTE" && estado.get("p")!.erro === "rede", "falha passageira mantém o aviso aguardando");

    // As tentativas que o banco contaria
    const avisosDeNovo = [aviso("p", { tentativas: 1 })];

    const { fila: fila2, estado: estado2 } = criarFila(avisosDeNovo);

    const r2 = await new EnvioDeAvisosService({ fila: fila2, enviador, agora: () => agora }).enviarPendentes();

    verificar(r2.adiados === 1 && estado2.get("p")!.status === "PENDENTE", "segunda falha ainda tenta de novo");

    const { fila: fila3, estado: estado3 } = criarFila([aviso("p", { tentativas: MAXIMO_DE_TENTATIVAS - 1 })]);

    const r3 = await new EnvioDeAvisosService({ fila: fila3, enviador, agora: () => agora }).enviarPendentes();

    verificar(r3.falhas === 1 && estado3.get("p")!.status === "FALHOU", "na última tentativa desiste e marca FALHOU");

    verificar(enviadas.length === 3, "cada ciclo tenta uma vez");
  }

  // Um aviso com erro não trava os outros
  {
    const { fila, estado } = criarFila([aviso("x"), aviso("y")]);

    const { enviador } = enviadorQue(async (m) => {
      if (m.texto === "Aviso x") throw new ErroDeEnvio("recusado", true);

      return {};
    });

    await new EnvioDeAvisosService({ fila, enviador, agora: () => agora }).enviarPendentes();

    verificar(estado.get("x")!.status === "FALHOU" && estado.get("y")!.status === "ENVIADO", "o erro de um aviso não impede o seguinte");
  }

  // ---------- Gateway da Meta (com fetch de mentira) ----------

  function respostaDe(status: number, corpo: unknown): Response {
    return new Response(JSON.stringify(corpo), { status, headers: { "Content-Type": "application/json" } });
  }

  const mensagem: MensagemDeAviso = { telefone: "5592988880001", evento: "A_CAMINHO", numeroDoPedido: "33", texto: "Seu pedido nº 33 saiu para a entrega e está a caminho." };

  {
    let chamada: { url: string; init: RequestInit } | undefined;

    const gateway = new WhatsAppCloudGateway({
      accessToken: "token-de-teste",
      phoneNumberId: "123456",
      fetcher: (async (url: string, init: RequestInit) => {
        chamada = { url, init };

        return respostaDe(200, { messages: [{ id: "wamid.ABC" }] });
      }) as unknown as typeof fetch,
    });

    const r = await gateway.enviar(mensagem);

    const corpo = JSON.parse(String(chamada!.init.body));

    verificar(r.idExterno === "wamid.ABC", "devolve o id da mensagem");
    verificar(chamada!.url === "https://graph.facebook.com/v23.0/123456/messages", "chama a API do Graph com a versão e o número");
    verificar((chamada!.init.headers as Record<string, string>).Authorization === "Bearer token-de-teste", "autentica com o token");
    verificar(corpo.type === "text" && corpo.to === "5592988880001" && corpo.text.body === mensagem.texto, "sem modelo configurado, vai texto livre");
  }

  {
    let corpo: { type: string; template: { name: string; language: { code: string }; components: { parameters: { text: string }[] }[] } } | undefined;

    const gateway = new WhatsAppCloudGateway({
      accessToken: "t",
      phoneNumberId: "1",
      modelos: { A_CAMINHO: "beatus_pedido_a_caminho" },
      fetcher: (async (_url: string, init: RequestInit) => {
        corpo = JSON.parse(String(init.body));

        return respostaDe(200, { messages: [{ id: "x" }] });
      }) as unknown as typeof fetch,
    });

    await gateway.enviar(mensagem);

    verificar(corpo!.type === "template" && corpo!.template.name === "beatus_pedido_a_caminho" && corpo!.template.language.code === "pt_BR", "com modelo configurado, vai a mensagem-modelo em pt_BR");
    verificar(corpo!.template.components[0].parameters[0].text === "33", "a variável do modelo é o número do pedido");

    await gateway.enviar({ ...mensagem, evento: "ENTREGUE" }).then(() => undefined);

    verificar(corpo!.type === "text", "evento sem modelo configurado continua em texto livre");
  }

  async function erroDe(status: number, corpo: unknown): Promise<ErroDeEnvio> {
    const gateway = new WhatsAppCloudGateway({ accessToken: "t", phoneNumberId: "1", fetcher: (async () => respostaDe(status, corpo)) as unknown as typeof fetch });

    try {
      await gateway.enviar(mensagem);
    } catch (error) {
      return error as ErroDeEnvio;
    }

    throw new Error("Falha: era para dar erro");
  }

  {
    const recusado = await erroDe(400, { error: { message: "Recipient phone number not in allowed list", code: 131030 } });

    verificar(recusado instanceof ErroDeEnvio && recusado.definitivo && /131030/.test(recusado.message), "recusa da Meta (4xx) é definitiva e mostra o código");

    verificar(!(await erroDe(429, { error: { message: "limite", code: 130429 } })).definitivo, "limite de envios (429) tenta de novo");

    verificar(!(await erroDe(503, {})).definitivo, "servidor da Meta fora do ar (5xx) tenta de novo");

    const semCorpo = new WhatsAppCloudGateway({ accessToken: "t", phoneNumberId: "1", fetcher: (async () => new Response("não é json", { status: 400 })) as unknown as typeof fetch });

    const erro = await semCorpo.enviar(mensagem).catch((e: ErroDeEnvio) => e);

    verificar(erro instanceof ErroDeEnvio && erro.definitivo, "resposta que não é JSON não quebra");

    const semRede = new WhatsAppCloudGateway({
      accessToken: "token-secreto",
      phoneNumberId: "1",
      fetcher: (async () => {
        throw new Error("ECONNRESET");
      }) as unknown as typeof fetch,
    });

    const e2 = await semRede.enviar(mensagem).catch((e: ErroDeEnvio) => e);

    verificar(e2 instanceof ErroDeEnvio && !e2.definitivo && !e2.message.includes("token-secreto"), "queda de rede tenta de novo e não vaza o token");
  }

  console.log(`✅ Testes do envio de avisos passaram (${verificacoes} verificações).`);
}

principal().catch((error) => {
  console.error(error);

  process.exit(1);
});
