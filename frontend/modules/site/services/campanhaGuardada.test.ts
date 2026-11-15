import { CHAVE_DA_CAMPANHA, VALIDADE_DA_CAMPANHA_MS, guardarCampanhaDoEndereco, lerCampanhaGuardada, type Armazenamento } from "./campanhaGuardada";

let total = 0;

function verificar(condicao: boolean, descricao: string) {
  total += 1;

  if (!condicao) {
    throw new Error(`Falhou: ${descricao}`);
  }
}

function criarArmazenamento(): Armazenamento & { dados: Map<string, string> } {
  const dados = new Map<string, string>();

  return { dados, getItem: (chave) => dados.get(chave) ?? null, setItem: (chave, valor) => void dados.set(chave, valor) };
}

const t0 = 1_000_000_000_000;

{
  const a = criarArmazenamento();

  verificar(guardarCampanhaDoEndereco(a, new URLSearchParams("x=1"), t0) === undefined && a.dados.size === 0, "sem utm não guarda");

  verificar(guardarCampanhaDoEndereco(a, new URLSearchParams("utm_source=instagram&utm_campaign=Clube Outubro"), t0)?.nome === "clube-outubro", "guarda com utm");

  verificar(lerCampanhaGuardada(a, t0 + 1000)?.fonte === "instagram", "lê logo depois");

  // Último clique vence.
  guardarCampanhaDoEndereco(a, new URLSearchParams("utm_source=whatsapp&utm_campaign=aniversario"), t0 + 2000);

  verificar(lerCampanhaGuardada(a, t0 + 3000)?.nome === "aniversario", "o último clique substitui");

  // Visita sem utm não apaga a campanha guardada.
  guardarCampanhaDoEndereco(a, new URLSearchParams(""), t0 + 4000);

  verificar(lerCampanhaGuardada(a, t0 + 5000)?.nome === "aniversario", "visita sem utm mantém a campanha");

  verificar(lerCampanhaGuardada(a, t0 + 2000 + VALIDADE_DA_CAMPANHA_MS + 1) === undefined, "vence em 30 dias");
  verificar(lerCampanhaGuardada(a, t0 + 2000 + VALIDADE_DA_CAMPANHA_MS - 1000)?.nome === "aniversario", "ainda vale no último dia");
  verificar(lerCampanhaGuardada(a, t0) === undefined, "relógio para trás não vale");
}

{
  const a = criarArmazenamento();

  a.dados.set(CHAVE_DA_CAMPANHA, "isto não é json");

  verificar(lerCampanhaGuardada(a, t0) === undefined, "guardado corrompido é ignorado");

  a.dados.set(CHAVE_DA_CAMPANHA, JSON.stringify({ origem: { nome: "<b>X Y</b>", fonte: 5 }, guardadaEm: t0 }));

  const lida = lerCampanhaGuardada(a, t0 + 1);

  verificar(lida?.nome === "bx-yb" && lida.fonte === undefined, "o guardado é limpo de novo ao ler");

  const quebrado: Armazenamento = {
    getItem: () => {
      throw new Error("bloqueado");
    },
    setItem: () => {
      throw new Error("bloqueado");
    },
  };

  verificar(lerCampanhaGuardada(quebrado, t0) === undefined, "armazenamento bloqueado ao ler");
  verificar(guardarCampanhaDoEndereco(quebrado, new URLSearchParams("utm_campaign=a"), t0)?.nome === "a", "armazenamento bloqueado ao guardar não quebra");
}

console.log(`[OK] campanhaGuardada: ${total} verificações`);
