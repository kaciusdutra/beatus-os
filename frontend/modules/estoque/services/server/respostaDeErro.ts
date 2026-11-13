import { NextResponse } from "next/server";

// Os serviços lançam mensagens já escritas para o usuário.
export function respostaDeErro(error: unknown, padrao: string, status = 400) {
  console.error(padrao, error);

  return NextResponse.json(
    {
      sucesso: false,
      mensagem: error instanceof Error ? error.message : padrao,
    },
    { status }
  );
}
