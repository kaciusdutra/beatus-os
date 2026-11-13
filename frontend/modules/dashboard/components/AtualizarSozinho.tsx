"use client";

import { useEffect } from "react";

import { useRouter } from "next/navigation";

// O dashboard fica aberto na TV: recarrega os números sozinho.
export default function AtualizarSozinho({ segundos = 30 }: { segundos?: number }) {
  const router = useRouter();

  useEffect(() => {
    const intervalo = setInterval(() => router.refresh(), segundos * 1000);

    return () => clearInterval(intervalo);
  }, [router, segundos]);

  return null;
}
