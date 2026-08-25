interface Props {
  percentual: number;
  concluidos: number;
  pendentes: number;
  liberado: boolean;
}

export default function OperacaoStatusCard({
  percentual,
  concluidos,
  pendentes,
  liberado,
}: Props) {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-6 mb-6">

      <h2 className="text-xl font-bold mb-4">
        Checklist de Abertura
      </h2>

      <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-600 transition-all"
          style={{ width: `${percentual}%` }}
        />
      </div>

      <p className="mt-3 font-semibold">
        {percentual}% concluído
      </p>

      <div className="mt-5 space-y-2">

        <p>✅ Concluídos: {concluidos}</p>

        <p>⏳ Pendentes: {pendentes}</p>

        <p className={liberado ? "text-green-600" : "text-red-600"}>
          {liberado
            ? "🟢 Operação Liberada"
            : "🔒 Operação Bloqueada"}
        </p>

      </div>

    </div>
  );
}