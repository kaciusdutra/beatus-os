import "server-only";

import { criarPrecificacaoServicePostgres } from "@/modules/precificacao/services/server/precificacaoServiceFactory";

import { getHorarioService } from "@/modules/operacao/services/server/horarioServiceFactory";

import { criarProdutoServicePostgres } from "@/modules/produtos/services/server/produtoServiceFactory";

import { SiteService } from "../siteService";

export function getSiteService(): SiteService {
  return new SiteService({
    produtos: () => criarProdutoServicePostgres().listar(),
    precos: () => criarPrecificacaoServicePostgres().listarPrecos(),
    horarios: () => getHorarioService().obter(),
  });
}
