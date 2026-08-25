import Card from "@/shared/ui/Card";

interface Props {
  percentual: number;
  pronta: boolean;
  pendencias: number;
}

export default function OperationStatusCard({
  percentual,
  pronta,
  pendencias,
}: Props) {
  return (
    <Card title="Status da Operação">
      <div className="space-y-3">
        <p className="text-4xl font-bold">
          {percentual}%
        </p>

        <p
          className={
            pronta
              ? "text-green-600 font-semibold"
              : "text-red-600 font-semibold"
          }
        >
          {pronta
            ? "✅ Restaurante pronto para operar"
            : "⚠ Restaurante ainda não está pronto"}
        </p>

        <p className="text-slate-500">
          Pendências: {pendencias}
        </p>
      </div>
    </Card>
  );
}