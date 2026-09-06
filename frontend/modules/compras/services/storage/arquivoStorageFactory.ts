import {
  join,
} from "node:path";

import {
  ArquivoStorage,
} from "./arquivoStorage";

import {
  ArquivoStorageLocal,
} from "./arquivoStorageLocal";

let storage:
  ArquivoStorage | null =
  null;

export function criarArquivoStorage(): ArquivoStorage {
  if (!storage) {
    const diretorioBase =
      process.env.BEATUS_STORAGE_PATH ??
      join(
        process.cwd(),
        "storage"
      );

    storage =
      new ArquivoStorageLocal(
        diretorioBase
      );
  }

  return storage;
}