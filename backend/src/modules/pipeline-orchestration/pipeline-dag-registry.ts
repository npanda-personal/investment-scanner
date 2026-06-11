/**
 * pipeline-dag-registry.ts
 *
 * The single place the daily pipeline's stage graph is defined.
 *
 * Edges were derived from a table-level read/write audit of every stage
 * (2026-06-11) and deliberately stay CONSERVATIVE where audits conflicted:
 *
 *  - MARKET_CONTEXT depends on SIGNAL_CALIBRATION (status-quo Q1 semantics:
 *    market context aggregates signal-derived breadth, and calibration keeps
 *    reading prior-day regime snapshots). Do not parallelize with the signal
 *    chain without revisiting docs/dataflow-proposed.md §6 Q1.
 *  - SMART_MONEY depends on RAW_SIGNALS: signal generation lazy-requires
 *    smart-money data, so today's deterministic "signals read prior-day
 *    smart money" must not become a same-day race.
 *  - RAW_SIGNALS depends on DATA_QUALITY: the batch pre-filter reads
 *    instrument_eligibility verdicts written by the DATA_QUALITY stage.
 *  - CONTEXT_SNAPSHOTS needs MARKET_CONTEXT_SNAPSHOT_REFRESH (it reads the
 *    PERSISTED market context row, not the live computation) plus SMART_MONEY
 *    and DATA_QUALITY outputs.
 *  - WORKBENCH_REFRESH needs SIGNAL_QUALITY: the workbench lazy-requires
 *    signal_outcomes — invisible to import-graph tooling, enforced here.
 *  - MARKET_PULSE / STOCK_INTEREST read signal scores → after RAW_SIGNALS.
 *  - RESEARCH_PROJECTION and TODAY_REVIEW are mutually independent (verified:
 *    the pipeline-path ResearchHubService is constructed without
 *    todayTradeReviewService) and run in parallel.
 */

import type { PipelineStageAdapter } from './pipeline-dag.types';
import { createCoreStageAdapters, type CoreStageServices } from './pipeline-dag-stages-core';
import {
  createExtendedStageAdapters,
  type ExtendedStageServices,
} from './pipeline-dag-stages-extended';
import {
  createSnapshotAssemblerAdapter,
  type SnapshotAssemblerStageServices,
} from './pipeline-dag-stages-snapshot-assembler';

export type PipelineDagServices = CoreStageServices & ExtendedStageServices & SnapshotAssemblerStageServices;

/** stageKey → dependsOn stage keys. Root stages (run as soon as the market-data sync hands over) have []. */
export const PIPELINE_DAG_EDGES: Readonly<Record<string, readonly string[]>> = {
  DATA_QUALITY: [],
  EARNINGS_INTELLIGENCE_REFRESH: [],
  SECTOR_INTELLIGENCE_REFRESH: [],
  MARKET_SCAN_REFRESH: [],
  RAW_SIGNALS: ['DATA_QUALITY'],
  SIGNAL_CALIBRATION: ['RAW_SIGNALS', 'DATA_QUALITY'],
  SMART_MONEY: ['DATA_QUALITY', 'RAW_SIGNALS'],
  MARKET_CONTEXT: ['SIGNAL_CALIBRATION'],
  MARKET_CONTEXT_SNAPSHOT_REFRESH: ['MARKET_CONTEXT'],
  MARKET_PULSE_REFRESH: ['RAW_SIGNALS', 'MARKET_CONTEXT_SNAPSHOT_REFRESH'],
  CONTEXT_SNAPSHOTS: ['MARKET_CONTEXT_SNAPSHOT_REFRESH', 'SMART_MONEY', 'DATA_QUALITY'],
  SIGNAL_QUALITY: ['CONTEXT_SNAPSHOTS'],
  STRATEGY_DECISION: [
    'SIGNAL_CALIBRATION',
    'MARKET_CONTEXT_SNAPSHOT_REFRESH',
    'SMART_MONEY',
    'DATA_QUALITY',
  ],
  RESEARCH_PROJECTION: ['STRATEGY_DECISION', 'SMART_MONEY'],
  TODAY_REVIEW: ['STRATEGY_DECISION', 'EARNINGS_INTELLIGENCE_REFRESH'],
  SIGNAL_POSITION_LEDGER: ['STRATEGY_DECISION'],
  STOCK_INTEREST_REFRESH: ['RAW_SIGNALS'],
  WORKBENCH_REFRESH: ['SIGNAL_QUALITY', 'SIGNAL_CALIBRATION'],
  // SNAPSHOT_ASSEMBLER is the final stage.  It depends on:
  //  - TODAY_REVIEW: runs trade-plan generation; assembler reads trade_plan_results after.
  //  - SIGNAL_POSITION_LEDGER: assembler includes ledger-derived coverage in provenance.
  //  - CONTEXT_SNAPSHOTS: writes smartMoneyContextSnapshot rows the assembler reads.
  SNAPSHOT_ASSEMBLER: ['TODAY_REVIEW', 'SIGNAL_POSITION_LEDGER', 'CONTEXT_SNAPSHOTS'],
};

/**
 * Assemble all stage adapters with their dependency edges applied.
 * Throws when the adapter set and the edge map disagree — a registry that
 * silently drops a stage is exactly the failure mode this file exists to kill.
 */
export function buildPipelineDagAdapters(services: PipelineDagServices): PipelineStageAdapter[] {
  const adapters = [
    ...createCoreStageAdapters(services),
    ...createExtendedStageAdapters(services),
    createSnapshotAssemblerAdapter(services),
  ];

  const adapterKeys = new Set(adapters.map((a) => a.key));
  const edgeKeys = new Set(Object.keys(PIPELINE_DAG_EDGES));

  for (const key of edgeKeys) {
    if (!adapterKeys.has(key)) {
      throw new Error(`PipelineDagRegistry: edge map references missing adapter "${key}"`);
    }
  }
  for (const key of adapterKeys) {
    if (!edgeKeys.has(key)) {
      throw new Error(`PipelineDagRegistry: adapter "${key}" has no entry in PIPELINE_DAG_EDGES`);
    }
  }

  for (const adapter of adapters) {
    adapter.dependsOn = [...PIPELINE_DAG_EDGES[adapter.key]];
  }
  return adapters;
}
