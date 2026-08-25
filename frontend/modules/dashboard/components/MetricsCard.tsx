import Card from "@/shared/ui/Card";

interface Props {
  titulo: string;
  valor: string | number;
  subtitulo?: string;
  fonte?: string;
}

export default function MetricsCard({
  titulo,
  valor,
  subtitulo,
  fonte,
}: Props) {
  return (
    <Card title={titulo}>
      <div className="flex min-h-[92px] flex-col justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-800 sm:text-4xl">
            {valor}
          </h2>

          {subtitulo && (
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              {subtitulo}
            </p>
          )}
        </div>

        {fonte && (
          <div className="group relative mt-3 w-fit">
            <span className="cursor-help text-[11px] text-slate-400 underline decoration-dotted underline-offset-2">
              Fonte dos dados
            </span>

            <div className="pointer-events-none absolute bottom-full left-0 z-20 mb-2 w-56 rounded-lg bg-slate-900 px-3 py-2 text-xs leading-5 text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
              {fonte}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}