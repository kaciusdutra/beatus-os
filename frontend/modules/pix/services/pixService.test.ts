import { lerPix } from "./gerarPix";

import { PixService, novoTxid } from "./pixService";

import type { PixConfiguracaoRepositoryPort, PixSalvo } from "../repositories/pixConfiguracaoRepositoryPort";

let verificacoes = 0;

function verificar(condicao: boolean, mensagem: string): void {
  verificacoes++;

  if (!condicao) {
    throw new Error(`Falha: ${mensagem}`);
  }
}

class RepositorioFalso implements PixConfiguracaoRepositoryPort {
  salvo: PixSalvo = {};

  async buscar() {
    return { ...this.salvo };
  }

  async salvar(dados: Required<PixSalvo>) {
    this.salvo = { ...dados };

    return { ...this.salvo };
  }
}

async function recusa(promessa: Promise<unknown>): Promise<string> {
  try {
    await promessa;
  } catch (erro) {
    return erro instanceof Error ? erro.message : "";
  }

  return "";
}

async function executarTestes(): Promise<void> {
  // Identificador da cobrança
  const txid = novoTxid(new Date("2026-11-15T12:00:00Z"), () => 0.5);

  verificar(/^BTS[0-9A-Z]+$/.test(txid) && txid.length <= 25, "txid com prefixo BTS, só letras e números, até 25");
  verificar(novoTxid(new Date("2026-11-15T12:00:00Z"), () => 0.1) !== txid, "o sufixo aleatório muda o txid");

  const repo = new RepositorioFalso();

  const servico = new PixService(repo);

  // Sem configuração
  verificar(!(await servico.obterConfiguracao()).configurado, "começa sem configuração");
  verificar((await recusa(servico.gerarCobranca(50))).includes("não está configurado"), "sem configuração não gera cobrança");

  // Configuração: normaliza a chave e os textos
  const config = await servico.salvarConfiguracao({
    chave: "(92) 99999-0000",
    nomeRecebedor: "Beatus Burger Ltda.",
    cidade: "Manaus",
  });

  verificar(config.configurado && config.chave === "+5592999990000" && config.tipoDaChave === "TELEFONE", "chave normalizada para +55 e tipo reconhecido");
  verificar(config.nomeRecebedor === "BEATUS BURGER LTDA" && config.cidade === "MANAUS", "nome e cidade no formato do Pix");

  verificar((await recusa(servico.salvarConfiguracao({ chave: "12345", nomeRecebedor: "B", cidade: "M" }))).includes("não reconhecida"), "chave inválida é recusada");
  verificar((await recusa(servico.salvarConfiguracao({ chave: "a@b.com", nomeRecebedor: "!!", cidade: "M" }))).includes("nome"), "nome sem letras é recusado");
  verificar((await recusa(servico.salvarConfiguracao({ chave: "a@b.com", nomeRecebedor: "B", cidade: "" }))).includes("cidade"), "cidade vazia é recusada");

  // Cobrança
  const cobranca = await servico.gerarCobranca(65.5, "Pedido Beatus");

  const lido = lerPix(cobranca.copiaECola);

  verificar(lido.crcValido, "o código gerado tem CRC válido");
  verificar(lido.campos["54"] === "65.50", "o valor vai no código");
  verificar(lido.campos["26"].includes("+5592999990000"), "a chave configurada vai no código");
  verificar(lido.campos["62"].includes(cobranca.txid), "o txid da cobrança vai no código");
  verificar(cobranca.recebedor.nome === "BEATUS BURGER LTDA", "devolve o recebedor para a tela mostrar");

  verificar((await recusa(servico.gerarCobranca(0))).includes("maior que zero"), "valor zero é recusado");

  const teste = await servico.gerarTeste();

  verificar(lerPix(teste.copiaECola).campos["54"] === "1.00", "o teste é de R$ 1,00");
}

executarTestes()
  .then(() => {
    console.log(`✅ Testes do serviço do Pix passaram (${verificacoes} verificações).`);
  })
  .catch((erro) => {
    console.error(erro);

    process.exitCode = 1;
  });
