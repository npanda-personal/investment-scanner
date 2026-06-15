import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Chip, Link, Stack, Tooltip, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { humanizeCode, humanizeEmbedded } from '@/shared/format/enumLabels';
import type { TodayReviewCandidate } from '../types';
import {
  EllipsisCell,
  RangePositionIndicator,
  SectorCell,
  SmartMoneyChip,
  TierChip,
  chipNoWrapSx,
} from './TodayReviewCells';
import {
  blockerLabel,
  boardSectionLabel,
  boardSourceLabel,
  confidenceDisplay,
  dataQualityLabel,
  formatDate,
  formatEntry,
  formatStop,
  gradeColor,
  gradeSortValue,
  latestDataDate,
  marketLabel,
  proofLabel,
  range52wFromCandidate,
  safeReviewText,
  sectorAlignment,
  stateLabel,
  tierContextForCandidate,
  type CandidateColumn,
} from './todayReviewTableFormat';

/**
 * A3 + one-liner template: primary columns are answer-first and each render on a
 * single line. The Symbol cell is intentionally just the ticker + workspace link;
 * Company, Smart money and 52w position are their own dedicated columns
 * (previously stacked vertically inside the Symbol cell). Direction/State,
 * Earnings and F&O ban are intentionally not shown as columns (the tabs already
 * group by review state; earnings/F&O-ban remain available as filter toggles).
 */
export function buildCandidateColumns(runRegime: string | null): CandidateColumn[] {
  return [
    // --- Primary columns ---
    {
      id: 'rank',
      label: 'Rank',
      width: 64,
      align: 'right',
      primary: true,
      value: (candidate) => candidate.rank,
      render: (candidate) => <EllipsisCell fullText={String(candidate.rank)} align="right" strong />,
    },
    {
      id: 'symbol',
      label: 'Symbol',
      width: 112,
      primary: true,
      value: (candidate) => candidate.symbol,
      render: (candidate) => (
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ overflow: 'hidden' }}>
          <Tooltip title={`${candidate.symbol} - ${candidate.companyName || 'Company unavailable'}`} arrow enterDelay={350}>
            <Link
              component={RouterLink}
              to={`/today-review/candidates/${candidate.id}`}
              fontWeight={700}
              onClick={(event) => event.stopPropagation()}
              sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {candidate.symbol}
            </Link>
          </Tooltip>
          {candidate.instrumentId && (
            <Tooltip title="Open stock workspace" arrow enterDelay={200}>
              <Link
                component={RouterLink}
                to={`/stocks/${candidate.instrumentId}`}
                onClick={(event) => event.stopPropagation()}
                sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
              >
                <OpenInNewIcon sx={{ fontSize: 13 }} />
              </Link>
            </Tooltip>
          )}
        </Stack>
      ),
    },
    {
      id: 'company',
      label: 'Company',
      width: 180,
      primary: true,
      value: (candidate) => candidate.companyName || '',
      render: (candidate) => <EllipsisCell fullText={candidate.companyName || '—'} />,
    },
    {
      id: 'confidence',
      label: 'Score',
      width: 84,
      align: 'right',
      primary: true,
      value: (candidate) => Number(candidate.confidenceScore || 0),
      render: (candidate) => {
        const confidence = confidenceDisplay(candidate);
        return <EllipsisCell fullText={confidence.note ? `${confidence.label} - ${confidence.note}` : confidence.label} align="right" strong />;
      },
    },
    {
      id: 'smartMoney',
      label: 'Smart money',
      width: 150,
      primary: true,
      value: (candidate) => (typeof candidate.smartMoneyScore === 'number' ? candidate.smartMoneyScore : -1),
      render: (candidate) =>
        candidate.smartMoneyStatus
          ? <SmartMoneyChip status={candidate.smartMoneyStatus} score={candidate.smartMoneyScore} />
          : <EllipsisCell fullText="—" />,
    },
    {
      id: 'range52w',
      label: '52w pos',
      width: 132,
      primary: true,
      value: (candidate) => {
        const range = range52wFromCandidate(candidate);
        return range ? range.positionPct : -1;
      },
      render: (candidate) => <RangePositionIndicator candidate={candidate} />,
    },
    {
      id: 'reason',
      label: 'Why',
      width: 260,
      primary: true,
      value: (candidate) => safeReviewText(candidate.reasonSummary),
      render: (candidate) => (
        <Tooltip title={safeReviewText(candidate.reasonSummary)} arrow enterDelay={200} placement="top">
          <Typography
            component="span"
            sx={{ display: 'block', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 'inherit' }}
          >
            {safeReviewText(candidate.reasonSummary) || '—'}
          </Typography>
        </Tooltip>
      ),
    },
    {
      id: 'entry',
      label: 'Entry zone',
      width: 190,
      primary: true,
      value: (candidate) => formatEntry(candidate.tradePlanSnapshot as any),
      render: (candidate) => <EllipsisCell fullText={formatEntry(candidate.tradePlanSnapshot as any)} />,
    },
    {
      id: 'exit',
      label: 'Invalidation',
      width: 240,
      primary: true,
      value: (candidate) => formatStop(candidate.tradePlanSnapshot as any, candidate),
      render: (candidate) => <EllipsisCell fullText={formatStop(candidate.tradePlanSnapshot as any, candidate)} />,
    },
    {
      id: 'sector',
      label: 'Sector',
      width: 200,
      primary: true,
      value: sectorAlignment,
      render: (candidate) => <SectorCell candidate={candidate} />,
    },
    {
      id: 'market',
      label: 'Regime',
      width: 120,
      primary: true,
      value: (candidate) => marketLabel(candidate, runRegime),
      render: (candidate) => <EllipsisCell fullText={marketLabel(candidate, runRegime)} />,
    },

    // --- Secondary (operator / "More") columns ---
    {
      id: 'setup',
      label: 'Setup',
      width: 170,
      primary: false,
      value: (candidate) => humanizeCode(candidate.setupType || candidate.strategyCode),
      render: (candidate) => <EllipsisCell fullText={humanizeCode(candidate.setupType || candidate.strategyCode)} />,
    },
    {
      id: 'board',
      label: 'Source',
      width: 230,
      primary: false,
      value: (candidate) => `${boardSectionLabel(candidate)} ${boardSourceLabel(candidate)} ${humanizeEmbedded(candidate.boardReason) || ''}`,
      render: (candidate) => <EllipsisCell fullText={`${boardSectionLabel(candidate)} / ${boardSourceLabel(candidate)} - ${humanizeEmbedded(candidate.boardReason) || 'Standard selection.'}`} />,
    },
    {
      id: 'grade',
      label: 'Grade',
      width: 104,
      primary: false,
      value: (candidate) => gradeSortValue(candidate.grade),
      render: (candidate) => <Chip label={candidate.grade} size="small" color={gradeColor(candidate.grade) as any} sx={chipNoWrapSx} />,
    },
    {
      id: 'dailyReview',
      label: 'Daily tier',
      width: 150,
      primary: false,
      value: (candidate) => tierContextForCandidate(candidate).dailyReview.status,
      render: (candidate) => {
        const tier = tierContextForCandidate(candidate).dailyReview;
        return <TierChip tier={tier} />;
      },
    },
    {
      id: 'automation',
      label: 'Automation',
      width: 150,
      primary: false,
      value: (candidate) => tierContextForCandidate(candidate).automation.status,
      render: (candidate) => {
        const tier = tierContextForCandidate(candidate).automation;
        return <TierChip tier={tier} />;
      },
    },
    {
      id: 'dataFreshness',
      label: 'Data through',
      width: 140,
      primary: false,
      value: (candidate) => latestDataDate(candidate),
      render: (candidate) => <EllipsisCell fullText={formatDate(latestDataDate(candidate))} />,
    },
    {
      id: 'dataQuality',
      label: 'DQ',
      width: 150,
      primary: false,
      value: dataQualityLabel,
      render: (candidate) => <EllipsisCell fullText={dataQualityLabel(candidate)} />,
    },
    {
      id: 'proof',
      label: 'Proof',
      width: 130,
      primary: false,
      value: proofLabel,
      render: (candidate) => <EllipsisCell fullText={proofLabel(candidate)} />,
    },
    {
      id: 'blocker',
      label: 'Blocker',
      width: 300,
      primary: false,
      value: (candidate) => safeReviewText(blockerLabel(candidate)),
      render: (candidate) => <EllipsisCell fullText={safeReviewText(blockerLabel(candidate))} />,
    },
  ];
}

