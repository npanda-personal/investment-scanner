import { Prisma } from '@prisma/client';
import prisma from '../../db/prisma';

export interface WorkbenchSnapshotWriteInput {
  instrumentId: string;
  symbol: string;
  computedAt: Date;
  dataThroughDate: Date | null;
  payloadJson: Record<string, unknown>;
}

export interface WorkbenchSnapshotRow {
  id: string;
  instrumentId: string;
  symbol: string;
  computedAt: Date;
  dataThroughDate: Date | null;
  payloadJson: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export class WorkbenchSnapshotRepository {
  /**
   * Upsert a workbench snapshot for the given instrument.
   * Keyed on instrumentId (unique) — one snapshot per instrument.
   */
  async upsert(input: WorkbenchSnapshotWriteInput): Promise<WorkbenchSnapshotRow> {
    const payload = input.payloadJson as unknown as Prisma.InputJsonValue;
    const row = await prisma.workbenchSnapshot.upsert({
      where: { instrumentId: input.instrumentId },
      create: {
        instrumentId: input.instrumentId,
        symbol: input.symbol,
        computedAt: input.computedAt,
        dataThroughDate: input.dataThroughDate,
        payloadJson: payload,
      },
      update: {
        symbol: input.symbol,
        computedAt: input.computedAt,
        dataThroughDate: input.dataThroughDate,
        payloadJson: payload,
      },
    });
    return row as WorkbenchSnapshotRow;
  }

  /** Read the persisted snapshot for a single instrument. Returns null when not yet computed. */
  async findByInstrumentId(instrumentId: string): Promise<WorkbenchSnapshotRow | null> {
    const row = await prisma.workbenchSnapshot.findUnique({
      where: { instrumentId },
    });
    return row as WorkbenchSnapshotRow | null;
  }

  /** Return the list of instrumentIds that have a snapshot older than cutoffMs milliseconds ago, or have no snapshot. */
  async findStaleInstrumentIds(instrumentIds: string[], cutoffMs: number): Promise<string[]> {
    const cutoff = new Date(Date.now() - cutoffMs);
    const rows = await prisma.workbenchSnapshot.findMany({
      where: { instrumentId: { in: instrumentIds } },
      select: { instrumentId: true, computedAt: true },
    });
    const fresh = new Set(rows.filter((r) => r.computedAt >= cutoff).map((r) => r.instrumentId));
    return instrumentIds.filter((id) => !fresh.has(id));
  }
}
