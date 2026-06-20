import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Tooltip,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FreshnessChip, PageHeader } from '@/shared/components';
import { humanizeEmbedded, indexLabel } from '@/shared/format/enumLabels';
import { useMarketScope } from '@/contexts/MarketScopeContext';
import { NotApplicableForAssetClass } from '@/shared/components/NotApplicableForAssetClass';
import { fetchSectorRotation } from '../api/marketIntelligenceService';
import type { RotationQuadrant, SectorRotationEnvelope, SectorRotationRow } from '../types';

// ─── Quadrant metadata ──────────────────────────────────────────────────────

interface QuadrantMeta {
  label: string;
  description: string;
  color: 'success' | 'info' | 'warning' | 'error';
  chipColor: 'success' | 'info' | 'warning' | 'error' | 'default';
  bgColor: string;
}

const QUADRANT_META: Record<RotationQuadrant, QuadrantMeta> = {
  LEADING: {
    label: 'Leading',
    description: 'Strong relative strength + positive momentum. Money is here and continuing to flow in.',
    color: 'success',
    chipColor: 'success',
    bgColor: 'rgba(76,175,80,0.08)',
  },
  IMPROVING: {
    label: 'Improving',
    description: 'Weak relative strength + positive momentum. Money is rotating INTO this sector.',
    color: 'info',
    chipColor: 'info',
    bgColor: 'rgba(33,150,243,0.08)',
  },
  WEAKENING: {
    label: 'Weakening',
    description: 'Strong relative strength + fading momentum. Sector is strong but rotating OUT.',
    color: 'warning',
    chipColor: 'warning',
    bgColor: 'rgba(255,152,0,0.08)',
  },
  LAGGING: {
    label: 'Lagging',
    description: 'Weak relative strength + negative momentum. Money is leaving.',
    color: 'error',
    chipColor: 'error',
    bgColor: 'rgba(244,67,54,0.08)',
  },
};

// ─── Quadrant chip ───────────────────────────────────────────────────────────

function QuadrantChip({ quadrant }: { quadrant: RotationQuadrant }) {
  const meta = QUADRANT_META[quadrant];
  return (
    <Tooltip title={meta.description} arrow>
      <Chip
        label={meta.label}
        color={meta.chipColor}
        variant="outlined"
        size="small"
        sx={{ fontWeight: 700, minWidth: 76 }}
      />
    </Tooltip>
  );
}

// ─── Quadrant panel ──────────────────────────────────────────────────────────

