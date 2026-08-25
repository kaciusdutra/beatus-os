export type DeliveryCalculationStatus =
  | "CALCULADO"
  | "FORA_DA_AREA"
  | "DISTANCIA_NAO_INFORMADA";

export interface DeliveryCalculation {
  status: DeliveryCalculationStatus;

  distanciaKm: number | null;

  taxa: number;

  regraAplicada?: string;

  mensagem: string;
}