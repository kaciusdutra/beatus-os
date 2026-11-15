import { LimiteDeRequisicoes, chaveDoVisitante } from "./limiteDeRequisicoes";

let verificacoes = 0;

function verificar(condicao: boolean, mensagem: string): void {
  verificacoes++;

  if (!condicao) {
    throw new Error(`Falha: ${mensagem}`);
  }
}

let relogio = 1_000_000;

const limite = new LimiteDeRequisicoes(3, 60_000, () => relogio);

verificar(limite.permitir("a").permitido && limite.permitir("a").permitido && limite.permitir("a").permitido, "três pedidos passam");

const quarto = limite.permitir("a");

verificar(!quarto.permitido && quarto.esperarSegundos === 60, "o quarto é barrado e diz quanto esperar");
verificar(limite.permitir("b").permitido, "outro visitante não é afetado");

relogio += 30_000;

verificar(!limite.permitir("a").permitido && limite.permitir("a").esperarSegundos === 30, "no meio da janela continua barrado");

relogio += 30_000;

verificar(limite.permitir("a").permitido, "passada a janela, volta a passar");

// Memória: visitantes antigos são esquecidos.
const grande = new LimiteDeRequisicoes(1, 1000, () => relogio);

for (let i = 0; i < 5000; i++) {
  grande.permitir(`v${i}`);
}

relogio += 5000;

verificar(grande.permitir("novo").permitido, "com a tabela cheia ainda atende");

// Visitante.
verificar(chaveDoVisitante(new Headers({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" })) === "203.0.113.9", "primeiro endereço encaminhado");
verificar(chaveDoVisitante(new Headers({ "x-real-ip": "198.51.100.4" })) === "198.51.100.4", "x-real-ip");
verificar(chaveDoVisitante(new Headers()) === "desconhecido", "sem cabeçalho");

console.log(`✅ Testes do limite de requisições passaram (${verificacoes} verificações).`);
