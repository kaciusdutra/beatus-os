export interface Address {
  cep?: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
}

export interface AddressSearchResult {
  id: string;

  cep?: string;

  logradouro: string;

  bairro: string;

  cidade: string;

  estado: string;

  latitude?: number;

  longitude?: number;

  /**
   * Valor temporário para nossa fase de simulação.
   * Futuramente será substituído pela distância
   * calculada a partir da geolocalização real.
   */
  distanciaSimuladaKm?: number;

  descricao: string;
}