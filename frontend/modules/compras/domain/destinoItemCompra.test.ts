import assert from "node:assert/strict";

import {
  contarItensSemDestino,
  ehDestinoItemCompra,
  normalizarDescricaoItemCompra,
  rotuloDestinoItemCompra,
} from "./destinoItemCompra";

// Destinos válidos
assert.equal(ehDestinoItemCompra("INSUMO"), true);
assert.equal(ehDestinoItemCompra("SERVICO"), true);
assert.equal(ehDestinoItemCompra("PATRIMONIO"), false);
assert.equal(ehDestinoItemCompra(""), false);
assert.equal(ehDestinoItemCompra(undefined), false);

// Rótulos
assert.equal(rotuloDestinoItemCompra("LIMPEZA_HIGIENE"), "Limpeza e higiene");
assert.equal(rotuloDestinoItemCompra(undefined), "Não classificado");

// Chave do item do fornecedor (regra 9.13)
assert.equal(
  normalizarDescricaoItemCompra("Pão brioche c/ 6"),
  "PAO BRIOCHE C 6"
);
assert.equal(
  normalizarDescricaoItemCompra("PAO BRIOCHE C/6"),
  "PAO BRIOCHE C 6"
);
assert.equal(
  normalizarDescricaoItemCompra("  pão  brioche c 6 "),
  "PAO BRIOCHE C 6"
);
assert.equal(
  normalizarDescricaoItemCompra("Açúcar Cristal 1kg (Pct.)"),
  "ACUCAR CRISTAL 1KG PCT"
);
assert.equal(normalizarDescricaoItemCompra(" -- "), "");

// Itens sem destino impedem a confirmação (regra 9.8)
assert.equal(
  contarItensSemDestino([
    { destino: "INSUMO" },
    { destino: null },
    { destino: undefined },
    { destino: "EMBALAGEM" },
  ]),
  2
);
assert.equal(contarItensSemDestino([]), 0);

console.log("✅ destinoItemCompra: verificações passaram.");
