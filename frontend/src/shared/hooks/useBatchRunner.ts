import { useCallback, useRef, useState } from 'react';

export type BatchRunnerResponse = {
  processedCount?: number;
  totalCount?: number;
  batchSize?: number;
  offset?: number;
  nextOffset?: number | null;
  hasMore?: boolean;
  generatedCount?: number;
  updatedCount?: number;
  insertedCount?: number;
  skippedCount?: number;
  failedCount?: number;
  noOpCount?: number;
  warnings?: string[];
};

export type BatchRunnerState<T extends BatchRunnerResponse = BatchRunnerResponse> = {
  running: boolean;
  complete: boolean;
  error: string | null;
  processedCount: number;
  totalCount: number | null;
  batchCount: number;
  generatedCount: number;
  updatedCount: number;
  insertedCount: number;
  skippedCount: number;
  failedCount: number;
  noOpCount: number;
  warnings: string[];
  currentOffset: number;
  hasMore: boolean;
  lastBatchSummary: T | null;
  finalSummary: T | null;
};

const initialState: BatchRunnerState = {
  running: false,
  complete: false,
  error: null,
  processedCount: 0,
  totalCount: null,
  batchCount: 0,
  generatedCount: 0,
  updatedCount: 0,
  insertedCount: 0,
  skippedCount: 0,
  failedCount: 0,
  noOpCount: 0,
  warnings: [],
  currentOffset: 0,
  hasMore: false,
  lastBatchSummary: null,
  finalSummary: null,
};

type RunOptions<T extends BatchRunnerResponse> = {
  batchSize: number;
  initialOffset?: number;
  runBatch: (input: { offset: number; batchSize: number }) => Promise<T>;
};

export function useBatchRunner<T extends BatchRunnerResponse = BatchRunnerResponse>() {
  const [state, setState] = useState<BatchRunnerState<T>>(initialState as BatchRunnerState<T>);
  const cancelRequested = useRef(false);
  const runningRef = useRef(false);

  const reset = useCallback(() => {
    cancelRequested.current = false;
    runningRef.current = false;
    setState(initialState as BatchRunnerState<T>);
  }, []);

  const cancel = useCallback(() => {
    cancelRequested.current = true;
  }, []);

  const run = useCallback(async ({ batchSize, initialOffset = 0, runBatch }: RunOptions<T>) => {
    if (runningRef.current) return null;
    runningRef.current = true;
    cancelRequested.current = false;
    setState({ ...(initialState as BatchRunnerState<T>), running: true, currentOffset: initialOffset });

    let offset = initialOffset;
    let finalSummary: T | null = null;
    const aggregate = {
      processedCount: 0,
      totalCount: null as number | null,
      batchCount: 0,
      generatedCount: 0,
      updatedCount: 0,
      insertedCount: 0,
      skippedCount: 0,
      failedCount: 0,
      noOpCount: 0,
      warnings: [] as string[],
    };

    try {
      while (!cancelRequested.current) {
        const result = await runBatch({ offset, batchSize });
        finalSummary = result;
        const processedForProgress = result.offset !== undefined
          ? result.offset + (result.processedCount ?? 0)
          : offset + (result.processedCount ?? 0);
        aggregate.processedCount = Math.max(aggregate.processedCount, processedForProgress);
        aggregate.totalCount = result.totalCount ?? aggregate.totalCount;
        aggregate.batchCount += 1;
        aggregate.generatedCount += result.generatedCount ?? 0;
        aggregate.updatedCount += result.updatedCount ?? 0;
        aggregate.insertedCount += result.insertedCount ?? 0;
        aggregate.skippedCount += result.skippedCount ?? 0;
        aggregate.failedCount += result.failedCount ?? 0;
        aggregate.noOpCount += result.noOpCount ?? 0;
        aggregate.warnings.push(...(result.warnings || []));

        setState((previous) => ({
          ...previous,
          running: Boolean(result.hasMore && result.nextOffset !== null),
          complete: !result.hasMore || result.nextOffset === null,
          processedCount: Math.max(previous.processedCount, processedForProgress),
          totalCount: result.totalCount ?? previous.totalCount,
          batchCount: previous.batchCount + 1,
          generatedCount: previous.generatedCount + (result.generatedCount ?? 0),
          updatedCount: previous.updatedCount + (result.updatedCount ?? 0),
          insertedCount: previous.insertedCount + (result.insertedCount ?? 0),
          skippedCount: previous.skippedCount + (result.skippedCount ?? 0),
          failedCount: previous.failedCount + (result.failedCount ?? 0),
          noOpCount: previous.noOpCount + (result.noOpCount ?? 0),
          warnings: [...previous.warnings, ...(result.warnings || [])],
          currentOffset: result.nextOffset ?? processedForProgress,
          hasMore: Boolean(result.hasMore && result.nextOffset !== null),
          lastBatchSummary: result,
          finalSummary: result,
        }));

        if (!result.hasMore || result.nextOffset === null || result.nextOffset === undefined) break;
        offset = result.nextOffset;
      }
      return { finalSummary, aggregate };
    } catch (error: any) {
      setState((previous) => ({
        ...previous,
        running: false,
        complete: false,
        error: error?.response?.data?.error || error?.message || 'Batch run failed',
        finalSummary,
      }));
      throw error;
    } finally {
      runningRef.current = false;
      setState((previous) => ({ ...previous, running: false }));
    }
  }, []);

  return { ...state, run, cancel, reset };
}
