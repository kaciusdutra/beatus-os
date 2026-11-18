import { CHAVE_DA_VANTAGEM, codigoDeCartaoValido, guardarCodigoDaVantagem, limparVantagemGuardada, lerCodigoDaVantagem, type ArmazenamentoDaVantagem } from "./vantagemGuardada";

let verificacoes = 0;

function verificar(condicao: boolean, mensagem: string): void {
  verificacoes++;

  if (!condicao) {
    throw new Error(`Falha: ${mensagem}`);
  }
}

function criar(): ArmazenamentoDaVantagem & { dados: Map<string, string> } {
  const dados = new Map<string, string>();

  return { dados, getItem: (c) => dados.get(c) ?? null, setItem: (c, v) => void dados.set(c, v), removeItem: (c) => void dados.delete(c) };
}

const codigo = "l74m0w4PHIsXtQqc1km8xqsYwmUZhDY96LIWJxxyHuE";

verificar(codigo.length === 43 && codigoDeCartaoValido(codigo), "código de 43 caracteres vale");
verificar(!codigoDeCartaoValido("curto") && !codigoDeCartaoValido(codigo + "x") && !codigoDeCartaoValido("<script>".padEnd(43, "a")) && !codigoDeCartaoValido(null) && !codigoDeCartaoValido(7), "o que não é código é recusado");

{
  const a = criar();

  verificar(lerCodigoDaVantagem(a) === undefined, "sem nada guardado");
  verificar(guardarCodigoDaVantagem(a, codigo) && lerCodigoDaVantagem(a) === codigo, "guarda e lê");
  verificar(!guardarCodigoDaVantagem(a, "invalido") && lerCodigoDaVantagem(a) === codigo, "código inválido não troca o guardado");

  limparVantagemGuardada(a);

  verificar(lerCodigoDaVantagem(a) === undefined, "limpar apaga");

  a.dados.set(CHAVE_DA_VANTAGEM, "<img src=x onerror=alert(1)>");

  verificar(lerCodigoDaVantagem(a) === undefined, "lixo no armazenamento é ignorado na leitura");
}

{
  const quebrado: ArmazenamentoDaVantagem = {
    getItem: () => {
      throw new Error("bloqueado");
    },
    setItem: () => {
      throw new Error("bloqueado");
    },
    removeItem: () => {
      throw new Error("bloqueado");
    },
  };

  verificar(lerCodigoDaVantagem(quebrado) === undefined && !guardarCodigoDaVantagem(quebrado, codigo), "armazenamento bloqueado não quebra");

  limparVantagemGuardada(quebrado);

  verificar(true, "limpar com armazenamento bloqueado não quebra");
}

console.log(`✅ Testes da vantagem guardada no navegador passaram (${verificacoes} verificações).`);
