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
  evaluatedCount?: number;
  unevaluatedCount?: number;
  missingPriceHistoryCount?: number;
  missingPriceHistoryInBatch?: number;
  calibratedCount?: number;
  passthroughCount?: number;
  outOfScopeSkipped?: number;
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
  evaluatedCount: number;
  unevaluatedCount: number;
  missingPriceHistoryCount: number;
  calibratedCount: number;
  passthroughCount: number;
  outOfScopeSkipped: number;
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
  evaluatedCount: 0,
  unevaluatedCount: 0,
  missingPriceHistoryCount: 0,
  calibratedCount: 0,
  passthroughCount: 0,
  outOfScopeSkipped: 0,
  warnings: [],
  currentOffset: 0,
  hasMore: false,
  lastBatchSummary: null,
  finalSummary: null,
};

type RunOptions<T extends BatchRunnerResponse> = {
  batchSize: number;
  initialOffset?: number;
  parallelism?: number;
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

  const run = useCallback(async ({ batchSize, initialOffset = 0, parallelism = 1, runBatch }: RunOptions<T>) => {
    if (runningRef.current) return null;
    runningRef.current = true;
    cancelRequested.current = false;
    setState({ ...(initialState as BatchRunnerState<T>), running: true, currentOffset: initialOffset });

    let offset = initialOffset;
    let finalSummary: T | null = null;
    const batchRequestWorkers = Math.max(1, Math.floor(parallelism));
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
      evaluatedCount: 0,
      unevaluatedCount: 0,
      missingPriceHistoryCount: 0,
      calibratedCount: 0,
      passthroughCount: 0,
      outOfScopeSkipped: 0,
      warnings: [] as string[],
    };

    const recordBatchResult = (result: T, requestedOffset: number) => {
      finalSummary = result;
      const resultOffset = result.offset ?? requestedOffset;
      const processedCount = result.processedCount ?? 0;
      aggregate.processedCount += processedCount;
      aggregate.totalCount = result.totalCount ?? aggregate.totalCount;
      aggregate.batchCount += 1;
      aggregate.generatedCount += result.generatedCount ?? 0;
      aggregate.updatedCount += result.updatedCount ?? 0;
      aggregate.insertedCount += result.insertedCount ?? 0;
      aggregate.skippedCount += result.skippedCount ?? 0;
      aggregate.failedCount += result.failedCount ?? 0;
      aggregate.noOpCount += result.noOpCount ?? 0;
      aggregate.evaluatedCount += result.evaluatedCount ?? 0;
      aggregate.unevaluatedCount += result.unevaluatedCount ?? 0;
      aggregate.missingPriceHistoryCount += result.missingPriceHistoryCount ?? result.missingPriceHistoryInBatch ?? 0;
      aggregate.calibratedCount += result.calibratedCount ?? 0;
      aggregate.passthroughCount += result.passthroughCount ?? 0;
      aggregate.outOfScopeSkipped += result.outOfScopeSkipped ?? 0;
      aggregate.warnings.push(...(result.warnings || []));

      const processedForProgress = resultOffset + processedCount;
      const isComplete = aggregate.totalCount !== null
        ? aggregate.processedCount >= aggregate.totalCount
        : !result.hasMore || result.nextOffset === null;

      setState((previous) => ({
        ...previous,
        running: !isComplete,
        complete: isComplete,
        processedCount: aggregate.processedCount,
        totalCount: aggregate.totalCount ?? previous.totalCount,
        batchCount: aggregate.batchCount,
        generatedCount: aggregate.generatedCount,
        updatedCount: aggregate.updatedCount,
        insertedCount: aggregate.insertedCount,
        skippedCount: aggregate.skippedCount,
        failedCount: aggregate.failedCount,
        noOpCount: aggregate.noOpCount,
        evaluatedCount: aggregate.evaluatedCount,
        unevaluatedCount: aggregate.unevaluatedCount,
        missingPriceHistoryCount: aggregate.missingPriceHistoryCount,
        calibratedCount: aggregate.calibratedCount,
        passthroughCount: aggregate.passthroughCount,
        outOfScopeSkipped: aggregate.outOfScopeSkipped,
        warnings: [...aggregate.warnings],
        currentOffset: Math.max(previous.currentOffset, result.nextOffset ?? processedForProgress),
        hasMore: !isComplete,
        lastBatchSummary: result,
        finalSummary: result,
      }));
    };

    try {
      const firstResult = await runBatch({ offset, batchSize });
      recordBatchResult(firstResult, offset);

      if (!firstResult.hasMore || firstResult.nextOffset === null || firstResult.nextOffset === undefined || cancelRequested.current) {
        return { finalSummary, aggregate };
      }

      if (batchRequestWorkers > 1 && firstResult.totalCount !== undefined) {
        const offsets: number[] = [];
        for (let nextOffset = firstResult.nextOffset; nextOffset < firstResult.totalCount; nextOffset += batchSize) {
          offsets.push(nextOffset);
        }
        let nextOffsetIndex = 0;

        const worker = async () => {
          while (!cancelRequested.current && nextOffsetIndex < offsets.length) {
            const workerOffset = offsets[nextOffsetIndex];
            nextOffsetIndex += 1;
            const result = await runBatch({ offset: workerOffset, batchSize });
            recordBatchResult(result, workerOffset);
          }
        };

        await Promise.all(Array.from({ length: Math.min(batchRequestWorkers, offsets.length) }, worker));
        return { finalSummary, aggregate };
      }

      offset = firstResult.nextOffset;
      while (!cancelRequested.current) {
        const result = await runBatch({ offset, batchSize });
        recordBatchResult(result, offset);

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
