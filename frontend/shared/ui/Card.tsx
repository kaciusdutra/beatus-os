import { ReactNode } from "react";

interface CardProps {
  title?: string;
  children: ReactNode;
}

export default function Card({ title, children }: CardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">

      {title && (
        <h2 className="text-lg font-semibold text-slate-800 mb-4">
          {title}
        </h2>
      )}

      {children}

    </div>
  );
}