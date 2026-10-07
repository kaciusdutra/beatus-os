// scripts/check.mjs
// Verificação única do Beatus OS: tipos + lint + testes.
// Uso (a partir da pasta frontend):
//   npm run check
//   npm run check:integracao
//   npm test
//
// Opções (depois de "--" quando usadas pelo npm):
//   --so=tipos|lint|testes       roda só uma etapa
//   --filtro=texto               roda só testes cujo caminho contém o texto
//   --integracao                 inclui testes que usam o banco de dados
//   --verbose                    mostra a saída completa de cada teste
//   --atualizar-linha-base       grava a contagem atual de erros do lint
//
// Regras:
//   - Termina com código 0 somente se tudo estiver verde.
//   - Teste que termina sem mostrar nada NUNCA conta como sucesso.
//   - Arquivo de teste vazio aparece como PULADO, nunca como aprovado.
//   - O lint tem "linha de base": erros antigos não travam, mas o total não pode piorar.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ARQUIVO_LINHA_BASE = path.join(RAIZ, "scripts", "lint-baseline.json");

const args = process.argv.slice(2);

function temOpcao(nome) {
  return args.includes(`--${nome}`);
}

function valorOpcao(nome) {
  const prefixo = `--${nome}=`;
  const encontrado = args.find((a) => a.startsWith(prefixo));
  return encontrado ? encontrado.slice(prefixo.length) : undefined;
}

const SO_ETAPA = valorOpcao("so");
const FILTRO = valorOpcao("filtro");
const INCLUIR_INTEGRACAO = temOpcao("integracao");
const VERBOSE = temOpcao("verbose");
const ATUALIZAR_LINHA_BASE = temOpcao("atualizar-linha-base");

const PASTAS_IGNORADAS = new Set([
  "node_modules",
  ".next",
  ".git",
  "generated",
  "storage",
  "out",
  "build",
  "coverage",
  "public",
]);

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

function paraExibicao(caminho) {
  return path.relative(RAIZ, caminho).split(path.sep).join("/");
}

function segundos(ms) {
  return `${(ms / 1000).toFixed(1)}s`;
}

function ultimasLinhas(texto, quantidade) {
  const linhas = texto.split(/\r?\n/).filter((l) => l.trim() !== "");
  return linhas.slice(-quantidade).join("\n");
}

function indentar(texto, espacos = 6) {
  const margem = " ".repeat(espacos);
  return texto
    .split(/\r?\n/)
    .map((linha) => margem + linha)
    .join("\n");
}

// Descobre o arquivo JavaScript de um programa instalado, para executá-lo
// direto com o Node. Assim não dependemos do npx nem da política de scripts
// do PowerShell.
function caminhoDoPrograma(pacote, nomeDoPrograma) {
  const pkgJson = path.join(RAIZ, "node_modules", pacote, "package.json");

  if (!fs.existsSync(pkgJson)) {
    return null;
  }

  const pkg = JSON.parse(fs.readFileSync(pkgJson, "utf8"));
  let bin = pkg.bin;

  if (bin && typeof bin === "object") {
    bin = bin[nomeDoPrograma];
  }

  if (typeof bin !== "string") {
    return null;
  }

  return path.join(RAIZ, "node_modules", pacote, bin);
}

function executar(arquivoJs, argumentos, timeoutMs) {
  const inicio = Date.now();

  const resultado = spawnSync(
    process.execPath,
    [arquivoJs, ...argumentos],
    {
      cwd: RAIZ,
      encoding: "utf8",
      maxBuffer: 256 * 1024 * 1024,
      timeout: timeoutMs,
      env: process.env,
    }
  );

  return {
    codigo: resultado.status,
    stdout: resultado.stdout ?? "",
    stderr: resultado.stderr ?? "",
    estourouTempo: resultado.error?.code === "ETIMEDOUT",
    erroDeExecucao: resultado.error && resultado.error.code !== "ETIMEDOUT"
      ? resultado.error
      : undefined,
    ms: Date.now() - inicio,
  };
}

// ---------------------------------------------------------------------------
// Etapa 1: tipos
// ---------------------------------------------------------------------------

function etapaTipos() {
  const tsc = caminhoDoPrograma("typescript", "tsc");

  if (!tsc) {
    return {
      status: "FALHOU",
      resumo: "TypeScript não encontrado. Rode: npm install",
      ms: 0,
    };
  }

  const r = executar(tsc, ["--noEmit", "-p", "tsconfig.json"], 300000);

  if (r.estourouTempo) {
    return { status: "FALHOU", resumo: "tempo esgotado", ms: r.ms };
  }

  if (r.codigo === 0) {
    return { status: "OK", resumo: "sem erros de tipo", ms: r.ms };
  }

  const saida = ultimasLinhas(r.stdout + "\n" + r.stderr, 25);

  return {
    status: "FALHOU",
    resumo: "o TypeScript encontrou erros",
    detalhe: saida,
    ms: r.ms,
  };
}

