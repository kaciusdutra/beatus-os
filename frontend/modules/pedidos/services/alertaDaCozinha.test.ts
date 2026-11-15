import { marcarComoVistos, pedidosNovosDaFila, textoDoAlerta, tituloDaAba, type PedidoParaAlerta } from "./alertaDaCozinha";

let verificacoes = 0;

function verificar(condicao: boolean, mensagem: string): void {
  verificacoes++;

  if (!condicao) {
    throw new Error(`Falha: ${mensagem}`);
  }
}

const pedido = (id: string, numero: string, statusOperacional = "NOVO", canal = "CARDAPIO_ONLINE"): PedidoParaAlerta => ({ id, numero, canal, statusOperacional });

// Primeira leitura: nada de alarme para o que já estava lá.
const inicial = [pedido("a", "10"), pedido("b", "11", "EM_PREPARO")];

verificar(pedidosNovosDaFila(null, inicial).length === 0, "na primeira leitura não avisa");

let vistos = marcarComoVistos(null, inicial);

verificar(vistos.size === 2, "guarda o que já viu");

// Nada mudou.
verificar(pedidosNovosDaFila(vistos, inicial).length === 0, "sem pedido novo, sem aviso");

// Chega um pedido novo (aprovado).
const comNovo = [...inicial, pedido("c", "12")];

const novos = pedidosNovosDaFila(vistos, comNovo);

verificar(novos.length === 1 && novos[0].numero === "12", "avisa do pedido que chegou");

vistos = marcarComoVistos(vistos, comNovo);

verificar(pedidosNovosDaFila(vistos, comNovo).length === 0, "não avisa duas vezes do mesmo pedido");

// Dois ao mesmo tempo.
const doisNovos = [...comNovo, pedido("d", "13"), pedido("e", "14", "NOVO", "IFOOD")];

verificar(pedidosNovosDaFila(vistos, doisNovos).length === 2, "dois pedidos de uma vez");

// Pedido que já em preparo aparece pela primeira vez (ex.: tela aberta depois): não é "novo".
verificar(pedidosNovosDaFila(vistos, [...comNovo, pedido("f", "15", "EM_PREPARO")]).length === 0, "só a fila de novos dispara aviso");

// Pedido que sai e volta de coluna não avisa de novo.
verificar(pedidosNovosDaFila(vistos, [pedido("a", "10", "PRONTO"), pedido("c", "12")]).length === 0, "mudar de coluna não é pedido novo");

// Título da aba e texto.
verificar(tituloDaAba(0) === "Cozinha", "sem fila o título é o normal");
verificar(tituloDaAba(1) === "(1) pedido novo · Cozinha", "título com um pedido");
verificar(tituloDaAba(3) === "(3) pedidos novos · Cozinha", "título com vários pedidos");
verificar(textoDoAlerta([]) === "" && textoDoAlerta([pedido("x", "20")]) === "Pedido novo #20 (CARDAPIO_ONLINE)", "texto de um pedido");
verificar(textoDoAlerta([pedido("x", "20"), pedido("y", "21")]) === "2 pedidos novos: #20, #21", "texto de vários pedidos");

console.log(`✅ Testes do alerta da cozinha passaram (${verificacoes} verificações).`);
