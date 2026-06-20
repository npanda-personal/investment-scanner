import ClearIcon from '@mui/icons-material/Clear';
import DownloadIcon from '@mui/icons-material/Download';
import SearchIcon from '@mui/icons-material/Search';
import {
  Alert,
  Box,
  Button,
  FormControl,
  FormControlLabel,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMarketScope } from '@/contexts/MarketScopeContext';
import type { TodayReviewCandidate, TodayReviewGroups, TodayReviewRun } from '../types';
import { buildCandidateColumns, downloadTodayReviewCsv } from './todayReviewColumns';
import {
  compareValues,
  dataQualityLabel,
  hasMissingTierContext,
  sourceSnapshotForRun,
  stateLabel,
  symbolSearchText,
  tierContextForCandidate,
  type SortDirection,
  type SortKey,
} from './todayReviewTableFormat';

export function CandidateTable({ candidates, run, activeTab }: { candidates: TodayReviewCandidate[]; run: TodayReviewRun | null; activeTab?: keyof TodayReviewGroups }) {
  const navigate = useNavigate();
  const { profile } = useMarketScope();
  const runRegime: string | null = run ? ((sourceSnapshotForRun(run) as any).marketContext?.regime?.regime ?? null) : null;
  const [query, setQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState('ALL');
  const [stateFilter, setStateFilter] = useState('ALL');
  const [readinessFilter, setReadinessFilter] = useState('ALL');
  const [dataQualityFilter, setDataQualityFilter] = useState('ALL');
  const [excludeFnoBan, setExcludeFnoBan] = useState(false);
  const [smartMoneyAccumulationOnly, setSmartMoneyAccumulationOnly] = useState(false);
  const [earningsSoonOnly, setEarningsSoonOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>('rank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [showSecondaryColumns, setShowSecondaryColumns] = useState(false);
  const candidateKey = useMemo(() => candidates.map((candidate) => candidate.id).join('|'), [candidates]);

  useEffect(() => {
    setPage(0);
  }, [candidateKey]);

  const filterOptions = useMemo(() => {
    const grades = Array.from(new Set(candidates.map((candidate) => candidate.grade))).sort();
    const states = Array.from(new Set(candidates.map((candidate) => candidate.state))).sort();
    const dataQuality = Array.from(new Set(candidates.map((candidate) => dataQualityLabel(candidate)))).sort();
    return { grades, states, dataQuality };
  }, [candidates]);

  const filteredCandidates = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return candidates.filter((candidate) => {
      const context = tierContextForCandidate(candidate);
      const matchesQuery = !normalizedQuery || symbolSearchText(candidate).includes(normalizedQuery);
      const matchesGrade = gradeFilter === 'ALL' || candidate.grade === gradeFilter;
      const matchesState = stateFilter === 'ALL' || candidate.state === stateFilter;
      const matchesReadiness = readinessFilter === 'ALL' || context.dailyReview.status === readinessFilter;
      const matchesDataQuality = dataQualityFilter === 'ALL' || dataQualityLabel(candidate) === dataQualityFilter;
      const matchesFnoBan = !excludeFnoBan || !candidate.inFnoBan;
      const matchesSmartMoney = !smartMoneyAccumulationOnly || candidate.smartMoneyStatus === 'ACCUMULATION';
      const matchesEarnings = !earningsSoonOnly
        || Boolean(candidate.earningsProximity && candidate.earningsProximity.daysToResult !== null);
      return matchesQuery && matchesGrade && matchesState && matchesReadiness && matchesDataQuality
        && matchesFnoBan && matchesSmartMoney && matchesEarnings;
    });
  }, [
    candidates,
    dataQualityFilter,
    earningsSoonOnly,
    excludeFnoBan,
    gradeFilter,
    query,
    readinessFilter,
    smartMoneyAccumulationOnly,
    stateFilter,
  ]);

  const allColumns = useMemo(() => buildCandidateColumns(runRegime, profile.currency, activeTab), [runRegime, profile.currency, activeTab]);

  const columns = useMemo(
    () => allColumns.filter((col) => col.primary || showSecondaryColumns),
    [allColumns, showSecondaryColumns]
  );

  const tableMinWidth = useMemo(() => columns.reduce((total, column) => total + column.width, 0), [columns]);

  const sortedCandidates = useMemo(() => {
    const column = allColumns.find((item) => item.id === sortBy) || allColumns[0];
    return [...filteredCandidates].sort((a, b) => compareValues(column.value(a), column.value(b), sortDirection));
  }, [allColumns, filteredCandidates, sortBy, sortDirection]);

  const pagedCandidates = useMemo(() => {
    const start = page * pageSize;
    return sortedCandidates.slice(start, start + pageSize);
  }, [page, pageSize, sortedCandidates]);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(filteredCandidates.length / pageSize) - 1);
    if (page > maxPage) setPage(maxPage);
  }, [filteredCandidates.length, page, pageSize]);

  const hasFilters = Boolean(
    query
    || gradeFilter !== 'ALL'
    || stateFilter !== 'ALL'
    || readinessFilter !== 'ALL'
    || dataQualityFilter !== 'ALL'
    || excludeFnoBan
    || smartMoneyAccumulationOnly
    || earningsSoonOnly
  );

  const handleSort = (columnId: SortKey) => {
    setPage(0);
    if (sortBy === columnId) {
      setSortDirection((current) => current === 'asc' ? 'desc' : 'asc');
      return;
    }
    setSortBy(columnId);
    setSortDirection(columnId === 'rank' ? 'asc' : 'desc');
  };

  const clearFilters = () => {
    setQuery('');
    setGradeFilter('ALL');
    setStateFilter('ALL');
    setReadinessFilter('ALL');
    setDataQualityFilter('ALL');
    setExcludeFnoBan(false);
    setSmartMoneyAccumulationOnly(false);
    setEarningsSoonOnly(false);
    setPage(0);
    setActionMessage(null);
  };

  const exportTable = () => {
    downloadTodayReviewCsv(sortedCandidates, 'current-table');
    setActionMessage(`Exported ${sortedCandidates.length} rows as CSV.`);
  };

  const missingTierCount = useMemo(() => candidates.filter(hasMissingTierContext).length, [candidates]);

  return (
    <Stack spacing={1.5}>
      {actionMessage && <Alert severity="success">{actionMessage}</Alert>}
      {missingTierCount > 0 && (
        <Alert severity="info">
          {missingTierCount} of {candidates.length} candidates in this view are missing data-quality tier context — read their confidence scores with that caveat. This is a data-pipeline limitation, not a per-stock judgement, and does not affect ranking.
        </Alert>
      )}

      {/* Row 1: single symbol/company search + structured dropdowns (no other free-text inputs) */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'minmax(220px, 1.4fr) repeat(4, minmax(140px, 0.6fr))' },
          gap: 1.25,
          alignItems: 'center',
        }}
      >
        <TextField
          label="Search symbol / company"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(0);
          }}
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        <FormControl size="small">
          <InputLabel id="today-review-grade-filter-label">Grade</InputLabel>
          <Select
            labelId="today-review-grade-filter-label"
            value={gradeFilter}
            label="Grade"
            onChange={(event) => {
              setGradeFilter(event.target.value);
              setPage(0);
            }}
          >
            <MenuItem value="ALL">All grades</MenuItem>
            {filterOptions.grades.map((grade) => <MenuItem key={grade} value={grade}>{grade}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small">
          <InputLabel id="today-review-state-filter-label">Direction / State</InputLabel>
          <Select
            labelId="today-review-state-filter-label"
            value={stateFilter}
            label="Direction / State"
            onChange={(event) => {
              setStateFilter(event.target.value);
              setPage(0);
            }}
          >
            <MenuItem value="ALL">All states</MenuItem>
            {filterOptions.states.map((state) => <MenuItem key={state} value={state}>{stateLabel(state)}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small">
          <InputLabel id="today-review-readiness-filter-label">Daily tier</InputLabel>
          <Select
            labelId="today-review-readiness-filter-label"
            value={readinessFilter}
            label="Daily tier"
            onChange={(event) => {
              setReadinessFilter(event.target.value);
              setPage(0);
            }}
          >
            <MenuItem value="ALL">All daily tiers</MenuItem>
            <MenuItem value="READY">READY</MenuItem>
            <MenuItem value="LIMITED">LIMITED</MenuItem>
            <MenuItem value="BLOCKED">BLOCKED</MenuItem>
            <MenuItem value="MISSING">MISSING</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small">
          <InputLabel id="today-review-dq-filter-label">Data quality</InputLabel>
          <Select
            labelId="today-review-dq-filter-label"
            value={dataQualityFilter}
            label="Data quality"
            onChange={(event) => {
              setDataQualityFilter(event.target.value);
              setPage(0);
            }}
          >
            <MenuItem value="ALL">All DQ states</MenuItem>
            {filterOptions.dataQuality.map((status) => <MenuItem key={status} value={status}>{status}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>

      {/* Row 2: toggle filters (left) + table actions (right) — no input boxes */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', md: 'center' }}
      >
        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
          <FormControlLabel
            control={<Switch size="small" checked={excludeFnoBan} onChange={(event) => { setExcludeFnoBan(event.target.checked); setPage(0); }} />}
            label="Exclude F&O ban"
            slotProps={{ typography: { variant: 'body2' } }}
          />
          <FormControlLabel
            control={<Switch size="small" checked={smartMoneyAccumulationOnly} onChange={(event) => { setSmartMoneyAccumulationOnly(event.target.checked); setPage(0); }} />}
            label="Smart-money accumulation"
            slotProps={{ typography: { variant: 'body2' } }}
          />
          <FormControlLabel
            control={<Switch size="small" checked={earningsSoonOnly} onChange={(event) => { setEarningsSoonOnly(event.target.checked); setPage(0); }} />}
            label="Earnings soon"
            slotProps={{ typography: { variant: 'body2' } }}
          />
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title="Clear filters" arrow>
            <span>
              <IconButton
                aria-label="Clear table filters"
                onClick={clearFilters}
                disabled={!hasFilters}
                size="small"
              >
                <ClearIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Button
            variant={showSecondaryColumns ? 'contained' : 'outlined'}
            size="small"
            onClick={() => setShowSecondaryColumns((prev) => !prev)}
            sx={{ whiteSpace: 'nowrap' }}
          >
            {showSecondaryColumns ? 'Fewer columns' : 'More columns'}
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<DownloadIcon />}
            onClick={exportTable}
            disabled={sortedCandidates.length === 0}
            sx={{ whiteSpace: 'nowrap' }}
          >
            Export CSV
          </Button>
        </Stack>
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
        <Typography variant="caption" color="text.secondary">
          Showing {filteredCandidates.length === 0 ? 0 : page * pageSize + 1}–{Math.min((page + 1) * pageSize, filteredCandidates.length)} of {filteredCandidates.length} candidates.
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Click any row to open detail. Hover clipped cells for full text.
        </Typography>
      </Stack>

      <TableContainer
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          maxHeight: 620,
          overflowX: 'auto',
          '& .MuiTableCell-root': {
            whiteSpace: 'nowrap',
          },
        }}
      >
        <Table
          stickyHeader
          size="small"
          aria-label="Today review candidates"
          sx={{
            tableLayout: 'fixed',
            minWidth: tableMinWidth,
            '& .MuiTableCell-head': {
              bgcolor: 'background.paper',
              borderBottom: '1px solid',
              borderColor: 'divider',
              color: 'text.secondary',
              fontSize: 12,
              fontWeight: 700,
              lineHeight: 1.2,
              py: 1,
            },
            '& .MuiTableCell-body': {
              fontSize: 13,
              py: 0.85,
              verticalAlign: 'middle',
            },
            '& .MuiTableBody-root .MuiTableRow-root:nth-of-type(even)': {
              bgcolor: 'action.hover',
            },
          }}
        >
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell key={column.id} align={column.align} sx={{ width: column.width }}>
                  <TableSortLabel
                    active={sortBy === column.id}
                    direction={sortBy === column.id ? sortDirection : 'asc'}
                    onClick={() => handleSort(column.id)}
                  >
                    {column.label}
                  </TableSortLabel>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {pagedCandidates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} sx={{ py: 4, textAlign: 'center' }}>
                  <Typography color="text.secondary">No candidates match the current filters.</Typography>
                </TableCell>
              </TableRow>
            ) : pagedCandidates.map((candidate) => (
              <TableRow
                key={candidate.id}
                hover
                onClick={() => navigate(`/today-review/candidates/${candidate.id}`)}
                sx={{ cursor: 'pointer' }}
              >
                {columns.map((column) => (
                  <TableCell key={column.id} align={column.align}>{column.render(candidate)}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={filteredCandidates.length}
        page={page}
        rowsPerPage={pageSize}
        rowsPerPageOptions={[5, 10, 25, 50]}
        onPageChange={(_event, nextPage) => setPage(nextPage)}
        onRowsPerPageChange={(event) => {
          setPageSize(Number(event.target.value));
          setPage(0);
        }}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          '.MuiTablePagination-toolbar': {
            minHeight: 44,
          },
        }}
      />
    </Stack>
  );
}
