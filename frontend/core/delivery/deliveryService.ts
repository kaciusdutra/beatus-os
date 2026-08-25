import {
  beatusUnit,
} from "@/core/config/unitConfig";

import {
  calcularTaxaEntrega,
} from "./deliveryRules";

import {
  DeliveryCalculation,
} from "./deliveryTypes";

export function calcularEntrega(
  distanciaKm: number | null
): DeliveryCalculation {
  if (
    distanciaKm === null ||
    !Number.isFinite(
      distanciaKm
    )
  ) {
    return {
      status:
        "DISTANCIA_NAO_INFORMADA",

      distanciaKm: null,

      taxa: 0,

      mensagem:
        "Não foi possível calcular a distância de entrega.",
    };
  }

  const faixa =
    calcularTaxaEntrega(
      distanciaKm,
      beatusUnit.entrega
    );

  if (!faixa) {
    return {
      status:
        "FORA_DA_AREA",

      distanciaKm,

      taxa: 0,

      mensagem:
        `Endereço fora da área de entrega de ${beatusUnit.entrega.raioMaximoKm} km.`,
    };
  }

  const distanciaFormatada =
    distanciaKm.toFixed(2);

  const taxaFormatada =
    faixa.taxa.toFixed(2);

  const regraAplicada =
    faixa.taxa === 0
      ? `Até ${faixa.distanciaMaxKm} km — entrega grátis`
      : `${faixa.distanciaMinKm} a ${faixa.distanciaMaxKm} km — R$ ${taxaFormatada}`;

  return {
    status: "CALCULADO",

    distanciaKm,

    taxa: faixa.taxa,

    regraAplicada,

    mensagem:
      `Distância: ${distanciaFormatada} km. ${regraAplicada}.`,
  };
}