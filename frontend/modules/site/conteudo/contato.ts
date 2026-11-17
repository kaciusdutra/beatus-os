// Contato da casa para o cliente do site. O número é o que já está nos cardápios impressos.
export const WHATSAPP_DA_CASA = "5592981364546";

export function linkDoWhatsappDaCasa(mensagem?: string): string {
  return `https://wa.me/${WHATSAPP_DA_CASA}${mensagem ? `?text=${encodeURIComponent(mensagem)}` : ""}`;
}
