"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import { useRouter } from "next/navigation";

import {
  calcularCustoFichaTecnica,
} from "../services/calcularCustoFichaTecnica";

import {
  converterSeCompativel,
} from "../services/conversaoUnidade";

import { FichaTecnica } from "../types/fichaTecnica";

import {
  carregarDadosFichas,
  CATEGORIA_EMBALAGENS,
  ehInsumoDeEmbalagem,
  formatarCustoFino,
  formatarMoeda,
  montarContextoCusto,
  unidadeSugeridaDoInsumo,
  UNIDADES_DE_USO,
  type DadosFichas,
} from "./dadosFichas";

type Bloco = "RECEITA" | "EMBALAGEM";

interface Linha {
  id: string;
  bloco: Bloco;
  tipo: "INSUMO" | "PREPARACAO";
  // Categoria do insumo (filtra a lista de insumos); vazio = todas.
  categoriaId: string;
  // O que foi digitado no campo do item.
  texto: string;
  // Id do insumo ou da ficha, quando o texto bate com um da lista.
  referenciaId: string;
  quantidade: string;
  unidade: string;
  // Perda de cocção (%) deste uso.
  perda: string;
}

interface Props {
  fichaId?: string;
  tipoInicial?: "PREPARACAO" | "PRODUTO";
  produtoIdInicial?: string;
}

const CLASSE_CAMPO =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200";

const COLUNAS =
  "md:grid-cols-[6.5rem_9.5rem_minmax(0,1fr)_6rem_6rem_5.5rem_7rem_1.5rem]";

function novaLinha(bloco: Bloco): Linha {
  return {
    id: crypto.randomUUID(),
    bloco,
    tipo: "INSUMO",
    categoriaId: "",
    texto: "",
    referenciaId: "",
    quantidade: "",
    unidade: "",
    perda: "0",
  };
}

