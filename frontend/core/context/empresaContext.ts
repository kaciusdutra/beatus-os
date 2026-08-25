export interface EmpresaContext {
  empresaId: string;
}

export const EMPRESA_DESENVOLVIMENTO_ID =
  "00000000-0000-0000-0000-000000000001";

export function criarEmpresaContext(
  empresaId: string
): EmpresaContext {
  if (!empresaId.trim()) {
    throw new Error(
      "empresaId é obrigatório."
    );
  }

  return {
    empresaId:
      empresaId.trim(),
  };
}

export function criarContextoDesenvolvimento(): EmpresaContext {
  return criarEmpresaContext(
    EMPRESA_DESENVOLVIMENTO_ID
  );
}