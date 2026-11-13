import { NextResponse } from "next/server";

import { getConsultaClienteService } from "@/modules/clientes/services/server/consultaClienteServiceFactory";

import { respostaDeErro } from "@/modules/estoque/services/server/respostaDeErro";

import { operadorDaRequisicao } from "@/modules/atividades/services/operador";

// Detalhe do cliente: dados, endereços e últimos pedidos.
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const cliente = await getConsultaClienteService().detalhe(id);

    return NextResponse.json({ sucesso: true, cliente });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível ler o cliente.", 404);
  }
}

// Corrige nome, e-mail, data de nascimento ou situação (ativo).
// O telefone e o CPF identificam o cliente e não mudam por aqui.
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const corpo = await request.json();

    const cliente = await getConsultaClienteService().editar(id, {
      nome: typeof corpo?.nome === "string" ? corpo.nome : undefined,
      email:
        corpo?.email === null || typeof corpo?.email === "string"
          ? corpo.email
          : undefined,
      dataNascimento:
        corpo?.dataNascimento === null || typeof corpo?.dataNascimento === "string"
          ? corpo.dataNascimento
          : undefined,
      ativo: typeof corpo?.ativo === "boolean" ? corpo.ativo : undefined,
    }, operadorDaRequisicao(request));

    return NextResponse.json({ sucesso: true, cliente });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível salvar o cliente.");
  }
}
