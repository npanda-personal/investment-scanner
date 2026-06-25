/**
 * Sector Intelligence panel: sortable sector table with expandable constituent drill-down.
 */
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableFooter,
  TableHead,
  TablePagination,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { SortableTableCell } from '@/shared/components';
import { useTableSort, sortRows } from '@/shared/hooks';
import { useMarketScope } from '@/contexts/MarketScopeContext';
import { humanizeCode, indexLabel } from '@/shared/format/enumLabels';
import { money, changeColor } from '@/shared/format/money';
import { fetchSectorConstituents } from '../api/marketIntelligenceService';
import type {
  SectorConstituentRow,
  SectorConstituentsEnvelope,
  SectorIntelligenceSnapshot,
  SnapshotEnvelope,
} from '../types';
import {
  EmptyState,
  ReasonTags,
  RiskTags,
  SectionPanel,
  formatPercentPoints,
  formatEnum,
} from './marketIntelligencePrimitives';

// ---------------------------------------------------------------------------
// Hook: lazily load sector constituents the first time a sector row is expanded.
// Fetches from the persisted-read endpoint; never generates on GET.
// ---------------------------------------------------------------------------

function useSectorConstituents(sector: string | null, region: string, assetType: string) {
  const [data, setData] = useState<SectorConstituentsEnvelope | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!sector || data || loading) return;
    setLoading(true);
    setError(null);
    fetchSectorConstituents(sector, { region: region as any, assetType: assetType as any })
      .then((result) => { setData(result); setLoading(false); })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load sector constituents.');
        setLoading(false);
      });
  }, [sector, data, loading, region, assetType]);

  useEffect(() => {
    if (sector) load();
  }, [sector, load]);

  return { data, loading, error };
}

// ---------------------------------------------------------------------------
// SectorScoreCell
// ---------------------------------------------------------------------------

/**
 * NR-64: Sector score chip with subtle color encoding.
 * Thresholds are tuned to the observed NSE sector score range (typically 0–100):
 *   >= 60 → green (strong / above neutral)
 *   40–59 → default / neutral
 *   < 40  → red (weak / below neutral)
 */
function SectorScoreCell({ score }: { score: number | null }) {
  if (score === null || score === undefined) {
    return <Typography variant="body2" color="text.secondary">Unavailable</Typography>;
  }
  const color: 'success' | 'default' | 'error' =
    score >= 60 ? 'success' : score < 40 ? 'error' : 'default';
  return (
    <Tooltip title="Sector strength score (0–100)" arrow>
      <Chip
        label={`${new Intl.NumberFormat().format(score)}/100`}
        color={color}
        variant="outlined"
        size="small"
        sx={{ fontWeight: 600, minWidth: 52 }}
      />
    </Tooltip>
  );
}

// ---------------------------------------------------------------------------
// SectorRowWithDrillDown
// ---------------------------------------------------------------------------

/**
 * Expandable sector row — clicking expands a constituents sub-table below.
 */
