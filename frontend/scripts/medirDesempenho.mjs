// Mede a velocidade do Beatus (só leituras e a estimativa do checkout, que não grava nada).
// Rode contra o sistema em MODO DE PRODUÇÃO (no servidor, ou aqui com "npm run build" e "npm start"):
// no modo de desenvolvimento (next dev) cada tela compila na primeira visita e os números não valem.
//
//   node scripts/medirDesempenho.mjs https://meu-dominio.com.br LOGIN SENHA
//   node scripts/medirDesempenho.mjs http://localhost:3000 LOGIN SENHA
//
// Mostra, para cada rota, o tempo de um acesso por vez e o de vários ao mesmo tempo (a hora do pico).

const [base = "http://localhost:3000", login, senha] = process.argv.slice(2);

const SIMULTANEOS = 20;

const TOTAL = 200;

let cookie = "";

async function um(caminho, opcoes) {
  const inicio = performance.now();

  const resposta = await fetch(base + caminho, {
    ...opcoes,
    headers: { "Content-Type": "application/json", "x-forwarded-for": `198.51.100.${1 + Math.floor(Math.random() * 250)}`, ...(cookie ? { cookie } : {}) },
    body: opcoes?.body ? JSON.stringify(opcoes.body) : undefined,
  });

  await resposta.text();

  return { ms: performance.now() - inicio, ok: resposta.status < 400 };
}

function percentil(ordenado, fracao) {
  return ordenado[Math.min(ordenado.length - 1, Math.floor(ordenado.length * fracao))];
}

async function medir(nome, caminho, opcoes) {
  // Um de cada vez
  const sozinho = [];

  for (let i = 0; i < 20; i++) {
    sozinho.push((await um(caminho, opcoes)).ms);
  }

  sozinho.sort((a, b) => a - b);

  // Vários ao mesmo tempo
  const juntos = [];

  let erros = 0;

  let proximo = 0;

  const inicio = performance.now();

  await Promise.all(
    Array.from({ length: SIMULTANEOS }, async () => {
      while (proximo < TOTAL) {
        proximo += 1;

        const resultado = await um(caminho, opcoes);

        juntos.push(resultado.ms);

        if (!resultado.ok) {
          erros += 1;
        }
      }
    })
  );

  juntos.sort((a, b) => a - b);

  const segundos = (performance.now() - inicio) / 1000;

  console.log(
    `${nome.padEnd(34)} sozinho: ${percentil(sozinho, 0.5).toFixed(0)} ms | ${SIMULTANEOS} juntos: mediana ${percentil(juntos, 0.5).toFixed(0)} ms, p95 ${percentil(juntos, 0.95).toFixed(0)} ms, ${(TOTAL / segundos).toFixed(0)} pedidos/s, erros ${erros}`
  );
}

if (!login || !senha) {
  console.error("Uso: node scripts/medirDesempenho.mjs ENDERECO LOGIN SENHA");

  process.exit(1);
}

const entrada = await fetch(base + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ login, senha }) });

if (!entrada.ok) {
  console.error("Não consegui entrar: confira o endereço, o login e a senha.");

  process.exit(1);
}

cookie = entrada.headers
  .getSetCookie()
  .map((parte) => parte.split(";")[0])
  .join("; ");

const produtos = (await (await fetch(base + "/api/produtos", { headers: { cookie } })).json()).produtos ?? [];

const produto = produtos.find((item) => item.ativo !== false) ?? produtos[0];

console.log(`Medindo ${base} (${TOTAL} pedidos por rota, ${SIMULTANEOS} ao mesmo tempo)\n`);

await medir("Cardápio público (API)", "/api/publico/cardapio");

await medir("Página /cardapio", "/cardapio");

if (produto) {
  await medir("Estimativa do checkout", "/api/publico/checkout/estimativa", {
    method: "POST",
    body: {
      cliente: { nome: "Teste de Velocidade", telefone: "92988880098", cpf: "52998224725" },
      endereco: { cep: "69000-001", logradouro: "Rua A", numero: "1", bairro: "Centro", cidade: "Manaus", estado: "AM" },
      itens: [{ produtoId: produto.id, quantidade: 1 }],
      consentimentos: { aceitaPolitica: true },
    },
  });
}

await medir("Lista de pedidos (Cozinha)", "/api/pedidos");

await medir("Buscar cliente pelo telefone", "/api/clientes?telefone=92900000000");

await medir("Análise de vendas (Dashboard)", "/api/dashboard/analise");