// --- CSV export (mirrors the table's current visible + operator fields) ---
export const todayReviewExportColumns: Array<{ label: string; value: (candidate: TodayReviewCandidate) => string | number | null | undefined }> = [
  { label: 'Rank', value: (candidate) => candidate.rank },
  { label: 'Symbol', value: (candidate) => candidate.symbol },
  { label: 'Company', value: (candidate) => candidate.companyName },
  { label: 'State', value: (candidate) => stateLabel(candidate.state) },
  { label: 'Setup', value: (candidate) => candidate.setupType || candidate.strategyCode },
  { label: 'Board Section', value: (candidate) => boardSectionLabel(candidate) },
  { label: 'Board Source', value: (candidate) => boardSourceLabel(candidate) },
  { label: 'Board Reason', value: (candidate) => humanizeEmbedded(candidate.boardReason) },
  { label: 'Entry Evidence', value: (candidate) => formatEntry(candidate.tradePlanSnapshot as any) },
  { label: 'Confidence', value: (candidate) => confidenceDisplay(candidate).label },
  { label: 'Grade', value: (candidate) => candidate.grade },
  { label: 'Daily Tier', value: (candidate) => tierContextForCandidate(candidate).dailyReview.status },
  { label: 'Data Through', value: (candidate) => latestDataDate(candidate) },
  { label: 'Data Quality', value: dataQualityLabel },
  { label: 'Reason Summary', value: (candidate) => safeReviewText(candidate.reasonSummary) },
  { label: 'Blocker', value: (candidate) => safeReviewText(blockerLabel(candidate)) },
  { label: 'Strategy Code', value: (candidate) => candidate.strategyCode },
];

function csvCell(value: string | number | null | undefined): string {
  const text = typeof value === 'number' ? String(value) : String(value ?? '').replace(/^[=+@-]/, "'$&");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function downloadTodayReviewCsv(rows: TodayReviewCandidate[], tabLabel: string) {
  const header = todayReviewExportColumns.map((column) => csvCell(column.label)).join(',');
  const body = rows.map((candidate) => todayReviewExportColumns.map((column) => csvCell(column.value(candidate))).join(',')).join('\r\n');
  const csv = `﻿${header}\r\n${body}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const tabSlug = tabLabel.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'candidates';
  link.href = url;
  link.download = `today-review-${tabSlug}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
