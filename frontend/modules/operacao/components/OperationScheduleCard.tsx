"use client";

interface Props {
  dia: string;
  aberturaInicial: string;
  fechamentoInicial: string;
  fechadoInicial?: boolean;
  onChange?: (
    fechado: boolean,
    abertura: string,
    fechamento: string
  ) => void;
}

export default function OperationScheduleCard({
  dia,
  aberturaInicial,
  fechamentoInicial,
  fechadoInicial = false,
  onChange,
}: Props) {
  function handleFechadoChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const novoFechado = event.target.checked;

    onChange?.(
      novoFechado,
      aberturaInicial,
      fechamentoInicial
    );
  }

  function handleAberturaChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const novaAbertura = event.target.value;

    onChange?.(
      fechadoInicial,
      novaAbertura,
      fechamentoInicial
    );
  }

  function handleFechamentoChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const novoFechamento = event.target.value;

    onChange?.(
      fechadoInicial,
      aberturaInicial,
      novoFechamento
    );
  }

  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold">
            {dia}
          </h2>

          <p className="text-sm text-gray-500">
            Horário de funcionamento
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={fechadoInicial}
            onChange={handleFechadoChange}
            className="h-5 w-5"
          />

          Fechado
        </label>
      </div>

      {!fechadoInicial && (
        <div className="mt-5 grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">
              Abertura
            </label>

            <input
              type="time"
              value={aberturaInicial}
              onChange={handleAberturaChange}
              className="mt-1 w-full rounded-lg border px-3 py-2"
            />
          </div>

          <div>
            <label className="text-sm font-medium">
              Fechamento
            </label>

            <input
              type="time"
              value={fechamentoInicial}
              onChange={handleFechamentoChange}
              className="mt-1 w-full rounded-lg border px-3 py-2"
            />
          </div>
        </div>
      )}
    </div>
  );
}