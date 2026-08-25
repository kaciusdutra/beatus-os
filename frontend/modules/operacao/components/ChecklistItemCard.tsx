import { ChecklistItem } from "../types/checklist";

interface Props {
  item: ChecklistItem;
  onToggle: (id: string) => void;
}

export default function ChecklistItemCard({
  item,
  onToggle,
}: Props) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-4 bg-white shadow-sm">
      <div>
        <h3 className="font-semibold">
          {item.titulo}
        </h3>

        <p className="text-sm text-gray-500">
          {item.categoria}
        </p>

        <p className="text-xs mt-2">
          Prioridade: <strong>{item.prioridade}</strong>
        </p>
      </div>

      <input
        type="checkbox"
        checked={item.status === "concluido"}
        onChange={() => onToggle(item.id)}
        className="w-6 h-6"
      />
    </div>
  );
}