export default function FichaEditorPage({
  fichaId,
  tipoInicial = "PREPARACAO",
  produtoIdInicial,
}: Props) {
  const router = useRouter();

  const [dados, setDados] =
    useState<DadosFichas | null>(null);

  const [existente, setExistente] =
    useState<FichaTecnica | null>(null);

  const [tipo, setTipo] = useState<
    "PREPARACAO" | "PRODUTO"
  >(tipoInicial);

  const [produtoId, setProdutoId] = useState(
    produtoIdInicial ?? ""
  );

  const [nome, setNome] = useState("");

  const [rendimento, setRendimento] = useState("");

  const [unidadeRendimento, setUnidadeRendimento] =
    useState("g");

  const [embalagemFixa, setEmbalagemFixa] =
    useState("");

  const [ativo, setAtivo] = useState(true);

  const [linhas, setLinhas] = useState<Linha[]>([
    novaLinha("RECEITA"),
  ]);

  const [porcao, setPorcao] = useState("");

  const [erro, setErro] = useState("");

  const [aviso, setAviso] = useState("");

  const [salvando, setSalvando] = useState(false);

  const [naoEncontrada, setNaoEncontrada] =
    useState(false);

  function preencherDe(
    ficha: FichaTecnica,
    carregados: DadosFichas
  ) {
    setExistente(ficha);
    setTipo(ficha.tipo);
    setProdutoId(ficha.produtoId ?? "");
    setNome(ficha.nome);
    setRendimento(
      ficha.rendimento !== undefined
        ? String(ficha.rendimento)
        : ""
    );
    setUnidadeRendimento(
      ficha.unidadeRendimento ?? "g"
    );
    setEmbalagemFixa(
      ficha.embalagem > 0 ? String(ficha.embalagem) : ""
    );
    setAtivo(ficha.ativo);

    const convertidas: Linha[] = ficha.itens.map(
      (item) => {
        const insumo =
          item.tipo === "INSUMO"
            ? carregados.insumos.find(
                (candidato) =>
                  candidato.id === item.insumoId
              )
            : undefined;

        const usada =
          item.tipo === "PREPARACAO"
            ? carregados.fichas.find(
                (candidata) =>
                  candidata.id === item.preparacaoId
              )
            : undefined;

        return {
          id: item.id,
          bloco:
            insumo &&
            ehInsumoDeEmbalagem(
              insumo,
              carregados.categorias
            )
              ? "EMBALAGEM"
              : "RECEITA",
          tipo: item.tipo,
          categoriaId: insumo?.categoriaId ?? "",
          texto: insumo?.nome ?? usada?.nome ?? "",
          referenciaId:
            item.insumoId ?? item.preparacaoId ?? "",
          quantidade: String(item.quantidade),
          unidade: item.unidade,
          perda: String(item.percentualPerda),
        };
      }
    );

    setLinhas(
      convertidas.length > 0
        ? convertidas
        : [novaLinha("RECEITA")]
    );
  }

  // Carrega os dados e, se for edição, preenche o formulário.
  useEffect(() => {
    void carregarDadosFichas()
      .then((carregados) => {
        setDados(carregados);

        if (fichaId) {
          const ficha = carregados.fichas.find(
            (item) => item.id === fichaId
          );

          if (!ficha) {
            setNaoEncontrada(true);
            return;
          }

          preencherDe(ficha, carregados);
          return;
        }

        if (tipoInicial === "PRODUTO") {
          const produto = carregados.produtos.find(
            (item) => item.id === produtoIdInicial
          );

          setNome(produto?.nome ?? "");
        }
      })
      .catch((error) =>
        setErro(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar os dados."
        )
      );
    // Só na abertura da tela.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listas do campo de item (datalist).
  const opcoes = useMemo(() => {
    const insumosAtivos = (dados?.insumos ?? [])
      .filter((insumo) => insumo.ativo)
      .sort((a, b) =>
        a.nome.localeCompare(b.nome, "pt-BR")
      );

    const embalagem = insumosAtivos.filter((insumo) =>
      ehInsumoDeEmbalagem(
        insumo,
        dados?.categorias ?? []
      )
    );

    const receita = insumosAtivos.filter(
      (insumo) => !embalagem.includes(insumo)
    );

    // Preparação usa preparações; produto (e combo) usa preparações e produtos.
    const fichas = (dados?.fichas ?? [])
      .filter(
        (ficha) =>
          ficha.ativo &&
          ficha.id !== existente?.id &&
          (tipo === "PRODUTO" ||
            ficha.tipo === "PREPARACAO")
      )
      .sort((a, b) =>
        a.nome.localeCompare(b.nome, "pt-BR")
      );

    // Categorias do bloco de receita (embalagem tem bloco próprio).
    const categoriasReceita = (dados?.categorias ?? [])
      .filter(
        (categoria) =>
          categoria.nome !== CATEGORIA_EMBALAGENS
      )
      .sort((a, b) =>
        a.nome.localeCompare(b.nome, "pt-BR")
      );

    return { receita, embalagem, fichas, categoriasReceita };
  }, [dados, existente, tipo]);

  // Insumos que a linha pode escolher, já filtrados pela categoria.
  function insumosDaLinha(linha: Linha) {
    if (linha.bloco === "EMBALAGEM") {
      return opcoes.embalagem;
    }

    return linha.categoriaId
      ? opcoes.receita.filter(
          (insumo) =>
            insumo.categoriaId === linha.categoriaId
        )
      : opcoes.receita;
  }

  function resolver(
    linha: Linha,
    texto: string
  ): string {
    const procurado = texto.trim().toLowerCase();

    if (!procurado) {
      return "";
    }

    const lista =
      linha.tipo === "PREPARACAO"
        ? opcoes.fichas
        : insumosDaLinha(linha);

    return (
      lista.find(
        (item) =>
          item.nome.trim().toLowerCase() === procurado
      )?.id ?? ""
    );
  }

  function alterarLinha(
    id: string,
    parcial: Partial<Linha>
  ) {
    setLinhas((anteriores) =>
      anteriores.map((linha) =>
        linha.id === id ? { ...linha, ...parcial } : linha
      )
    );
  }

  function alterarTextoDoItem(
    linha: Linha,
    texto: string
  ) {
    const referenciaId = resolver(linha, texto);

    const parcial: Partial<Linha> = {
      texto,
      referenciaId,
    };

    // A caixa de categoria acompanha o insumo escolhido.
    if (
      referenciaId &&
      linha.tipo === "INSUMO" &&
      linha.bloco === "RECEITA"
    ) {
      const escolhido = dados?.insumos.find(
        (item) => item.id === referenciaId
      );

      if (escolhido) {
        parcial.categoriaId = escolhido.categoriaId;
      }
    }

    // Sugere a unidade quando o campo ainda está vazio.
    if (referenciaId && !linha.unidade.trim()) {
      if (linha.tipo === "INSUMO") {
        const insumo = dados?.insumos.find(
          (item) => item.id === referenciaId
        );

        if (insumo) {
          parcial.unidade = unidadeSugeridaDoInsumo(
            insumo,
            dados?.unidades ?? []
          );
        }
      } else {
        const usada = dados?.fichas.find(
          (item) => item.id === referenciaId
        );

        parcial.unidade =
          usada?.tipo === "PREPARACAO"
            ? (usada.unidadeRendimento ?? "")
            : "un";
      }
    }

    alterarLinha(linha.id, parcial);
  }

  function alterarTipoDoItem(
    linha: Linha,
    novoTipo: "INSUMO" | "PREPARACAO"
  ) {
    alterarLinha(linha.id, {
      tipo: novoTipo,
      categoriaId: "",
      texto: "",
      referenciaId: "",
      unidade: "",
    });
  }

  // Trocar a categoria filtra a lista; o item escolhido só fica se for dela.
  function alterarCategoriaDoItem(
    linha: Linha,
    categoriaId: string
  ) {
    const escolhido = dados?.insumos.find(
      (item) => item.id === linha.referenciaId
    );

    const continuaValido =
      !categoriaId ||
      !escolhido ||
      escolhido.categoriaId === categoriaId;

    alterarLinha(
      linha.id,
      continuaValido
        ? { categoriaId }
        : {
            categoriaId,
            texto: "",
            referenciaId: "",
            unidade: "",
          }
    );
  }

  function removerLinha(id: string) {
    setLinhas((anteriores) =>
      anteriores.filter((linha) => linha.id !== id)
    );
  }

  // Ficha em montagem, só com os itens já reconhecidos.
  const rascunho: FichaTecnica = useMemo(
    () => ({
      id: existente?.id ?? "rascunho",
      tipo,
      produtoId: produtoId || undefined,
      nome,
      rendimento:
        tipo === "PREPARACAO" && Number(rendimento) > 0
          ? Number(rendimento)
          : undefined,
      unidadeRendimento:
        tipo === "PREPARACAO"
          ? unidadeRendimento
          : undefined,
      embalagem:
        tipo === "PRODUTO"
          ? Number(embalagemFixa) || 0
          : 0,
      ativo,
      itens: linhas
        .filter(
          (linha) =>
            linha.referenciaId &&
            Number(linha.quantidade) > 0 &&
            linha.unidade.trim()
        )
        .map((linha) => ({
          id: linha.id,
          tipo: linha.tipo,
          insumoId:
            linha.tipo === "INSUMO"
              ? linha.referenciaId
              : undefined,
          preparacaoId:
            linha.tipo === "PREPARACAO"
              ? linha.referenciaId
              : undefined,
          quantidade: Number(linha.quantidade),
          unidade: linha.unidade.trim(),
          percentualPerda: Number(linha.perda) || 0,
          custoCalculado: 0,
        })),
      criadoEm: existente?.criadoEm ?? "",
      atualizadoEm: existente?.atualizadoEm ?? "",
    }),
    [
      ativo,
      embalagemFixa,
      existente,
      linhas,
      nome,
      produtoId,
      rendimento,
      tipo,
      unidadeRendimento,
    ]
  );

  // Custo ao vivo, com os preços atuais dos insumos.
  const custo = useMemo(() => {
    if (!dados) {
      return null;
    }

    const outras = dados.fichas.filter(
      (ficha) => ficha.id !== rascunho.id
    );

    return calcularCustoFichaTecnica(
      rascunho,
      montarContextoCusto(dados, [...outras, rascunho])
    );
  }, [dados, rascunho]);

  const custoPorLinha = useMemo(
    () =>
      new Map(
        (custo?.itens ?? []).map((item) => [
          item.itemId,
          item,
        ])
      ),
    [custo]
  );

  const produto = dados?.produtos.find(
    (item) => item.id === produtoId
  );

  // Soma das quantidades dos ingredientes, na unidade do rendimento.
  const somaDosItens = useMemo(() => {
    const destino = unidadeRendimento.trim() || "g";

    let soma = 0;
    let algum = false;

    for (const linha of linhas) {
      const quantidade = Number(linha.quantidade);

      if (!(quantidade > 0)) {
        continue;
      }

      const convertida = converterSeCompativel(
        quantidade,
        linha.unidade,
        destino
      );

      if (convertida === undefined) {
        return null;
      }

      soma += convertida;
      algum = true;
    }

    return algum
      ? Math.round(soma * 10000) / 10000
      : null;
  }, [linhas, unidadeRendimento]);

  // Perda do preparo: quanto se perdeu entre a soma dos ingredientes e o que
  // a receita rendeu pronta (exemplo: bacon cru 1.000 g que rende 600 g frito).
  const perdaDoPreparo = useMemo(() => {
    const rendeu = Number(rendimento);

    if (
      tipo !== "PREPARACAO" ||
      somaDosItens === null ||
      !(somaDosItens > 0) ||
      !(rendeu > 0)
    ) {
      return null;
    }

    return {
      percentual:
        ((somaDosItens - rendeu) / somaDosItens) * 100,
      soma: somaDosItens,
      rendeu,
    };
  }, [rendimento, somaDosItens, tipo]);

  function usarSomaDosItens() {
    const destino = unidadeRendimento.trim() || "g";

    let soma = 0;

    for (const linha of linhas) {
      const quantidade = Number(linha.quantidade);

      if (!(quantidade > 0)) {
        continue;
      }

      const convertida = converterSeCompativel(
        quantidade,
        linha.unidade,
        destino
      );

      if (convertida === undefined) {
        setErro(
          `Não deu para somar: "${linha.texto || "item"}" está em ${linha.unidade || "?"}, que não converte para ${destino}. Digite o rendimento à mão.`
        );

        return;
      }

      soma += convertida;
    }

    setErro("");

    setRendimento(
      String(Math.round(soma * 10000) / 10000)
    );
  }

  async function salvar() {
    setErro("");
    setAviso("");

    if (!nome.trim()) {
      setErro("Informe o nome da ficha.");
      return;
    }

    const preenchidas = linhas.filter(
      (linha) =>
        linha.texto.trim() ||
        linha.quantidade.trim()
    );

    for (const linha of preenchidas) {
      if (!linha.referenciaId) {
        setErro(
          `"${linha.texto || "Item sem nome"}" não é um item da lista. Digite parte do nome e escolha na lista.`
        );
        return;
      }

      if (!(Number(linha.quantidade) > 0)) {
        setErro(
          `Informe a quantidade de "${linha.texto}".`
        );
        return;
      }

      if (!linha.unidade.trim()) {
        setErro(
          `Informe a unidade de "${linha.texto}".`
        );
        return;
      }
    }

    if (preenchidas.length === 0) {
      setErro("Adicione pelo menos um item à ficha.");
      return;
    }

    setSalvando(true);

    try {
      const corpo = {
        tipo,
        produtoId: produtoId || undefined,
        nome: nome.trim(),
        rendimento:
          tipo === "PREPARACAO"
            ? Number(rendimento)
            : undefined,
        unidadeRendimento:
          tipo === "PREPARACAO"
            ? unidadeRendimento.trim()
            : undefined,
        embalagem:
          tipo === "PRODUTO"
            ? Number(embalagemFixa) || 0
            : 0,
        ativo,
        itens: preenchidas.map((linha) => ({
          id: linha.id,
          tipo: linha.tipo,
          insumoId:
            linha.tipo === "INSUMO"
              ? linha.referenciaId
              : undefined,
          preparacaoId:
            linha.tipo === "PREPARACAO"
              ? linha.referenciaId
              : undefined,
          quantidade: Number(linha.quantidade),
          unidade: linha.unidade.trim(),
          percentualPerda: Number(linha.perda) || 0,
        })),
      };

      const resposta = await fetch(
        existente
          ? `/api/fichas/${existente.id}`
          : "/api/fichas",
        {
          method: existente ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(corpo),
        }
      );

      const resultado = await resposta.json();

      if (!resposta.ok || !resultado.sucesso) {
        throw new Error(
          resultado.mensagem ??
            "Não foi possível salvar a ficha."
        );
      }

      if (!existente) {
        router.replace(`/fichas/${resultado.ficha.id}`);
        return;
      }

      const atualizados = await carregarDadosFichas();

      setDados(atualizados);
      setExistente(resultado.ficha);
      setAviso("Ficha salva.");
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar a ficha."
      );
    } finally {
      setSalvando(false);
    }
  }

  function renderizarLinhas(bloco: Bloco) {
    const doBloco = linhas.filter(
      (linha) => linha.bloco === bloco
    );

    return (
      <div className="space-y-3">
        <div
          className={`hidden gap-3 px-1 text-xs font-semibold uppercase tracking-wider text-slate-500 md:grid ${COLUNAS}`}
        >
          <span>Tipo</span>
          <span>Categoria</span>
          <span>Item</span>
          <span>Quantidade</span>
          <span>Unidade</span>
          <span title="Perda de cocção ou preparo deste uso">
            Perda %
          </span>
          <span className="text-right">Custo</span>
          <span />
        </div>

        {doBloco.map((linha) => {
          const resultado = custoPorLinha.get(linha.id);

          const opcoesDaLinha =
            linha.tipo === "PREPARACAO"
              ? opcoes.fichas
              : insumosDaLinha(linha);

          return (
            <div
              key={linha.id}
              className="rounded-xl border border-slate-200 bg-slate-50 p-3"
            >
              <datalist id={`lista-item-${linha.id}`}>
                {opcoesDaLinha.map((opcao) => (
                  <option key={opcao.id} value={opcao.nome} />
                ))}
              </datalist>

              <div
                className={`grid items-start gap-3 ${COLUNAS}`}
              >
                {bloco === "EMBALAGEM" ? (
                  <span className="pt-2.5 text-sm text-slate-600">
                    Insumo
                  </span>
                ) : (
                  <select
                    value={linha.tipo}
                    onChange={(evento) =>
                      alterarTipoDoItem(
                        linha,
                        evento.target.value as
                          | "INSUMO"
                          | "PREPARACAO"
                      )
                    }
                    className={CLASSE_CAMPO}
                  >
                    <option value="INSUMO">Insumo</option>
                    <option value="PREPARACAO">
                      Ficha
                    </option>
                  </select>
                )}

                {linha.bloco === "EMBALAGEM" ? (
                  <span className="pt-2.5 text-sm text-slate-600">
                    Embalagens
                  </span>
                ) : linha.tipo === "INSUMO" ? (
                  <select
                    value={linha.categoriaId}
                    onChange={(evento) =>
                      alterarCategoriaDoItem(
                        linha,
                        evento.target.value
                      )
                    }
                    title="Filtra os insumos por categoria"
                    className={CLASSE_CAMPO}
                  >
                    <option value="">Todas</option>

                    {opcoes.categoriasReceita.map(
                      (categoria) => (
                        <option
                          key={categoria.id}
                          value={categoria.id}
                        >
                          {categoria.nome}
                        </option>
                      )
                    )}
                  </select>
                ) : (
                  <span className="pt-2.5 text-sm text-slate-400">
                    —
                  </span>
                )}

                <input
                  list={`lista-item-${linha.id}`}
                  value={linha.texto}
                  onChange={(evento) =>
                    alterarTextoDoItem(
                      linha,
                      evento.target.value
                    )
                  }
                  placeholder={
                    linha.tipo === "PREPARACAO"
                      ? "Digite e escolha a ficha..."
                      : "Digite e escolha o insumo..."
                  }
                  className={`${CLASSE_CAMPO} ${
                    linha.texto && !linha.referenciaId
                      ? "border-red-300"
                      : ""
                  }`}
                />

                <input
                  type="number"
                  min="0"
                  step="any"
                  value={linha.quantidade}
                  onChange={(evento) =>
                    alterarLinha(linha.id, {
                      quantidade: evento.target.value,
                    })
                  }
                  placeholder="0"
                  className={CLASSE_CAMPO}
                />

                <input
                  list="lista-unidades"
                  value={linha.unidade}
                  onChange={(evento) =>
                    alterarLinha(linha.id, {
                      unidade: evento.target.value,
                    })
                  }
                  placeholder="g, un..."
                  className={CLASSE_CAMPO}
                />

                <input
                  type="number"
                  min="0"
                  max="99.99"
                  step="any"
                  value={linha.perda}
                  onChange={(evento) =>
                    alterarLinha(linha.id, {
                      perda: evento.target.value,
                    })
                  }
                  className={CLASSE_CAMPO}
                />

                <div className="pt-2.5 text-right text-sm font-semibold text-slate-900">
                  {resultado?.custo !== null &&
                  resultado?.custo !== undefined
                    ? formatarMoeda(resultado.custo)
                    : "—"}
                </div>

                <button
                  type="button"
                  onClick={() => removerLinha(linha.id)}
                  title="Remover o item"
                  className="cursor-pointer pt-2 text-lg text-slate-400 hover:text-red-600"
                >
                  ×
                </button>
              </div>

              {resultado?.custoPorUnidade !== undefined && (
                <p className="mt-2 text-xs text-slate-500">
                  {formatarCustoFino(
                    resultado.custoPorUnidade
                  )}{" "}
                  por {resultado.unidadeReferencia} desta
                  ficha
                </p>
              )}

              {resultado?.erro && (
                <p className="mt-2 text-xs font-semibold text-red-600">
                  {resultado.erro}
                </p>
              )}
            </div>
          );
        })}

        <button
          type="button"
          onClick={() =>
            setLinhas((anteriores) => [
              ...anteriores,
              novaLinha(bloco),
            ])
          }
          className="w-full cursor-pointer rounded-xl border-2 border-dashed border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:border-slate-500 hover:bg-slate-50"
        >
          {bloco === "EMBALAGEM"
            ? "+ Adicionar embalagem"
            : "+ Adicionar item"}
        </button>
      </div>
    );
  }

  if (naoEncontrada) {
    return (
      <div className="space-y-4">
        <Link
          href="/fichas"
          className="text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          ← Fichas técnicas
        </Link>

        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Ficha técnica não encontrada.
        </p>
      </div>
    );
  }

  const ehProduto = tipo === "PRODUTO";

  const porcaoNumero = Number(porcao);

  return (
    <div className="space-y-6">
      <datalist id="lista-unidades">
        {UNIDADES_DE_USO.map((unidade) => (
          <option key={unidade} value={unidade} />
        ))}
      </datalist>

      <div>
        <Link
          href="/fichas"
          className="text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          ← Fichas técnicas
        </Link>

        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
          {existente
            ? existente.nome
            : ehProduto
              ? "Nova ficha de produto"
              : "Nova preparação"}
        </h1>

        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          {ehProduto
            ? "Monte a receita com insumos e outras fichas (preparações, ou outro produto para fazer um combo). A embalagem do produto vai no bloco próprio."
            : "Digite os insumos e as quantidades da receita e o rendimento (depois de pesar, corrija). O custo por unidade serve para usar esta preparação em outras fichas."}
        </p>
      </div>

      {erro && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </div>
      )}

      {aviso && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {aviso}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-900">
            Dados da ficha
          </h2>
        </div>

        <div className="grid gap-5 p-6 md:grid-cols-2">
          <div className="md:col-span-2">
            <label
              htmlFor="nome"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Nome *
            </label>

            <input
              id="nome"
              value={nome}
              onChange={(evento) =>
                setNome(evento.target.value)
              }
              disabled={ehProduto && Boolean(produtoId)}
              placeholder={
                ehProduto
                  ? "Nome do produto"
                  : "Ex.: Blend 160 g"
              }
              className={`${CLASSE_CAMPO} disabled:bg-slate-100`}
            />

            {ehProduto && produto && (
              <p className="mt-2 text-xs text-slate-500">
                Produto: {produto.nome} ({produto.categoria}
                ). O nome da ficha é o do produto.
              </p>
            )}
          </div>

          {!ehProduto && (
            <div className="md:col-span-2">
              <label
                htmlFor="rendimento"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Rendimento da receita *
              </label>

              <div className="flex flex-wrap gap-3">
                <input
                  id="rendimento"
                  type="number"
                  min="0"
                  step="any"
                  value={rendimento}
                  onChange={(evento) =>
                    setRendimento(evento.target.value)
                  }
                  placeholder="Ex.: 160"
                  className={`${CLASSE_CAMPO} max-w-40`}
                />

                <input
                  list="lista-unidades"
                  value={unidadeRendimento}
                  onChange={(evento) =>
                    setUnidadeRendimento(evento.target.value)
                  }
                  placeholder="g, ml, un"
                  className={`${CLASSE_CAMPO} max-w-32`}
                />

                <button
                  type="button"
                  onClick={usarSomaDosItens}
                  className="cursor-pointer whitespace-nowrap rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {somaDosItens !== null
                    ? `Preencher com a soma dos ingredientes (${somaDosItens.toLocaleString("pt-BR")} ${unidadeRendimento || "g"})`
                    : "Preencher com a soma dos ingredientes"}
                </button>
              </div>

              <p className="mt-2 text-xs text-slate-500">
                É quanto a receita rende <strong>pronta</strong>.
                Se você ainda não pesou, o botão soma os
                ingredientes digitados (112 g + 48 g = 160 g) e
                preenche o campo para você. Depois de pesar a
                primeira produção, corrija o número aqui: o
                custo por grama passa a usar o rendimento real.
              </p>

              {perdaDoPreparo && (
                <p className="mt-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
                  {perdaDoPreparo.percentual > 0.005 ? (
                    <>
                      <strong>
                        Perda no preparo:{" "}
                        {perdaDoPreparo.percentual.toLocaleString(
                          "pt-BR",
                          { maximumFractionDigits: 1 }
                        )}
                        %
                      </strong>{" "}
                      (os ingredientes somam{" "}
                      {perdaDoPreparo.soma.toLocaleString("pt-BR")}{" "}
                      {unidadeRendimento || "g"} e a receita rende{" "}
                      {perdaDoPreparo.rendeu.toLocaleString("pt-BR")}{" "}
                      {unidadeRendimento || "g"}). Essa perda já está
                      no custo por {unidadeRendimento || "g"}: não
                      repita nos itens.
                    </>
                  ) : (
                    <>
                      O rendimento é igual ou maior que a soma dos
                      ingredientes: não há perda no preparo.
                    </>
                  )}
                </p>
              )}
            </div>
          )}

          {existente && (
            <div className="flex items-start gap-3 md:col-span-2">
              <input
                id="ativo"
                type="checkbox"
                checked={ativo}
                onChange={(evento) =>
                  setAtivo(evento.target.checked)
                }
                className="mt-0.5 h-5 w-5 cursor-pointer"
              />

              <label
                htmlFor="ativo"
                className="cursor-pointer text-sm text-slate-700"
              >
                <span className="font-semibold">
                  Ficha ativa
                </span>
                <br />
                <span className="text-slate-500">
                  Ficha não se exclui: inativa, ela deixa de
                  aparecer para novas fichas.
                </span>
              </label>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-900">
            {ehProduto ? "Receita" : "Ingredientes"}
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Item é um insumo ou outra ficha. Quantidade e
            unidade você digita. Perda %: a perda de cocção
            ou preparo deste uso (a perda de limpeza já está
            no insumo).
            {!ehProduto &&
              " Numa preparação em que você informa o rendimento pesado, deixe a perda em 0: o rendimento já inclui a perda, e colocar nos dois contaria duas vezes."}
          </p>
        </div>

        <div className="p-6">{renderizarLinhas("RECEITA")}</div>
      </section>

      {ehProduto && (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900">
              Embalagem do produto
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Insumos da categoria Embalagens (hamburgueira,
              papel de manteiga). A embalagem do pedido
              (sacola) fica para a precificação. Se preferir,
              deixe em branco.
            </p>
          </div>

          <div className="space-y-5 p-6">
            {renderizarLinhas("EMBALAGEM")}

            <div className="max-w-xs">
              <label
                htmlFor="embalagem-fixa"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Outros custos de embalagem (R$)
              </label>

              <input
                id="embalagem-fixa"
                type="number"
                min="0"
                step="any"
                value={embalagemFixa}
                onChange={(evento) =>
                  setEmbalagemFixa(evento.target.value)
                }
                placeholder="Opcional"
                className={CLASSE_CAMPO}
              />
            </div>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-900">
            Custo
          </h2>
        </div>

        <div className="space-y-3 p-6 text-sm">
          {custo && !custo.completo && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
              <p className="font-semibold">
                O custo está incompleto:
              </p>

              <ul className="mt-1 list-disc pl-5">
                {custo.erros.map((mensagem) => (
                  <li key={mensagem}>{mensagem}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-between">
            <span className="text-slate-600">
              {ehProduto
                ? "Custo da receita"
                : "Custo dos ingredientes"}
            </span>

            <span className="font-semibold text-slate-900">
              {formatarMoeda(custo?.custoReceita ?? 0)}
            </span>
          </div>

          {ehProduto && (
            <div className="flex justify-between">
              <span className="text-slate-600">
                Embalagem do produto
              </span>

              <span className="font-semibold text-slate-900">
                {formatarMoeda(
                  (custo?.custoEmbalagemItens ?? 0) +
                    (custo?.custoEmbalagemFixa ?? 0)
                )}
              </span>
            </div>
          )}

          <div className="flex justify-between border-t border-slate-200 pt-3 text-base">
            <span className="font-bold text-slate-900">
              {ehProduto
                ? "Custo do produto"
                : "Custo total da receita"}
            </span>

            <span className="font-bold text-slate-900">
              {formatarMoeda(custo?.custoTotal ?? 0)}
            </span>
          </div>

          {!ehProduto &&
            custo?.custoPorUnidade !== undefined && (
              <>
                <div className="flex justify-between">
                  <span className="text-slate-600">
                    Custo por {unidadeRendimento || "unidade"}
                  </span>

                  <span className="font-semibold text-slate-900">
                    {formatarCustoFino(custo.custoPorUnidade)}
                  </span>
                </div>

                <div className="space-y-2 rounded-xl bg-slate-50 px-4 py-3">
                  <p className="text-xs text-slate-500">
                    Calculadora (não é gravada): quanto custa
                    uma quantidade desta preparação? Por exemplo,
                    os 30 g que vão em cada burger. Para o custo
                    entrar no produto, adicione esta ficha como
                    item na ficha dele.
                  </p>

                  <div className="flex flex-wrap items-center gap-3">
                  <span className="text-slate-600">
                    Quanto custam
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={porcao}
                    onChange={(evento) =>
                      setPorcao(evento.target.value)
                    }
                    placeholder="30"
                    className={`${CLASSE_CAMPO} max-w-24`}
                  />

                  <span className="text-slate-600">
                    {unidadeRendimento}
                  </span>

                  <span className="font-semibold text-slate-900">
                    {porcaoNumero > 0
                      ? `= ${formatarCustoFino(
                          porcaoNumero *
                            custo.custoPorUnidade
                        )}`
                      : ""}
                  </span>
                  </div>
                </div>
              </>
            )}
        </div>
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link
          href="/fichas"
          className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Voltar
        </Link>

        <button
          type="button"
          onClick={() => void salvar()}
          disabled={salvando || !dados}
          className="cursor-pointer rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {salvando ? "Salvando..." : "Salvar ficha"}
        </button>
      </div>
    </div>
  );
}