function QuadrantPanel({
  quadrant,
  sectors,
}: {
  quadrant: RotationQuadrant;
  sectors: SectorRotationRow[];
}) {
  const meta = QUADRANT_META[quadrant];
  const navigate = useNavigate();

  return (
    <Paper
      variant="outlined"
      sx={{ p: 2, bgcolor: meta.bgColor, flex: '1 1 220px', minWidth: 180 }}
    >
      <Stack spacing={1}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="subtitle2" fontWeight={700}>
            {meta.label}
          </Typography>
          <Chip
            label={sectors.length}
            color={meta.chipColor}
            size="small"
            sx={{ fontWeight: 700, minWidth: 28 }}
          />
        </Stack>
        <Typography variant="caption" color="text.secondary">
          {meta.description}
        </Typography>
        {sectors.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            No sectors in this quadrant.
          </Typography>
        ) : (
          <Stack direction="row" gap={0.75} flexWrap="wrap" useFlexGap>
            {sectors.map((row) => (
              <Chip
                key={row.sector}
                label={indexLabel(row.sector)}
                color={meta.chipColor}
                variant="filled"
                size="small"
                onClick={() =>
                  navigate(`/signals?sector=${encodeURIComponent(row.sector)}`)
                }
                sx={{ cursor: 'pointer', fontWeight: 600 }}
                title={`View signals for ${indexLabel(row.sector)} — ${meta.label}`}
              />
            ))}
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}

// ─── Sort helpers ────────────────────────────────────────────────────────────

type SortKey = 'sector' | 'sectorScore' | 'return1W' | 'return1M' | 'return3M' | 'rotationQuadrant';

function compareRows(a: SectorRotationRow, b: SectorRotationRow, key: SortKey, dir: 'asc' | 'desc'): number {
  let val: number;
  if (key === 'sector') {
    val = indexLabel(a.sector).localeCompare(indexLabel(b.sector));
  } else if (key === 'rotationQuadrant') {
    const order: Record<RotationQuadrant, number> = { LEADING: 0, IMPROVING: 1, WEAKENING: 2, LAGGING: 3 };
    val = order[a.rotationQuadrant] - order[b.rotationQuadrant];
  } else {
    const av = a[key] ?? -Infinity;
    const bv = b[key] ?? -Infinity;
    val = (av as number) - (bv as number);
  }
  return dir === 'asc' ? val : -val;
}

function formatPct(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

function pctColor(value: number | null | undefined): 'success.main' | 'error.main' | 'text.secondary' {
  if (value === null || value === undefined) return 'text.secondary';
  return value >= 0 ? 'success.main' : 'error.main';
}

// ─── Rotation table ──────────────────────────────────────────────────────────

function SectorRotationTable({ sectors }: { sectors: SectorRotationRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('rotationQuadrant');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Reset to page 0 whenever the sectors list changes (scope/filter change)
  useEffect(() => {
    setPage(0);
  }, [sectors]);

  const handleSort = (key: SortKey) => {
    setPage(0);
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'sector' || key === 'rotationQuadrant' ? 'asc' : 'desc');
    }
  };

  const handleChangePage = (_event: React.MouseEvent<HTMLButtonElement> | null, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const sorted = [...sectors].sort((a, b) => compareRows(a, b, sortKey, sortDir));
  const pageRows = sorted.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const col = (key: SortKey, label: string, align: 'left' | 'right' = 'right') => (
    <TableCell align={align} sortDirection={sortKey === key ? sortDir : false}>
      <TableSortLabel
        active={sortKey === key}
        direction={sortKey === key ? sortDir : 'asc'}
        onClick={() => handleSort(key)}
      >
        {label}
      </TableSortLabel>
    </TableCell>
  );

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            {col('sector', 'Sector', 'left')}
            {col('rotationQuadrant', 'Quadrant', 'left')}
            {col('sectorScore', 'Score', 'right')}
            {col('return1W', '1W %', 'right')}
            {col('return1M', '1M %', 'right')}
            {col('return3M', '3M %', 'right')}
          </TableRow>
        </TableHead>
        <TableBody>
          {pageRows.map((row) => (
            <TableRow key={row.sector} hover>
              <TableCell>
                <Typography
                  variant="body2"
                  fontWeight={600}
                  sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                  onClick={() =>
                    window.open(`/signals?sector=${encodeURIComponent(row.sector)}`, '_self')
                  }
                >
                  {indexLabel(row.sector)}
                </Typography>
              </TableCell>
              <TableCell>
                <QuadrantChip quadrant={row.rotationQuadrant} />
              </TableCell>
              <TableCell align="right">
                <Tooltip title="Sector strength score (0–100). Relative-strength proxy." arrow>
                  {row.sectorScore !== null ? (
                    <Chip
                      label={`${row.sectorScore}/100`}
                      color={row.sectorScore >= 60 ? 'success' : row.sectorScore < 40 ? 'error' : 'default'}
                      variant="outlined"
                      size="small"
                      sx={{ fontWeight: 600, minWidth: 52 }}
                    />
                  ) : (
                    <Typography variant="body2" color="text.secondary">—</Typography>
                  )}
                </Tooltip>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2" color={pctColor(row.return1W)}>
                  {formatPct(row.return1W)}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2" color={pctColor(row.return1M)} fontWeight={600}>
                  {formatPct(row.return1M)}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2" color={pctColor(row.return3M)}>
                  {formatPct(row.return3M)}
                </Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <TablePagination
        component="div"
        count={sorted.length}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[10, 25, 50]}
      />
    </TableContainer>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export function SectorRotationPage() {
  const { scope, profile } = useMarketScope();
  const [data, setData] = useState<SectorRotationEnvelope | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchSectorRotation(scope)
      .then((result) => {
        setData(result);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load sector rotation data.');
        setLoading(false);
      });
  }, [scope]);

  useEffect(() => {
    load();
  }, [load]);

  const sectors = data?.sectors ?? [];
  const quadrants: RotationQuadrant[] = ['LEADING', 'IMPROVING', 'WEAKENING', 'LAGGING'];
  const [warningsExpanded, setWarningsExpanded] = useState(false);

  if (!profile.capabilities.hasSectors) {
    return (
      <Box className="page-container page-container--hub">
        <PageHeader
          title="Sector Rotation"
          subtitle="Which sectors are money rotating into vs out of?"
        />
        <NotApplicableForAssetClass feature="Sector rotation" />
      </Box>
    );
  }

  return (
    <Box className="page-container page-container--hub">
      <PageHeader
        title="Sector Rotation"
        subtitle="Which sectors are money rotating into vs out of? Derived from saved sector intelligence data using relative strength score and 1M momentum."
        badges={
          data ? (
            <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap>
              <Chip
                label={`${data.scope.region} / ${data.scope.assetType}`}
                color="primary"
                variant="outlined"
                size="small"
              />
              {data.dataThroughDate && (
                <FreshnessChip dataThrough={data.dataThroughDate} label="Sector data" />
              )}
            </Stack>
          ) : undefined
        }
      />

      {loading && <LinearProgress sx={{ mb: 2 }} />}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!loading && !error && data && data.warnings.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Button
            size="small"
            variant="text"
            onClick={() => setWarningsExpanded((prev) => !prev)}
            startIcon={warningsExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            sx={{ alignSelf: 'flex-start', mb: 0.5 }}
          >
            Data status
          </Button>
          <Collapse in={warningsExpanded} unmountOnExit>
            <Stack spacing={1}>
              {data.warnings.map((w) => (
                <Alert key={w} severity="warning">
                  {humanizeEmbedded(w)}
                </Alert>
              ))}
            </Stack>
          </Collapse>
        </Box>
      )}

      {!loading && !error && data && data.availability !== 'READY' && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Stack spacing={0.5}>
            <Typography fontWeight={700}>Sector rotation data not available.</Typography>
            <Typography variant="body2">{data.message}</Typography>
            <Typography variant="body2">
              Run the Sector Intelligence refresh pipeline from Pipeline Ops to materialise sector snapshots.
            </Typography>
          </Stack>
        </Alert>
      )}

      {!loading && !error && data && data.availability === 'READY' && (
        <Stack spacing={3}>
          {/* ── Quadrant map ── */}
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack spacing={1.5}>
              <Typography variant="h6" fontWeight={700}>
                Rotation Map
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Quadrant = Relative Strength (sector score) vs. Momentum (1M return).
                Click any sector chip to open the signal screener filtered by that sector.
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {quadrants.map((q) => (
                  <QuadrantPanel
                    key={q}
                    quadrant={q}
                    sectors={sectors.filter((s) => s.rotationQuadrant === q)}
                  />
                ))}
              </Box>
            </Stack>
          </Paper>

          {/* ── Sortable table ── */}
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="h6" fontWeight={700}>
                  All Sectors
                </Typography>
                <Chip label={`${sectors.length} sectors`} size="small" variant="outlined" />
              </Stack>
              <Typography variant="body2" color="text.secondary">
                Click column headers to sort. 1M % is the momentum axis; Score is the relative-strength axis.
                Sectors with null 1M return are classified by score only.
              </Typography>
              <SectorRotationTable sectors={sectors} />
            </Stack>
          </Paper>
        </Stack>
      )}
    </Box>
  );
}
