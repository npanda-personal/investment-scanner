/**
 * InstrumentPriceChart — candlestick + volume chart (lightweight-charts) on the app's
 * own persisted OHLC data (GET /v1/prices/:id). Works for NSE/BSE/US/crypto uniformly.
 *
 * Includes a toggleable indicator toolbar (RSI, Stoch RSI, 50/200 DMA, Pivot Points).
 * Add new indicators by registering them in shared/indicators/registry.ts — no changes
 * needed to this component.
 *
 * A "View on TradingView ↗" link is always gently visible; full opacity on hover.
 */
import { useEffect, useRef, useState } from 'react';
import { Box, CircularProgress, Link, Paper, Typography, useTheme } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  createChart,
  ColorType,
  CrosshairMode,
  LineStyle,
  type IChartApi,
} from 'lightweight-charts';
import { fetchInstrumentPrices } from '@/features/market-data-foundation/api/marketDataFoundationService';
import IndicatorToolbar from '@/shared/indicators/IndicatorToolbar';
import { DEFAULT_INDICATORS, INDICATOR_REGISTRY } from '@/shared/indicators/registry';
import type { IndicatorId, OHLCVBar } from '@/shared/indicators/types';

interface InstrumentPriceChartProps {
  instrumentId?: string;
  region?: string;
  assetType?: string;
  /** TradingView symbol (e.g. "NSE:RELIANCE") for the external "View on TradingView" link. */
  tvSymbol?: string;
  /** Chart height (px, CSS length, or responsive sx value). */
  height?: number | string | Record<string, number | string>;
}

const UP = '#26a69a';
const DOWN = '#ef5350';

// ─── pane layout helpers ─────────────────────────────────────────────────────

interface PaneLayout {
  right: { top: number; bottom: number };
  vol: { top: number; bottom: number };
  oscScales: { top: number; bottom: number }[];
}

function computePaneLayout(oscCount: number): PaneLayout {
  if (oscCount === 0) {
    return { right: { top: 0, bottom: 0 }, vol: { top: 0.82, bottom: 0 }, oscScales: [] };
  }
  if (oscCount === 1) {
    return {
      right: { top: 0, bottom: 0.42 },
      vol:   { top: 0.59, bottom: 0.37 },
      oscScales: [{ top: 0.63, bottom: 0 }],
    };
  }
  // 2+ oscillators
  return {
    right: { top: 0, bottom: 0.50 },
    vol:   { top: 0.51, bottom: 0.45 },
    oscScales: [
      { top: 0.55, bottom: 0.24 },
      { top: 0.76, bottom: 0 },
    ],
  };
}

// ─── component ───────────────────────────────────────────────────────────────

export default function InstrumentPriceChart({
  instrumentId,
  region,
  assetType,
  tvSymbol,
  height = 620,
}: InstrumentPriceChartProps) {
  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [candles, setCandles] = useState<OHLCVBar[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeIndicatorIds, setActiveIndicatorIds] = useState<IndicatorId[]>(DEFAULT_INDICATORS);

  // Fetch persisted OHLC for this instrument.
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
      .catch(() => {
        if (!cancelled) setError('Unable to load price history for this instrument.');
      });
    return () => { cancelled = true; };
  }, [instrumentId, region, assetType]);

  // Build / rebuild the chart when data, theme, or active indicators change.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !candles || candles.length === 0) return;

    const activeOverlay = activeIndicatorIds
      .map((id) => INDICATOR_REGISTRY[id])
      .filter((d) => d?.pane === 'overlay');
    const activeOscillators = activeIndicatorIds
      .map((id) => INDICATOR_REGISTRY[id])
      .filter((d) => d?.pane === 'oscillator');
    const layout = computePaneLayout(activeOscillators.length);

    const chart = createChart(el, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: theme.palette.text.secondary,
        fontFamily: theme.typography.fontFamily,
      },
      grid: {
        vertLines: { color: theme.palette.divider },
        horzLines: { color: theme.palette.divider },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: theme.palette.divider },
      timeScale: { borderColor: theme.palette.divider, timeVisible: false, rightOffset: 6 },
    });
    chartRef.current = chart;

    chart.priceScale('right').applyOptions({ scaleMargins: layout.right });

    // Candle series
    const candleSeries = chart.addCandlestickSeries({
      upColor: UP, downColor: DOWN, borderVisible: false,
      wickUpColor: UP, wickDownColor: DOWN,
    });
    candleSeries.setData(
      candles.map((c) => ({ time: c.time, open: c.open, high: c.high, low: c.low, close: c.close })),
    );

    // Volume series
    const volSeries = chart.addHistogramSeries({ priceFormat: { type: 'volume' }, priceScaleId: 'vol' });
    chart.priceScale('vol').applyOptions({ scaleMargins: layout.vol });
    volSeries.setData(
      candles
        .filter((c) => c.volume != null)
        .map((c) => ({
          time: c.time,
          value: c.volume as number,
          color: c.close >= c.open ? `${UP}66` : `${DOWN}66`,
        })),
    );

    // Overlay indicators (DMA lines, Pivot Points) — rendered on the main candle scale
    for (const def of activeOverlay) {
      const result = def.calculate(candles);
      for (const s of result.series) {
        const series = chart.addLineSeries({
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

    // Oscillator indicators — each in its own sub-pane with a dedicated price scale
    activeOscillators.forEach((def, oscIdx) => {
      const result = def.calculate(candles);
      const scaleId = `osc${oscIdx}`;
      const oscMargins = layout.oscScales[oscIdx] ?? { top: 0.85, bottom: 0 };

      // Reference levels (overbought / oversold / midline)
      for (const ref of result.referenceLevels ?? []) {
        const refLine = chart.addLineSeries({
          color: ref.color,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          priceScaleId: scaleId,
          title: ref.label ?? '',
          priceLineVisible: false,
          lastValueVisible: ref.label != null,
          crosshairMarkerVisible: false,
        });
        refLine.setData(candles.map((b) => ({ time: b.time, value: ref.value })));
      }

      // Main indicator series (%K/%D, RSI line, etc.)
      for (const s of result.series) {
        const series = chart.addLineSeries({
          color: s.color,
          lineWidth: ((s.lineWidth ?? 2) as 1 | 2 | 3 | 4),
          lineStyle: s.dashed ? LineStyle.Dashed : LineStyle.Solid,
          priceScaleId: scaleId,
          title: s.label,
          priceLineVisible: false,
          lastValueVisible: true,
          crosshairMarkerVisible: true,
        });
        series.setData(s.data);
      }

      chart.priceScale(scaleId).applyOptions({ scaleMargins: oscMargins, autoScale: true });
    });

    chart.timeScale().fitContent();

    return () => { chart.remove(); chartRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candles, theme.palette.mode, activeIndicatorIds]);

  const tvHref = tvSymbol
    ? `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(tvSymbol)}`
    : null;

  return (
    <Box>
      <IndicatorToolbar activeIds={activeIndicatorIds} onChange={setActiveIndicatorIds} />
      {!instrumentId ? (
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
            p: 0,
            position: 'relative',
            height,
            overflow: 'hidden',
            '&:hover .tv-ext-link, & .tv-ext-link:focus-visible': { opacity: 1 },
          }}
        >
          <Box ref={containerRef} sx={{ height: '100%', width: '100%' }} />
          {tvHref ? <TvLink href={tvHref} /> : null}
        </Paper>
      )}
    </Box>
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
