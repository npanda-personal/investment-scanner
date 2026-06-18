/**
 * TradingViewChart — embeds TradingView's free "Advanced Chart" widget for a single
 * symbol. No API key required; the widget loads its own (third-party) market data in an
 * iframe, which is intentionally distinct from this app's persisted-read data pipeline.
 *
 * The widget is injected via TradingView's embed script (a <script> whose JSON body is
 * the widget config). We re-initialise when the symbol or MUI theme mode changes, and
 * clear the injected DOM on unmount so no orphaned iframes accumulate.
 */
import { useEffect, useRef } from 'react';
import { Box, CircularProgress, Paper, Typography, useTheme } from '@mui/material';

const SCRIPT_SRC =
  'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';

interface TradingViewChartProps {
  /** TradingView symbol, e.g. "NSE:RELIANCE" / "NASDAQ:AAPL". */
  symbol: string;
  /** True while the instrument record is still resolving — shows a spinner, not the
   * "unavailable" message, so a slow lookup never reads as a genuinely unmappable symbol. */
  loading?: boolean;
  /** Chart height (px or CSS length). Defaults to a comfortable workspace height. */
  height?: number | string;
}

export default function TradingViewChart({ symbol, loading = false, height = 620 }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const theme = useTheme();
  const mode = theme.palette.mode; // 'light' | 'dark'

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !symbol) return;

    // Reset any prior widget before (re)initialising.
    container.innerHTML = '';

    const widgetHost = document.createElement('div');
    widgetHost.className = 'tradingview-widget-container__widget';
    widgetHost.style.height = '100%';
    widgetHost.style.width = '100%';
    container.appendChild(widgetHost);

    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol,
      interval: 'D',
      timezone: 'Etc/UTC',
      theme: mode,
      style: '1',
      locale: 'en',
      allow_symbol_change: true,
      hide_side_toolbar: false,
      withdateranges: true,
      support_host: 'https://www.tradingview.com',
    });
    container.appendChild(script);

    return () => {
      container.innerHTML = '';
    };
  }, [symbol, mode]);

  if (!symbol) {
    return (
      <Paper sx={{ p: 3, height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {loading ? (
          <CircularProgress size={28} />
        ) : (
          <Typography variant="body2" color="text.secondary">
            Chart unavailable — no recognized symbol for this instrument.
          </Typography>
        )}
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 0, overflow: 'hidden' }}>
      <Box
        ref={containerRef}
        className="tradingview-widget-container"
        sx={{ height, width: '100%' }}
      />
    </Paper>
  );
}
