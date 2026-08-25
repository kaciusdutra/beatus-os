import {
  AddressSearchResult,
} from "./addressTypes";

const enderecosSimulados: AddressSearchResult[] = [
  {
    id: "end-001",
    cep: "69000-001",
    logradouro: "Rua Afrânio de Castro",
    bairro: "Japiim",
    cidade: "Manaus",
    estado: "AM",
    distanciaSimuladaKm: 0.8,
    descricao:
      "Rua Afrânio de Castro, Japiim, Manaus - AM",
  },

  {
    id: "end-002",
    cep: "69050-000",
    logradouro: "Avenida Rodrigo Otávio",
    bairro: "Japiim",
    cidade: "Manaus",
    estado: "AM",
    distanciaSimuladaKm: 2.4,
    descricao:
      "Avenida Rodrigo Otávio, Japiim, Manaus - AM",
  },

  {
    id: "end-003",
    cep: "69075-000",
    logradouro: "Rua do Comércio",
    bairro: "Centro",
    cidade: "Manaus",
    estado: "AM",
    distanciaSimuladaKm: 4.8,
    descricao:
      "Rua do Comércio, Centro, Manaus - AM",
  },

  {
    id: "end-004",
    cep: "69099-999",
    logradouro: "Rua do Teste Externo",
    bairro: "Zona de Teste",
    cidade: "Manaus",
    estado: "AM",
    distanciaSimuladaKm: 5.4,
    descricao:
      "Rua do Teste Externo, Zona de Teste, Manaus - AM",
  },
];

function normalizarTexto(
  valor: string
): string {
  return valor
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .replace(
      /[^\p{L}\p{N}\s]/gu,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

function normalizarCep(
  cep: string
): string {
  return cep.replace(
    /\D/g,
    ""
  );
}

function removerNumeroDoEndereco(
  valor: string
): string {
  return valor
    .replace(
      /\b(?:n[º°.]?|numero|número)\s*\d+\b/gi,
      " "
    )
    .replace(
      /\b\d{1,6}\b/g,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

function obterTermosBusca(
  valor: string
): string[] {
  const buscaSemNumero =
    removerNumeroDoEndereco(
      normalizarTexto(valor)
    );

  return buscaSemNumero
    .split(" ")
    .filter(
      (termo) =>
        termo.length >= 2
    );
}

function enderecoContemBusca(
  endereco: AddressSearchResult,
  termos: string[]
): boolean {
  const campos = [
    endereco.logradouro,
    endereco.bairro,
    endereco.cidade,
    endereco.estado,
    endereco.cep ?? "",
  ];

  const textoEndereco =
    normalizarTexto(
      campos.join(" ")
    );

  return termos.every(
    (termo) =>
      textoEndereco.includes(
        termo
      )
  );
}

export function buscarPorCep(
  cep: string
): AddressSearchResult[] {
  const cepNormalizado =
    normalizarCep(cep);

  if (!cepNormalizado) {
    return [];
  }

  return enderecosSimulados.filter(
    (endereco) =>
      normalizarCep(
        endereco.cep ?? ""
      ) === cepNormalizado
  );
}

export function buscarPorEndereco(
  termo: string
): AddressSearchResult[] {
  if (!termo.trim()) {
    return [];
  }

  const termos =
    obterTermosBusca(termo);

  if (termos.length === 0) {
    return [];
  }

  return enderecosSimulados.filter(
    (endereco) =>
      enderecoContemBusca(
        endereco,
        termos
      )
  );
}

export function obterEnderecoPorId(
  id: string
): AddressSearchResult | undefined {
  return enderecosSimulados.find(
    (endereco) =>
      endereco.id === id
  );
}