function SectorRowWithDrillDown({
  row,
  region,
  assetType,
}: {
  row: SectorIntelligenceSnapshot;
  region: string;
  assetType: string;
}) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const { data, loading, error } = useSectorConstituents(expanded ? row.sector : null, region, assetType);

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded((prev) => !prev);
  };

  const colSpan = 9; // matches number of header cells

  return (
    <>
      <TableRow
        hover
        sx={{ cursor: 'pointer' }}
        title={`Click expand to see constituent stocks, or use the signal link to filter signals`}
      >
        <TableCell padding="checkbox">
          <Tooltip title={expanded ? 'Hide constituents' : 'Show constituent stocks'} arrow>
            <IconButton size="small" onClick={handleExpandClick} aria-label={expanded ? 'collapse' : 'expand'}>
              {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </TableCell>
        {/* Sector name — click opens signal screener */}
        <TableCell
          onClick={() => navigate(`/signals?sector=${encodeURIComponent(row.sector)}`)}
          sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
          title={`View signals for ${indexLabel(row.sector)}`}
        >
          {indexLabel(row.sector)}
        </TableCell>
        <TableCell>{formatEnum(row.classification)}</TableCell>
        <TableCell align="right"><SectorScoreCell score={row.sectorScore} /></TableCell>
        <TableCell align="right">{formatPercentPoints(row.return1W)}</TableCell>
        <TableCell align="right">{formatPercentPoints(row.return1M)}</TableCell>
        <TableCell align="right">{formatPercentPoints(row.return3M)}</TableCell>
        <TableCell><ReasonTags tags={row.reasonTags.map(humanizeCode)} /></TableCell>
        <TableCell><RiskTags tags={row.warnings.map(humanizeCode)} /></TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell colSpan={colSpan} sx={{ p: 0, borderBottom: 'none' }}>
            <Collapse in={expanded} timeout="auto" unmountOnExit>
              <Box sx={{ p: 1.5, bgcolor: 'action.hover' }}>
                <SectorConstituentsTable
                  sector={row.sector}
                  data={data}
                  loading={loading}
                  error={error}
                />
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// SectorConstituentsTable
// ---------------------------------------------------------------------------

type SectorConstituentSortKey = 'symbol' | 'company' | 'price' | 'return1W' | 'return1M' | 'signal' | 'score';

function sectorConstituentSortValue(row: SectorConstituentRow, key: SectorConstituentSortKey): unknown {
  switch (key) {
    case 'symbol': return row.symbol;
    case 'company': return row.companyName;
    case 'price': return row.latestPrice;
    case 'return1W': return row.return1W;
    case 'return1M': return row.return1M;
    case 'signal': return row.signalDirection;
    case 'score': return row.signalScore;
  }
}

/** Constituents sub-table shown inside expanded sector row. */
function SectorConstituentsTable({
  sector,
  data,
  loading,
  error,
}: {
  sector: string;
  data: SectorConstituentsEnvelope | null;
  loading: boolean;
  error: string | null;
}) {
  const { profile } = useMarketScope();
  const { sortKey, sortDirection, handleSort } = useTableSort<SectorConstituentSortKey>(null, 'desc');
  if (loading) return <Stack spacing={1}><LinearProgress sx={{ mx: 1 }} /><Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>Loading constituents for {indexLabel(sector)}…</Typography></Stack>;
  if (error) return <Alert severity="error" sx={{ mx: 0 }}>{error}</Alert>;
  if (!data) return null;
  if (data.availability !== 'READY' || data.constituents.length === 0) {
    return <Alert severity="info" sx={{ mx: 0 }}>{data.message || `No constituent stocks found for ${indexLabel(sector)}.`}</Alert>;
  }

  const sortedConstituents = sortRows(data.constituents, sortKey, sortDirection, sectorConstituentSortValue);
  const sortable = (label: ReactNode, columnKey: SectorConstituentSortKey, align?: 'left' | 'center' | 'right') => (
    <SortableTableCell label={label} columnKey={columnKey} activeKey={sortKey} direction={sortDirection} onSort={handleSort} align={align} />
  );

  return (
    <Stack spacing={0.75}>
      <Typography variant="caption" color="text.secondary">
        {data.count} constituent stock{data.count !== 1 ? 's' : ''} — top by market cap, stored data
      </Typography>
      {data.warnings.map((w) => <Alert key={w} severity="warning" sx={{ py: 0 }}><Typography variant="caption">{w}</Typography></Alert>)}
      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 340, overflowY: 'auto' }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              {sortable('Symbol', 'symbol')}
              {sortable('Company', 'company')}
              {sortable('Price', 'price', 'right')}
              {sortable('1W %', 'return1W', 'right')}
              {sortable('1M %', 'return1M', 'right')}
              {sortable('Signal', 'signal')}
              {sortable('Score', 'score', 'right')}
              <TableCell>Workspace</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedConstituents.map((row: SectorConstituentRow) => (
              <TableRow key={row.instrumentId} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>{row.symbol}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" noWrap sx={{ maxWidth: 180 }}>{row.companyName ?? '—'}</Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2">{row.latestPrice !== null ? money(row.latestPrice, profile.currency, { fractionDigits: 2 }) : '—'}</Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" color={row.return1W !== null ? changeColor(row.return1W) : 'text.secondary'}>
                    {row.return1W !== null ? formatPercentPoints(row.return1W) : '—'}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" color={row.return1M !== null ? changeColor(row.return1M) : 'text.secondary'}>
                    {row.return1M !== null ? formatPercentPoints(row.return1M) : '—'}
                  </Typography>
                </TableCell>
                <TableCell>
                  {row.signalDirection
                    ? <Chip label={humanizeCode(row.signalDirection)} size="small" color={row.signalDirection === 'BULLISH' ? 'success' : row.signalDirection === 'BEARISH' ? 'error' : 'default'} variant="outlined" />
                    : <Typography variant="body2" color="text.secondary">—</Typography>}
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2">{row.signalScore !== null ? row.signalScore.toFixed(1) : '—'}</Typography>
                </TableCell>
                <TableCell>
                  <Button
                    size="small"
                    component={RouterLink}
                    to={`/instrument-workspace/${encodeURIComponent(row.symbol)}`}
                    variant="text"
                    sx={{ minWidth: 0, px: 0.75 }}
                  >
                    Open
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// SectorIntelligencePanel (exported)
// ---------------------------------------------------------------------------

type SectorSortKey = 'sector' | 'classification' | 'sectorScore' | 'return1W' | 'return1M' | 'return3M';

function sectorSortValue(row: SectorIntelligenceSnapshot, key: SectorSortKey): unknown {
  switch (key) {
    case 'sector': return row.sector;
    case 'classification': return row.classification;
    case 'sectorScore': return row.sectorScore;
    case 'return1W': return row.return1W;
    case 'return1M': return row.return1M;
    case 'return3M': return row.return3M;
  }
}

export function SectorIntelligencePanel({
  envelope,
  loading,
  error,
}: {
  envelope: SnapshotEnvelope<SectorIntelligenceSnapshot[]> | null;
  loading: boolean;
  error: string | null;
}) {
  const { scope } = useMarketScope();
  const rows = envelope?.snapshot ?? [];

  const [sectorPage, setSectorPage] = useState(0);
  const [sectorRowsPerPage, setSectorRowsPerPage] = useState(5);
  const { sortKey, sortDirection, handleSort } = useTableSort<SectorSortKey>(null, 'desc', () => setSectorPage(0));

  // Default (no active sort) preserves the upstream ordering; a column click sorts client-side.
  const sortedRows = sortRows(rows, sortKey, sortDirection, sectorSortValue);
  const pagedRows = sortedRows.slice(sectorPage * sectorRowsPerPage, sectorPage * sectorRowsPerPage + sectorRowsPerPage);
  const sortable = (label: ReactNode, columnKey: SectorSortKey, align?: 'left' | 'center' | 'right') => (
    <SortableTableCell label={label} columnKey={columnKey} activeKey={sortKey} direction={sortDirection} onSort={handleSort} align={align} />
  );

  return (
    <SectionPanel
      title="Sector Intelligence"
    >
      <Stack spacing={1.25}>
        {loading && <LinearProgress />}
        {error && <Alert severity="error">{error}</Alert>}
        {!loading && !error && envelope?.warnings.map((warning) => <Alert key={warning} severity="warning">{humanizeCode(warning)}</Alert>)}
        {!loading && !error && rows.length === 0 && (
          <EmptyState title="No sector data saved for this scope/date." message={envelope?.message || 'No Sector Intelligence data is available for this scope yet.'} />
        )}
        {rows.length > 0 && (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {/* expand toggle column */}
                  <TableCell padding="checkbox" />
                  {sortable('Sector', 'sector')}
                  {sortable('Classification', 'classification')}
                  {sortable('Sector Score', 'sectorScore', 'right')}
                  {sortable('1W', 'return1W', 'right')}
                  {sortable('1M', 'return1M', 'right')}
                  {sortable('3M', 'return3M', 'right')}
                  <TableCell>Reasons</TableCell>
                  <TableCell>Warnings</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pagedRows.map((row) => (
                  <SectorRowWithDrillDown
                    key={row.sector}
                    row={row}
                    region={scope.region}
                    assetType={scope.assetType}
                  />
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TablePagination
                    rowsPerPageOptions={[5, 10, 25]}
                    count={rows.length}
                    rowsPerPage={sectorRowsPerPage}
                    page={sectorPage}
                    onPageChange={(_event, newPage) => setSectorPage(newPage)}
                    onRowsPerPageChange={(event) => {
                      setSectorRowsPerPage(parseInt(event.target.value, 10));
                      setSectorPage(0);
                    }}
                  />
                </TableRow>
              </TableFooter>
            </Table>
          </TableContainer>
        )}
      </Stack>
    </SectionPanel>
  );
}
