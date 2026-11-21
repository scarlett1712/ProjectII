import type { Prisma } from "@prisma/client";
import type { SeriesWrite } from "@/shared/domain/recurringSeries";
import { db } from "./db";

type OwnedId = { id: string; userId: string };

/** Subset of a Prisma delegate such as tx.taskItem required for series writes. */
export interface SeriesDelegate<R, F> {
  deleteMany(args: { where: OwnedId }): PromiseLike<unknown>;
  update(args: { where: OwnedId; data: Partial<F> }): PromiseLike<R>;
  create(args: { data: F & { userId: string } }): PromiseLike<R>;
}

/**
 * Apply writes to seriesId in order within one transaction and return the final written record,
 * or null for a final delete. delegateOf selects the table on the transaction client.
 */
export function applySeriesWrites<R, F>(
  delegateOf: (tx: Prisma.TransactionClient) => SeriesDelegate<R, F>,
  userId: string,
  seriesId: string,
  writes: SeriesWrite<F>[],
): Promise<R | null> {
  return db.$transaction(async (tx) => {
    const delegate = delegateOf(tx);
    const where = { id: seriesId, userId };
    let last: R | null = null;
    for (const write of writes) {
      switch (write.op) {
        case "deleteParent":
          await delegate.deleteMany({ where });
          last = null;
          break;
        case "updateParent":
          last = await delegate.update({ where, data: write.data });
          break;
        case "create":
          last = await delegate.create({ data: { ...write.data, userId } });
          break;
      }
    }
    return last;
  });
}
