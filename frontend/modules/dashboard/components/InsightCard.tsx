import Card from "@/shared/ui/Card";

interface Props {
  mensagem: string;
}

export default function InsightCard({ mensagem }: Props) {
  return (
    <Card title="Assistente Beatus">
      <p className="text-slate-700 leading-7">
        {mensagem}
      </p>
    </Card>
  );
}