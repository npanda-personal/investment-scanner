/**
 * InstrumentPriceChart — candlestick + volume + overlays in a main chart, with
 * oscillator indicators (RSI, Stoch RSI) rendered in dedicated sub-pane charts
 * stacked below. Timeframe toggle (1D / 1W / 1M) aggregates daily bars client-side.
 *
 * Add new indicators by registering them in shared/indicators/registry.ts — no
 * changes needed to this component.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  CircularProgress,
  Link,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useTheme,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  createChart,
  ColorType,
  CrosshairMode,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type SeriesType,
  type LogicalRange,
  type MouseEventParams,
} from 'lightweight-charts';
import { fetchInstrumentPrices } from '@/features/market-data-foundation/api/marketDataFoundationService';
import IndicatorToolbar from '@/shared/indicators/IndicatorToolbar';
import { DEFAULT_INDICATORS, INDICATOR_REGISTRY } from '@/shared/indicators/registry';
import type { IndicatorId, OHLCVBar } from '@/shared/indicators/types';
import { aggregateBars, type ChartTimeframe } from '@/shared/indicators/calculations/aggregation';

interface InstrumentPriceChartProps {
  instrumentId?: string;
  region?: string;
  assetType?: string;
  tvSymbol?: string;
  height?: number | string | Record<string, number | string>;
}

const UP = '#26a69a';
const DOWN = '#ef5350';
const OSC_HEIGHT = 120;
const INDICATOR_STORAGE_KEY = 'chart_active_indicators';
const TIMEFRAME_STORAGE_KEY = 'chart_timeframe';

export default function InstrumentPriceChart({
  instrumentId,
  region,
  assetType,
  tvSymbol,
  height = 620,
}: InstrumentPriceChartProps) {
  const theme = useTheme();
  const mainContainerRef = useRef<HTMLDivElement | null>(null);
  const mainChartRef = useRef<IChartApi | null>(null);
  const oscContainerRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const oscChartRefs = useRef<Map<string, IChartApi>>(new Map());
  const syncing = useRef(false);
  const crosshairSyncing = useRef(false);

  const [candles, setCandles] = useState<OHLCVBar[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeIndicatorIds, setActiveIndicatorIds] = useState<IndicatorId[]>(() => {
    try {
      const stored = localStorage.getItem(INDICATOR_STORAGE_KEY);
      if (!stored) return DEFAULT_INDICATORS;
      const ids = JSON.parse(stored);
      return Array.isArray(ids) ? ids.filter((id: string) => id in INDICATOR_REGISTRY) : DEFAULT_INDICATORS;
    } catch { return DEFAULT_INDICATORS; }
  });
  const [timeframe, setTimeframe] = useState<ChartTimeframe>(() => {
    try {
      const stored = localStorage.getItem(TIMEFRAME_STORAGE_KEY);
      return stored === '1W' || stored === '1M' ? stored : '1D';
    } catch { return '1D'; }
  });

  useEffect(() => {
    try { localStorage.setItem(INDICATOR_STORAGE_KEY, JSON.stringify(activeIndicatorIds)); } catch { /* private browsing */ }
  }, [activeIndicatorIds]);

  useEffect(() => {
    try { localStorage.setItem(TIMEFRAME_STORAGE_KEY, timeframe); } catch { /* private browsing */ }
  }, [timeframe]);

  const displayBars = useMemo(
    () => (candles ? aggregateBars(candles, timeframe) : null),
    [candles, timeframe],
  );

  const activeOverlay = useMemo(
    () => activeIndicatorIds.map((id) => INDICATOR_REGISTRY[id]).filter((d) => d?.pane === 'overlay'),
    [activeIndicatorIds],
  );
  const activeOscillators = useMemo(
    () => activeIndicatorIds.map((id) => INDICATOR_REGISTRY[id]).filter((d) => d?.pane === 'oscillator'),
    [activeIndicatorIds],
  );

  const oscRefCallbacks = useRef<Map<string, (el: HTMLDivElement | null) => void>>(new Map());
  const oscRefCallback = useCallback((id: string) => {
    let cb = oscRefCallbacks.current.get(id);
    if (!cb) {
      cb = (el: HTMLDivElement | null) => {
        if (el) oscContainerRefs.current.set(id, el);
        else oscContainerRefs.current.delete(id);
      };
      oscRefCallbacks.current.set(id, cb);
    }
    return cb;
  }, []);

  // Fetch persisted OHLC
  useEffect(() => {
    if (!instrumentId) { setCandles([]); return; }
    let cancelled = false;
    setCandles(null);
    setError(null);
    fetchInstrumentPrices(instrumentId, 500, { region, assetType })
      .then((res) => {
        if (cancelled) return;
        const seen = new Set<string>();
        const rows = (res.prices ?? [])
          .filter((p) => [p.open, p.high, p.low, p.close].every((v) => Number.isFinite(v)))
          .map((p) => ({
            time: String(p.date).slice(0, 10),
            open: p.open as number,
            high: p.high as number,
            low: p.low as number,
            close: p.close,
            volume: p.volume ?? null,
          }))
          .filter((c) => (seen.has(c.time) ? false : (seen.add(c.time), true)))
          .sort((a, b) => (a.time < b.time ? -1 : 1));
        setCandles(rows);
      })
      .catch(() => { if (!cancelled) setError('Unable to load price history for this instrument.'); });
    return () => { cancelled = true; };
  }, [instrumentId, region, assetType]);

  // Build all charts
  useEffect(() => {
    const mainEl = mainContainerRef.current;
    if (!mainEl || !displayBars || displayBars.length === 0) return;

    const chartOpts = {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid as const, color: 'transparent' },
        textColor: theme.palette.text.secondary,
        fontFamily: theme.typography.fontFamily,
      },
      grid: {
        vertLines: { color: theme.palette.divider },
        horzLines: { color: theme.palette.divider },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: theme.palette.divider },
    };

    // ── Main chart ──────────────────────────────────────────────────────────
    const mainChart = createChart(mainEl, {
      ...chartOpts,
      timeScale: {
        borderColor: theme.palette.divider,
        timeVisible: false,
        rightOffset: 6,
        visible: activeOscillators.length === 0,
      },
    });
    mainChartRef.current = mainChart;

    const candleSeries = mainChart.addCandlestickSeries({
      upColor: UP, downColor: DOWN, borderVisible: false,
      wickUpColor: UP, wickDownColor: DOWN,
    });
    candleSeries.setData(
      displayBars.map((c) => ({ time: c.time, open: c.open, high: c.high, low: c.low, close: c.close })),
    );

    const volSeries = mainChart.addHistogramSeries({ priceFormat: { type: 'volume' }, priceScaleId: 'vol' });
    mainChart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    volSeries.setData(
      displayBars
        .filter((c) => c.volume != null)
        .map((c) => ({
          time: c.time,
          value: c.volume as number,
          color: c.close >= c.open ? `${UP}66` : `${DOWN}66`,
        })),
    );

    // Overlay indicators
    for (const def of activeOverlay) {
      const result = def.calculate(displayBars);
      for (const s of result.series) {
        const series = mainChart.addLineSeries({
          color: s.color,
          lineWidth: s.lineWidth ?? 1,
          lineStyle: s.dashed ? LineStyle.Dashed : LineStyle.Solid,
          title: s.label,
          priceLineVisible: false,
          lastValueVisible: true,
          crosshairMarkerVisible: false,
        });
        series.setData(s.data);
      }
    }

    mainChart.timeScale().fitContent();

    // ── Oscillator charts ───────────────────────────────────────────────────
    type ChartPair = [IChartApi, ISeriesApi<SeriesType>];
    const chartPairs: ChartPair[] = [[mainChart, candleSeries]];
    const oscCharts: IChartApi[] = [];

    activeOscillators.forEach((def, oscIdx) => {
      const el = oscContainerRefs.current.get(def.id);
      if (!el) return;

      const isLast = oscIdx === activeOscillators.length - 1;
      const oscChart = createChart(el, {
        ...chartOpts,
        timeScale: {
          borderColor: theme.palette.divider,
          timeVisible: false,
          rightOffset: 6,
          visible: isLast,
        },
      });
      oscCharts.push(oscChart);
      oscChartRefs.current.set(def.id, oscChart);

      const result = def.calculate(displayBars);

      for (const ref of result.referenceLevels ?? []) {
        const refLine = oscChart.addLineSeries({
          color: ref.color,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          title: ref.label ?? '',
          priceLineVisible: false,
          lastValueVisible: ref.label != null,
          crosshairMarkerVisible: false,
        });
        refLine.setData(displayBars.map((b) => ({ time: b.time, value: ref.value })));
      }

      let firstOscSeries: ISeriesApi<SeriesType> | null = null;
      for (const s of result.series) {
        const series = oscChart.addLineSeries({
          color: s.color,
          lineWidth: (s.lineWidth ?? 2) as 1 | 2 | 3 | 4,
          lineStyle: s.dashed ? LineStyle.Dashed : LineStyle.Solid,
          title: s.label,
          priceLineVisible: false,
          lastValueVisible: true,
          crosshairMarkerVisible: true,
        });
        series.setData(s.data);
        if (!firstOscSeries) firstOscSeries = series;
      }
      if (firstOscSeries) chartPairs.push([oscChart, firstOscSeries]);

      oscChart.priceScale('right').applyOptions({
        scaleMargins: { top: 0.08, bottom: 0.08 },
        autoScale: true,
      });
    });

    // ── Time scale sync ─────────────────────────────────────────────────────
    const allCharts = [mainChart, ...oscCharts];

    const syncRange = (source: IChartApi) => (range: LogicalRange | null) => {
      if (syncing.current || !range) return;
      syncing.current = true;
      try {
        for (const chart of allCharts) {
          if (chart !== source) chart.timeScale().setVisibleLogicalRange(range);
        }
      } finally {
        syncing.current = false;
      }
    };

    for (const chart of allCharts) {
      chart.timeScale().subscribeVisibleLogicalRangeChange(syncRange(chart));
    }

    const initialRange = mainChart.timeScale().getVisibleLogicalRange();
    if (initialRange) {
      for (const osc of oscCharts) osc.timeScale().setVisibleLogicalRange(initialRange);
    }

    // ── Crosshair sync ─────────────────────────────────────────────────────
    const crosshairHandlers: Array<[IChartApi, (p: MouseEventParams) => void]> = [];
    for (const [srcChart, _srcSeries] of chartPairs) {
      const handler = (params: MouseEventParams) => {
        if (crosshairSyncing.current) return;
        crosshairSyncing.current = true;
        try {
          for (const [tgtChart, tgtSeries] of chartPairs) {
            if (tgtChart === srcChart) continue;
            if (params.time) {
              // NaN price: crosshair snaps to the series value at the given time
              tgtChart.setCrosshairPosition(NaN, params.time, tgtSeries);
            } else {
              tgtChart.clearCrosshairPosition();
            }
          }
        } finally { crosshairSyncing.current = false; }
      };
      srcChart.subscribeCrosshairMove(handler);
      crosshairHandlers.push([srcChart, handler]);
    }

    return () => {
      for (const [chart, handler] of crosshairHandlers) chart.unsubscribeCrosshairMove(handler);
      mainChart.remove();
      mainChartRef.current = null;
      for (const osc of oscCharts) osc.remove();
      oscChartRefs.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayBars, theme.palette.mode, activeIndicatorIds]);

  const tvHref = tvSymbol
    ? `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(tvSymbol)}`
    : null;

  const toolbarRight = (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <ToggleButtonGroup
        size="small"
        exclusive
        value={timeframe}
        onChange={(_event, val: ChartTimeframe | null) => val && setTimeframe(val)}
        sx={{ '& .MuiToggleButton-root': { px: 1.25, py: 0.25, fontSize: '0.72rem', fontWeight: 600 } }}
      >
        <ToggleButton value="1D">1D</ToggleButton>
        <ToggleButton value="1W">1W</ToggleButton>
        <ToggleButton value="1M">1M</ToggleButton>
      </ToggleButtonGroup>
      {tvHref ? <TvLink href={tvHref} sx={{ position: 'static', opacity: 1 }} /> : null}
    </Box>
  );

  return !instrumentId ? (
    <StateCard height={height}>No instrument selected.</StateCard>
  ) : candles === null ? (
    <StateCard height={height}><CircularProgress size={28} /></StateCard>
  ) : error ? (
    <StateCard height={height}>{error}</StateCard>
  ) : candles.length === 0 ? (
    <StateCard height={height}>
      No price history available yet for this instrument.
      {tvHref ? <TvLink href={tvHref} sx={{ position: 'static', opacity: 1, mt: 1 }} /> : null}
    </StateCard>
  ) : (
    <Paper
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <IndicatorToolbar
        activeIds={activeIndicatorIds}
        onChange={setActiveIndicatorIds}
        rightSlot={toolbarRight}
      />
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <Box ref={mainContainerRef} sx={{ height: '100%', width: '100%' }} />
      </Box>
      {activeOscillators.map((def) => (
        <Box key={def.id} sx={{ height: OSC_HEIGHT, borderTop: 1, borderColor: 'divider', flexShrink: 0 }}>
          <Box ref={oscRefCallback(def.id)} sx={{ height: '100%', width: '100%' }} />
        </Box>
      ))}
    </Paper>
  );
}

// ─── sub-components ──────────────────────────────────────────────────────────

function TvLink({ href, sx }: { href: string; sx?: object }) {
  return (
    <Link
      className="tv-ext-link"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      underline="none"
      sx={{
        position: 'absolute',
        top: 8,
        right: 12,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        px: 1,
        py: 0.25,
        borderRadius: 1,
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        fontSize: '0.72rem',
        fontWeight: 600,
        color: 'primary.main',
        opacity: 0.35,
        transition: 'opacity 0.15s ease',
        ...sx,
      }}
    >
      View on TradingView
      <OpenInNewIcon sx={{ fontSize: 13 }} />
    </Link>
  );
}

function StateCard({
  children,
  height,
}: {
  children: React.ReactNode;
  height: InstrumentPriceChartProps['height'];
}) {
  return (
    <Paper
      sx={{
        p: 3,
        height,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
      }}
    >
      <Typography variant="body2" color="text.secondary" component="div">
        {children}
      </Typography>
    </Paper>
  );
}
