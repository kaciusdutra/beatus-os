export interface UnitAddress {
  nome: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep?: string;
}

export interface DeliverySettings {
  raioMaximoKm: number;

  faixas: {
    distanciaMinKm: number;
    distanciaMaxKm: number;
    taxa: number;
  }[];
}

export interface UnitConfig {
  id: string;
  nome: string;
  endereco: UnitAddress;
  entrega: DeliverySettings;
}

export const beatusUnit: UnitConfig = {
  id: "beatus-manaus-001",

  nome: "Beatus",

  endereco: {
    nome: "Beatus",
    logradouro: "Rua Afrânio de Castro",
    numero: "699",
    bairro: "Japiim",
    cidade: "Manaus",
    estado: "AM",
  },

  entrega: {
    raioMaximoKm: 5,

    faixas: [
      {
        distanciaMinKm: 0,
        distanciaMaxKm: 1,
        taxa: 0,
      },

      {
        distanciaMinKm: 1,
        distanciaMaxKm: 5,
        taxa: 10,
      },
    ],
  },
};