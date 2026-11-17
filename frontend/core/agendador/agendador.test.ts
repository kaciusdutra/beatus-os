import { Agendador } from "./agendador";

let verificacoes = 0;

function verificar(condicao: boolean, mensagem: string): void {
  verificacoes++;

  if (!condicao) {
    throw new Error(`Falha: ${mensagem}`);
  }
}

const esperar = (ms: number) => new Promise((resolver) => setTimeout(resolver, ms));

async function principal() {
  // Executa e conta
  {
    let chamadas = 0;

    const agendador = new Agendador([{ nome: "a", intervaloMs: 1000, executar: async () => void (chamadas += 1) }]);

    verificar((await agendador.executar("a")) === "executada" && chamadas === 1, "executa a tarefa");
    verificar((await agendador.executar("nao-existe")) === "inexistente", "tarefa que não existe");
  }

  // Nunca roda em cima de si mesma
  {
    let simultaneas = 0;

    let maximo = 0;

    let total = 0;

    const agendador = new Agendador([
      {
        nome: "lenta",
        intervaloMs: 1000,
        executar: async () => {
          simultaneas += 1;
          maximo = Math.max(maximo, simultaneas);
          total += 1;

          await esperar(60);

          simultaneas -= 1;
        },
      },
    ]);

    const [primeira, segunda, terceira] = await Promise.all([agendador.executar("lenta"), agendador.executar("lenta"), agendador.executar("lenta")]);

    verificar(primeira === "executada" && segunda === "ocupada" && terceira === "ocupada" && maximo === 1 && total === 1, "se a anterior não terminou, pula a vez");
    verificar((await agendador.executar("lenta")) === "executada" && total === 2, "terminada a anterior, volta a rodar");
  }

  // Erro não derruba nem para: e o log não enche
  {
    const registros: string[] = [];

    let tentativas = 0;

    const agendador = new Agendador(
      [
        {
          nome: "quebra",
          intervaloMs: 1000,
          executar: async () => {
            tentativas += 1;

            throw new Error("banco fora do ar");
          },
        },
      ],
      (mensagem) => registros.push(mensagem)
    );

    verificar((await agendador.executar("quebra")) === "falhou", "erro vira 'falhou', sem estourar");

    for (let i = 0; i < 19; i++) {
      await agendador.executar("quebra");
    }

    verificar(tentativas === 20 && registros.length === 2, "registra a 1ª falha e a 20ª, não todas");
  }

  // Depois de dar certo, a contagem de falhas zera
  {
    const registros: string[] = [];

    let falhar = true;

    const agendador = new Agendador(
      [
        {
          nome: "oscila",
          intervaloMs: 1000,
          executar: async () => {
            if (falhar) throw new Error("x");
          },
        },
      ],
      (mensagem) => registros.push(mensagem)
    );

    await agendador.executar("oscila");

    falhar = false;

    await agendador.executar("oscila");

    falhar = true;

    await agendador.executar("oscila");

    verificar(registros.length === 2, "falha nova depois de um acerto volta a ser registrada");
  }

  // Temporizadores reais: roda sozinho, repete, e para
  {
    let chamadas = 0;

    const agendador = new Agendador([{ nome: "tic", intervaloMs: 30, atrasoInicialMs: 10, executar: async () => void (chamadas += 1) }]);

    agendador.iniciar();

    agendador.iniciar();

    await esperar(130);

    agendador.parar();

    const aoParar = chamadas;

    verificar(aoParar >= 3, `roda e repete sozinho (${aoParar} vezes em 130 ms)`);

    await esperar(100);

    verificar(chamadas === aoParar, "depois de parar, não roda mais");
  }

  console.log(`✅ Testes do agendador passaram (${verificacoes} verificações).`);
}

principal().catch((erro) => {
  console.error(erro);

  process.exit(1);
});
