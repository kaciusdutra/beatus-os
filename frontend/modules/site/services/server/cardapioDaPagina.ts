import "server-only";

import { cache } from "react";

import { getSiteService } from "./siteServiceFactory";

// Layout e página pedem os mesmos dados: dentro de uma requisição só vai uma consulta ao banco.
export const cardapioDaPagina = cache(() => getSiteService().cardapio());
