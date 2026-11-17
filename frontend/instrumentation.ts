// Roda uma vez quando o servidor do Next sobe (antes de atender pedidos). Aqui liga o agendador do servidor
// (avisos do WhatsApp e consulta aos marketplaces), que só existe no Node: no runtime "edge" não faz nada.
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const { iniciarAgendadorDoServidor } = await import("./lib/agendadorDoServidor");

  if (iniciarAgendadorDoServidor()) {
    console.log("[beatus] agendador do servidor ligado (avisos do pedido a cada 15 s, marketplaces a cada 30 s)");
  }
}
