import {
  promises as fs,
} from "node:fs";

import {
  dirname,
  join,
} from "node:path";

import {
  ArquivoStorage,
} from "./arquivoStorage";

export class ArquivoStorageLocal
  implements ArquivoStorage
{
  constructor(
    private readonly diretorioBase: string
  ) {}

  async salvar(
    caminhoRelativo: string,
    arquivo: File
  ): Promise<{
    caminhoRelativo: string;
    tamanho: number;
  }> {
    const caminhoSeguro =
      this.normalizarCaminho(
        caminhoRelativo
      );

    const caminhoAbsoluto =
      join(
        this.diretorioBase,
        caminhoSeguro
      );

    const buffer =
      Buffer.from(
        await arquivo.arrayBuffer()
      );

    await fs.mkdir(
      dirname(
        caminhoAbsoluto
      ),
      {
        recursive: true,
      }
    );

    await fs.writeFile(
      caminhoAbsoluto,
      buffer
    );

    return {
      caminhoRelativo:
        caminhoSeguro,

      tamanho:
        buffer.length,
    };
  }

  async existe(
    caminhoRelativo: string
  ): Promise<boolean> {
    const caminhoSeguro =
      this.normalizarCaminho(
        caminhoRelativo
      );

    const caminhoAbsoluto =
      join(
        this.diretorioBase,
        caminhoSeguro
      );

    try {
      await fs.access(
        caminhoAbsoluto
      );

      return true;
    } catch {
      return false;
    }
  }

  async obter(
    caminhoRelativo: string
  ): Promise<Buffer> {
    const caminhoSeguro =
      this.normalizarCaminho(
        caminhoRelativo
      );

    const caminhoAbsoluto =
      join(
        this.diretorioBase,
        caminhoSeguro
      );

    return fs.readFile(
      caminhoAbsoluto
    );
  }

  async excluir(
    caminhoRelativo: string
  ): Promise<void> {
    const caminhoSeguro =
      this.normalizarCaminho(
        caminhoRelativo
      );

    const caminhoAbsoluto =
      join(
        this.diretorioBase,
        caminhoSeguro
      );

    try {
      await fs.unlink(
        caminhoAbsoluto
      );
    } catch (error) {
      const codigo =
        error &&
        typeof error === "object" &&
        "code" in error
          ? error.code
          : undefined;

      if (
        codigo !== "ENOENT"
      ) {
        throw error;
      }
    }
  }

  private normalizarCaminho(
    caminhoRelativo: string
  ): string {
    const normalizado =
      caminhoRelativo
        .replace(/\\/g, "/")
        .replace(/^\/+/, "");

    if (
      normalizado.includes(
        ".."
      )
    ) {
      throw new Error(
        "Caminho de arquivo inválido."
      );
    }

    return normalizado;
  }
}