// ---------------------------------------------------------------------------
// Etapa 2: lint com linha de base
// ---------------------------------------------------------------------------

function lerLinhaBase() {
  if (!fs.existsSync(ARQUIVO_LINHA_BASE)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(ARQUIVO_LINHA_BASE, "utf8"));
  } catch {
    return null;
  }
}

function etapaLint() {
  const eslint = caminhoDoPrograma("eslint", "eslint");

  if (!eslint) {
    return {
      status: "FALHOU",
      resumo: "ESLint não encontrado. Rode: npm install",
      ms: 0,
    };
  }

  const r = executar(eslint, [".", "--format", "json"], 300000);

  if (r.estourouTempo) {
    return { status: "FALHOU", resumo: "tempo esgotado", ms: r.ms };
  }

  let relatorio;

  try {
    relatorio = JSON.parse(r.stdout);
  } catch {
    return {
      status: "FALHOU",
      resumo: "o ESLint não conseguiu rodar",
      detalhe: ultimasLinhas(r.stderr || r.stdout, 15),
      ms: r.ms,
    };
  }

  let erros = 0;
  let avisos = 0;
  const locaisDeErro = [];

  for (const arquivo of relatorio) {
    for (const mensagem of arquivo.messages) {
      if (mensagem.severity === 2) {
        erros += 1;
        locaisDeErro.push(
          `${paraExibicao(arquivo.filePath)}:${mensagem.line} ${mensagem.ruleId ?? "erro"}`
        );
      } else {
        avisos += 1;
      }
    }
  }

  if (ATUALIZAR_LINHA_BASE) {
    fs.writeFileSync(
      ARQUIVO_LINHA_BASE,
      JSON.stringify(
        {
          erros,
          avisos,
          atualizadoEm: new Date().toISOString().slice(0, 10),
        },
        null,
        2
      ) + "\n"
    );

    return {
      status: "OK",
      resumo: `linha de base gravada: ${erros} erro(s), ${avisos} aviso(s)`,
      ms: r.ms,
    };
  }

  const base = lerLinhaBase();

  if (!base) {
    return {
      status: "FALHOU",
      resumo: "linha de base do lint não encontrada (scripts/lint-baseline.json)",
      detalhe:
        "Rode uma vez: npm run check -- --so=lint --atualizar-linha-base",
      ms: r.ms,
    };
  }

  if (erros > base.erros) {
    return {
      status: "FALHOU",
      resumo: `${erros} erro(s) de lint; a linha de base é ${base.erros} (piorou)`,
      detalhe: locaisDeErro.slice(0, 20).join("\n"),
      ms: r.ms,
    };
  }

  const melhorou =
    erros < base.erros
      ? ` (melhorou: a base era ${base.erros}; rode npm run check -- --so=lint --atualizar-linha-base)`
      : "";

  return {
    status: "OK",
    resumo: `${erros} erro(s) e ${avisos} aviso(s) de lint, sem piorar a linha de base${melhorou}`,
    ms: r.ms,
  };
}

// ---------------------------------------------------------------------------
// Etapa 3: testes
// ---------------------------------------------------------------------------

function listarArquivosDeTeste(pasta, acumulado = []) {
  for (const item of fs.readdirSync(pasta, { withFileTypes: true })) {
    if (item.isDirectory()) {
      if (!PASTAS_IGNORADAS.has(item.name)) {
        listarArquivosDeTeste(path.join(pasta, item.name), acumulado);
      }
    } else if (item.name.endsWith(".test.ts")) {
      acumulado.push(path.join(pasta, item.name));
    }
  }

  return acumulado;
}

function executarUmTeste(tsx, arquivo) {
  const nome = paraExibicao(arquivo);
  const conteudo = fs.readFileSync(arquivo, "utf8");

  if (conteudo.trim() === "") {
    return {
      nome,
      status: "PULADO",
      motivo: "arquivo vazio: ainda não tem nenhum teste escrito",
    };
  }

  const usaBanco = /@\/lib\/prisma|dotenv\/config/.test(conteudo);

  if (usaBanco && !INCLUIR_INTEGRACAO) {
    return {
      nome,
      status: "PULADO",
      motivo: "usa o banco de dados (rode com --integracao)",
    };
  }

  const r = executar(tsx, [nome], 120000);
  const saidaCompleta = (r.stdout + (r.stderr ? "\n" + r.stderr : "")).trim();

  if (r.erroDeExecucao) {
    return {
      nome,
      status: "FALHOU",
      motivo: `não foi possível executar: ${r.erroDeExecucao.message}`,
      ms: r.ms,
    };
  }

  if (r.estourouTempo) {
    return {
      nome,
      status: "FALHOU",
      motivo: "tempo esgotado (mais de 120 s)",
      ms: r.ms,
    };
  }

  if (r.codigo !== 0) {
    return {
      nome,
      status: "FALHOU",
      motivo: `terminou com erro (código ${r.codigo})`,
      detalhe: ultimasLinhas(saidaCompleta, 20),
      ms: r.ms,
    };
  }

  if (r.stdout.trim() === "") {
    return {
      nome,
      status: "FALHOU",
      motivo:
        "terminou sem mostrar nada: não dá para saber se algum teste foi executado",
      ms: r.ms,
    };
  }

  const verificacoes = r.stdout
    .split(/\r?\n/)
    .filter((linha) => linha.includes("✅")).length;

  return {
    nome,
    status: "OK",
    verificacoes,
    detalhe: VERBOSE ? saidaCompleta : undefined,
    ms: r.ms,
  };
}

