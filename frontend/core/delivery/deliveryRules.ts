import {
  DeliverySettings,
} from "@/core/config/unitConfig";

export function calcularTaxaEntrega(
  distanciaKm: number,
  configuracao: DeliverySettings
) {
  if (
    distanciaKm < 0 ||
    !Number.isFinite(distanciaKm)
  ) {
    return null;
  }

  if (
    distanciaKm >
    configuracao.raioMaximoKm
  ) {
    return null;
  }

  const faixa =
    configuracao.faixas.find(
      (regra) =>
        distanciaKm >=
          regra.distanciaMinKm &&
        distanciaKm <=
          regra.distanciaMaxKm
    );

  return faixa ?? null;
}