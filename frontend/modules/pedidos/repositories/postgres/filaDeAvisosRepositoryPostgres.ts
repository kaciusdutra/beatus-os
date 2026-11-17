import "server-only";

import { prisma } from "@/lib/prisma";

import type { EmpresaContext } from "@/core/context/empresaContext";

import type { CanalDoAviso, EventoDoAviso } from "../../services/avisoDoPedido";

import type { AvisoParaEnviar, FilaDeAvisosPort } from "../../services/envioDeAvisos";

// A fila de avisos do pedido (tabela AvisoDoPedido) vista pelo envio. Só PENDENTE entra; o mais antigo primeiro.
export class FilaDeAvisosRepositoryPostgres implements FilaDeAvisosPort {
  constructor(private readonly contexto: EmpresaContext) {}

  async pendentes(limite: number): Promise<AvisoParaEnviar[]> {
    const avisos = await prisma.avisoDoPedido.findMany({
      where: { empresaId: this.contexto.empresaId, status: "PENDENTE" },
      // Os avisos do site primeiro (são só dispensados, não custam nada) e depois os do WhatsApp, do mais antigo ao mais novo:
      // assim uma fila de avisos do WhatsApp esperando a conexão com a Meta não atrasa os do site.
      orderBy: [{ canalDoAviso: "asc" }, { criadoEm: "asc" }],
      take: limite,
      include: { pedido: { select: { numero: true, statusOperacional: true, cliente: { select: { telefone: true } } } } },
    });

    return avisos.map((aviso) => ({
      id: aviso.id,
      evento: aviso.evento as EventoDoAviso,
      canal: aviso.canalDoAviso as CanalDoAviso,
      texto: aviso.texto,
      tentativas: aviso.tentativas,
      criadoEm: aviso.criadoEm,
      numeroDoPedido: aviso.pedido.numero,
      situacaoDoPedido: aviso.pedido.statusOperacional,
      telefoneDoCliente: aviso.pedido.cliente?.telefone,
    }));
  }

  // Reserva pelo número de tentativas: se outra tela já pegou o aviso, o contador mudou e esta não leva nada.
  async reservar(id: string, tentativasAtuais: number): Promise<boolean> {
    const { count } = await prisma.avisoDoPedido.updateMany({
      where: { id, empresaId: this.contexto.empresaId, status: "PENDENTE", tentativas: tentativasAtuais },
      data: { tentativas: { increment: 1 } },
    });

    return count === 1;
  }

  async marcarEnviado(id: string, quando: Date): Promise<void> {
    await prisma.avisoDoPedido.updateMany({
      where: { id, empresaId: this.contexto.empresaId },
      data: { status: "ENVIADO", enviadoEm: quando, erro: null },
    });
  }

  async marcarDispensado(id: string, motivo: string): Promise<void> {
    await prisma.avisoDoPedido.updateMany({
      where: { id, empresaId: this.contexto.empresaId, status: "PENDENTE" },
      data: { status: "DISPENSADO", erro: motivo },
    });
  }

  async registrarFalha(id: string, erro: string, finalizar: boolean): Promise<void> {
    await prisma.avisoDoPedido.updateMany({
      where: { id, empresaId: this.contexto.empresaId },
      data: { erro: erro.slice(0, 500), ...(finalizar ? { status: "FALHOU" } : {}) },
    });
  }
}
