/**
 * InstrumentPriceChart — a candlestick + volume chart rendered with TradingView's
 * open-source `lightweight-charts` library, fed by THIS app's persisted OHLC price data
 * (GET /v1/prices/:id). Unlike the TradingView embed widget, this works uniformly for
 * NSE/BSE/US/crypto (it's our own data, no exchange-licensing restriction) and honours
 * the persisted-read rule.
 *
 * On hover, a "View on TradingView ↗" link opens the full TradingView chart for the
 * mapped symbol in a new tab, for users who want indicators/drawing tools.
 */
import { useEffect, useRef, useState } from 'react';
import { Box, CircularProgress, Link, Paper, Typography, useTheme } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  createChart,
  ColorType,
  CrosshairMode,
  type IChartApi,
} from 'lightweight-charts';
import { fetchInstrumentPrices } from '@/features/market-data-foundation/api/marketDataFoundationService';

interface InstrumentPriceChartProps {
  instrumentId?: string;
  region?: string;
  assetType?: string;
  /** TradingView symbol (e.g. "NSE:RELIANCE") for the external "View on TradingView" link. */
  tvSymbol?: string;
  /** Chart height (px, CSS length, or responsive sx value). */
  height?: number | string | Record<string, number | string>;
}

interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
}

const UP = '#26a69a';
const DOWN = '#ef5350';

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
  const [candles, setCandles] = useState<Candle[] | null>(null); // null = loading
  const [error, setError] = useState<string | null>(null);

  // Fetch persisted OHLC for this instrument.
  useEffect(() => {
    if (!instrumentId) {
      setCandles([]);
      return;
    }
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
    return () => {
      cancelled = true;
    };
  }, [instrumentId, region, assetType]);

  // Build / rebuild the chart whenever data or theme changes.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !candles || candles.length === 0) return;

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

    const candleSeries = chart.addCandlestickSeries({
      upColor: UP,
      downColor: DOWN,
      borderVisible: false,
      wickUpColor: UP,
      wickDownColor: DOWN,
    });
    candleSeries.setData(
      candles.map((c) => ({ time: c.time, open: c.open, high: c.high, low: c.low, close: c.close })),
    );

    const volSeries = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: 'vol',
    });
    chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    volSeries.setData(
      candles
        .filter((c) => c.volume != null)
        .map((c) => ({
          time: c.time,
          value: c.volume as number,
          color: c.close >= c.open ? `${UP}66` : `${DOWN}66`,
        })),
    );

    chart.timeScale().fitContent();

    return () => {
      chart.remove();
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candles, theme.palette.mode]);

  const tvHref = tvSymbol
    ? `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(tvSymbol)}`
    : null;

  if (!instrumentId) {
    return <StateCard height={height}>No instrument selected.</StateCard>;
  }
  if (candles === null) {
    return (
      <StateCard height={height}>
        <CircularProgress size={28} />
      </StateCard>
    );
  }
  if (error) {
    return <StateCard height={height}>{error}</StateCard>;
  }
  if (candles.length === 0) {
    return (
      <StateCard height={height}>
        No price history available yet for this instrument.
        {tvHref ? <TvLink href={tvHref} sx={{ position: 'static', opacity: 1, mt: 1 }} /> : null}
      </StateCard>
    );
  }

  return (
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
  );
}

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
        opacity: 0,
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
