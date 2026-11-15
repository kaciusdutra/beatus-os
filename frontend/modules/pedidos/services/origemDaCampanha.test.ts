import { limparOrigemDaCampanha, origemDaCampanhaDoEndereco, resumoDaCampanha } from "./origemDaCampanha";

let total = 0;

function verificar(condicao: boolean, descricao: string) {
  total += 1;

  if (!condicao) {
    throw new Error(`Falhou: ${descricao}`);
  }
}

const completa = limparOrigemDaCampanha({ fonte: "Instagram", meio: "paid", nome: "Clube Outubro", conteudo: "video_1" });

verificar(completa?.fonte === "instagram" && completa.meio === "paid" && completa.nome === "clube-outubro" && completa.conteudo === "video_1", "limpa, minúscula e espaço vira hífen");

verificar(limparOrigemDaCampanha({ nome: "<script>alert(1)</script>" })?.nome === "scriptalert1script", "tira símbolos perigosos");

verificar(limparOrigemDaCampanha({ nome: "a".repeat(200) })?.nome?.length === 60, "limita o tamanho");

verificar(limparOrigemDaCampanha({ fonte: "  ", meio: "!!!", nome: 5 }) === undefined, "sem campo útil não guarda nada");
verificar(limparOrigemDaCampanha(null) === undefined && limparOrigemDaCampanha("texto") === undefined && limparOrigemDaCampanha(undefined) === undefined, "entrada inválida");

verificar(Object.keys(limparOrigemDaCampanha({ nome: "x", inventado: "y" }) ?? {}).join() === "nome", "ignora campo desconhecido");

const doEndereco = origemDaCampanhaDoEndereco(new URLSearchParams("utm_source=instagram&utm_medium=paid&utm_campaign=clube-outubro&utm_content=v1&outro=1"));

verificar(doEndereco?.fonte === "instagram" && doEndereco.nome === "clube-outubro" && doEndereco.conteudo === "v1", "lê os utm do endereço");
verificar(origemDaCampanhaDoEndereco(new URLSearchParams("a=1")) === undefined, "endereço sem utm");

verificar(resumoDaCampanha(completa) === "instagram / paid / clube-outubro / video_1", "resumo para a tela");
verificar(resumoDaCampanha(undefined) === "", "resumo vazio");

console.log(`[OK] origemDaCampanha: ${total} verificações`);
