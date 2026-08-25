export interface TransactionResource {
  criarSnapshot(): unknown;

  restaurarSnapshot(
    snapshot: unknown
  ): void;
}

export interface TransactionManager {
  executar<T>(
    resources: TransactionResource[],
    trabalho: () => Promise<T>
  ): Promise<T>;
}

export class InMemoryTransactionManager
  implements TransactionManager
{
  async executar<T>(
    resources: TransactionResource[],
    trabalho: () => Promise<T>
  ): Promise<T> {
    const snapshots =
      resources.map(
        (resource) => ({
          resource,

          snapshot:
            resource.criarSnapshot(),
        })
      );

    try {
      const resultado =
        await trabalho();

      return resultado;
    } catch (error) {
      for (
        const item of snapshots
      ) {
        item.resource.restaurarSnapshot(
          item.snapshot
        );
      }

      throw error;
    }
  }
}

let transactionManager:
  InMemoryTransactionManager | null =
  null;

export function getTransactionManager(): TransactionManager {
  if (!transactionManager) {
    transactionManager =
      new InMemoryTransactionManager();
  }

  return transactionManager;
}