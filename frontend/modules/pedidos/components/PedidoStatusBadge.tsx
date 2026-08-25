import {
  StatusOperacional,
} from "../types/pedido";

interface Props {
  status: StatusOperacional;
}

export default function PedidoStatusBadge({
  status,
}: Props) {
  const configuracao = {
    NOVO: {
      label: "NOVO",
      classe:
        "bg-amber-50 text-amber-700 border-amber-200",
      icone: "🟡",
    },

    EM_PREPARO: {
      label: "EM PREPARO",
      classe:
        "bg-blue-50 text-blue-700 border-blue-200",
      icone: "🔵",
    },

    PRONTO: {
      label: "PRONTO",
      classe:
        "bg-green-50 text-green-700 border-green-200",
      icone: "🟢",
    },

    EM_ROTA: {
      label: "EM ROTA",
      classe:
        "bg-orange-50 text-orange-700 border-orange-200",
      icone: "🟠",
    },

    ENTREGUE: {
      label: "ENTREGUE",
      classe:
        "bg-slate-50 text-slate-700 border-slate-200",
      icone: "✅",
    },

    CANCELADO: {
      label: "CANCELADO",
      classe:
        "bg-red-50 text-red-700 border-red-200",
      icone: "🔴",
    },
  }[status];

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${configuracao.classe}`}
    >
      <span>{configuracao.icone}</span>
      {configuracao.label}
    </span>
  );
}