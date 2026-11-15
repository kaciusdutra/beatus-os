import { etapasDoPedido, type SituacaoDoPedido } from "../services/etapasDoPedido";

// Linha do tempo simples do pedido: recebido, em preparo, pronto, a caminho, entregue.
export default function EtapasDoPedido({ situacao }: { situacao: SituacaoDoPedido }) {
  const etapas = etapasDoPedido(situacao);

  if (etapas.length === 0) {
    return null;
  }

  return (
    <ol className="space-y-2 text-left" aria-label="Etapas do pedido">
      {etapas.map((etapa) => (
        <li key={etapa.situacao} aria-current={etapa.estado === "atual" ? "step" : undefined} className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
              etapa.estado === "feita" ? "bg-ouro text-black" : etapa.estado === "atual" ? "border-2 border-ouro text-ouro" : "border border-white/20 text-transparent"
            }`}
          >
            {etapa.estado === "feita" ? "✓" : "•"}
          </span>

          <span className={etapa.estado === "futura" ? "text-slate-500" : etapa.estado === "atual" ? "font-bold text-ouro" : "text-slate-200"}>{etapa.rotulo}</span>
        </li>
      ))}
    </ol>
  );
}
