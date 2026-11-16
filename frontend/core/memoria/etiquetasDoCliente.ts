// A memória da Beatriz: o que ela aprendeu de cada cliente, em etiquetas curtas (gosto:agnus, evita:cebola,
// apelido:biel, aniversario:03-14). Nunca guarda conversa, dado de saúde nem outro dado sensível (LGPD).
// Tudo aqui é regra pura: a Beatriz propõe, o sistema limpa e confere antes de gravar.

export const MAXIMO_DE_ETIQUETAS = 50;

export const TAMANHO_MAXIMO_DA_ETIQUETA = 40;

// Etiquetas que só têm um valor por vez: a nova troca a antiga (o apelido, o aniversário, o ponto da carne).
const CHAVES_UNICAS = ["apelido", "aniversario", "ponto"];

// Saúde, crença, política, vida íntima e origem: nunca ficam na memória (LGPD, dados sensíveis).
// Alergia e restrição alimentar também não: vão para uma pessoa (regra 20.4).
// Termos longos valem como raiz (pegam alergia, alérgico...); os curtos só valem como palavra inteira, para não
// bloquear gosto de verdade (o "rg" está em gorgonzola).
const RAIZES_PROIBIDAS = [
  "alerg", "intoler", "celiac", "gluten", "lactose", "diabet", "hiperten", "colesterol", "gravid", "gestan", "amament",
  "cancer", "doenc", "enferm", "medic", "remedio", "saude", "depress", "ansied", "terapia", "deficien", "cadeirante",
  "religi", "igreja", "evangel", "catolic", "espirit", "umbanda", "candomble", "budis", "islam", "muculman", "judeu",
  "politic", "partido", "eleic", "bolsonar", "lesbic", "bissexual", "transex", "sexual", "divorci", "indigena",
];

const PALAVRAS_PROIBIDAS = ["cpf", "rg", "senha", "cartao", "gay", "homo", "voto", "lula", "deus", "ateu", "raca", "sexo", "negro", "casado", "casada", "namorado", "namorada", "psic"];

export type MotivoDaRecusa = "VAZIA" | "SENSIVEL" | "DADO_PESSOAL";

export interface EtiquetaLimpa {
  etiqueta?: string;
  recusada?: MotivoDaRecusa;
}

function semAcento(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// Minúsculas, sem acento, só letras, números, ":", "-" e "_", até 40 caracteres.
export function limparEtiqueta(bruta: unknown): EtiquetaLimpa {
  if (typeof bruta !== "string") {
    return { recusada: "VAZIA" };
  }

  const original = semAcento(bruta).toLowerCase().trim().replace(/^#+/, "");

  // Telefone, CPF, e-mail e afins não são gosto: são dado pessoal que não pertence à memória.
  if (/@|\d{6,}|https?:|www\./.test(original.replace(/[\s.\-()]/g, ""))) {
    return { recusada: "DADO_PESSOAL" };
  }

  const limpa = original
    .replace(/\s*:\s*/g, ":")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9:_-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/:{2,}/g, ":")
    .replace(/^[-:_]+|[-:_]+$/g, "")
    .slice(0, TAMANHO_MAXIMO_DA_ETIQUETA)
    .replace(/[-:_]+$/g, "");

  if (limpa.length < 2) {
    return { recusada: "VAZIA" };
  }

  const palavras = limpa.split(/[:_-]/);

  if (RAIZES_PROIBIDAS.some((raiz) => limpa.includes(raiz)) || PALAVRAS_PROIBIDAS.some((palavra) => palavras.includes(palavra))) {
    return { recusada: "SENSIVEL" };
  }

  return { etiqueta: limpa };
}

function chaveDaEtiqueta(etiqueta: string): string | undefined {
  const indice = etiqueta.indexOf(":");

  return indice > 0 ? etiqueta.slice(0, indice) : undefined;
}

export interface MudancaDeEtiquetas {
  adicionar: string[];
  remover: string[];
  // O que o sistema recusou (para a equipe saber).
  recusadas: string[];
}

// Lê o que a IA propôs ({ adicionar: [...], remover: [...] }) e limpa cada etiqueta.
export function lerMudancaDeEtiquetas(bruto: unknown): MudancaDeEtiquetas {
  const dados = (bruto && typeof bruto === "object" ? bruto : {}) as Record<string, unknown>;

  const recusadas: string[] = [];

  const limpar = (lista: unknown, aoRecusar: boolean): string[] => {
    const saida: string[] = [];

    for (const item of Array.isArray(lista) ? lista.slice(0, 30) : []) {
      const { etiqueta, recusada } = limparEtiqueta(item);

      if (etiqueta) {
        if (!saida.includes(etiqueta)) {
          saida.push(etiqueta);
        }
      } else if (aoRecusar && recusada && recusada !== "VAZIA") {
        recusadas.push(recusada === "SENSIVEL" ? "dado sensível" : "dado pessoal");
      }
    }

    return saida;
  };

  return { adicionar: limpar(dados.adicionar, true), remover: limpar(dados.remover, false), recusadas };
}

// As etiquetas depois da mudança: tira o que foi pedido, troca as de valor único, acrescenta as novas (a repetida
// vira a mais recente) e, passando de 50, as mais antigas saem.
export function mesclarEtiquetas(atuais: readonly string[], mudanca: Pick<MudancaDeEtiquetas, "adicionar" | "remover">): string[] {
  const remover = new Set(mudanca.remover);

  let resultado = atuais.filter((etiqueta) => !remover.has(etiqueta));

  for (const nova of mudanca.adicionar) {
    const chave = chaveDaEtiqueta(nova);

    resultado = resultado.filter((etiqueta) => etiqueta !== nova && !(chave && CHAVES_UNICAS.includes(chave) && chaveDaEtiqueta(etiqueta) === chave));

    resultado.push(nova);
  }

  return resultado.slice(-MAXIMO_DE_ETIQUETAS);
}

// Telefone como o cadastro guarda (DDD + número, só dígitos), a partir do número do WhatsApp (com DDI 55).
export function telefoneDoCadastro(telefone: string | undefined | null): string | undefined {
  const digitos = (telefone ?? "").replace(/\D/g, "");

  const nacional = digitos.startsWith("55") && (digitos.length === 12 || digitos.length === 13) ? digitos.slice(2) : digitos;

  return /^[1-9][1-9]\d{8,9}$/.test(nacional) ? nacional : undefined;
}