function etapaTestes() {
  const tsx = caminhoDoPrograma("tsx", "tsx");

  if (!tsx) {
    return {
      status: "FALHOU",
      resumo: "tsx não encontrado. Rode: npm install",
      testes: [],
      ms: 0,
    };
  }

  const inicio = Date.now();

  let arquivos = listarArquivosDeTeste(RAIZ).sort();

  if (FILTRO) {
    arquivos = arquivos.filter((a) => paraExibicao(a).includes(FILTRO));
  }

  if (arquivos.length === 0) {
    return {
      status: "FALHOU",
      resumo: "nenhum arquivo *.test.ts encontrado",
      testes: [],
      ms: Date.now() - inicio,
    };
  }

  const testes = arquivos.map((arquivo) => executarUmTeste(tsx, arquivo));

  const aprovados = testes.filter((t) => t.status === "OK").length;
  const falhos = testes.filter((t) => t.status === "FALHOU").length;
  const pulados = testes.filter((t) => t.status === "PULADO").length;

  return {
    status: falhos > 0 ? "FALHOU" : "OK",
    resumo: `${aprovados} passaram, ${falhos} falharam, ${pulados} pulados`,
    testes,
    ms: Date.now() - inicio,
  };
}

// ---------------------------------------------------------------------------
// Execução
// ---------------------------------------------------------------------------

function marca(status) {
  if (status === "OK") return "[OK]    ";
  if (status === "FALHOU") return "[FALHOU]";
  return "[PULADO]";
}

function main() {
  console.log("Beatus OS: verificação do projeto\n");

  const etapas = [];
  const quer = (nome) => !SO_ETAPA || SO_ETAPA === nome;

  if (SO_ETAPA && !["tipos", "lint", "testes"].includes(SO_ETAPA)) {
    console.log(`Opção --so inválida: "${SO_ETAPA}". Use tipos, lint ou testes.`);
    process.exitCode = 1;
    return;
  }

  if (quer("tipos")) {
    const e = etapaTipos();
    etapas.push({ nome: "Tipos (TypeScript)", ...e });
    console.log(`${marca(e.status)} Tipos (TypeScript): ${e.resumo} (${segundos(e.ms)})`);
    if (e.detalhe) console.log(indentar(e.detalhe));
  }

  if (quer("lint")) {
    const e = etapaLint();
    etapas.push({ nome: "Lint (ESLint)", ...e });
    console.log(`${marca(e.status)} Lint (ESLint): ${e.resumo} (${segundos(e.ms)})`);
    if (e.detalhe) console.log(indentar(e.detalhe));
  }

  let pulados = 0;

  if (quer("testes")) {
    const e = etapaTestes();
    etapas.push({ nome: "Testes", ...e });
    console.log(`${marca(e.status)} Testes: ${e.resumo} (${segundos(e.ms)})`);

    for (const teste of e.testes) {
      let linha = `    ${marca(teste.status)} ${teste.nome}`;

      if (teste.status === "OK") {
        linha +=
          teste.verificacoes > 0
            ? `: ${teste.verificacoes} verificações`
            : "";
        linha += ` (${segundos(teste.ms)})`;
      } else {
        linha += `: ${teste.motivo}`;
      }

      console.log(linha);

      if (teste.status === "FALHOU" && teste.detalhe) {
        console.log(indentar(teste.detalhe, 10));
      }

      if (teste.status === "OK" && teste.detalhe) {
        console.log(indentar(teste.detalhe, 10));
      }

      if (teste.status === "PULADO") {
        pulados += 1;
      }
    }

  }

  const falhou = etapas.some((e) => e.status === "FALHOU");

  console.log("");

  if (pulados > 0) {
    console.log(
      `Atenção: ${pulados} arquivo(s) de teste foram pulados e NÃO contam como aprovados.`
    );
  }

  if (falhou) {
    console.log("RESULTADO: VERMELHO (algo falhou; a sprint não pode fechar)");
    process.exitCode = 1;
  } else {
    console.log("RESULTADO: VERDE");
    process.exitCode = 0;
  }
}

main();
