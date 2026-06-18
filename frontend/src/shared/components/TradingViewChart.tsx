/**
 * TradingViewChart — embeds TradingView's free chart for a single symbol via the
 * widgetembed iframe (no API key; third-party data, intentionally distinct from this
 * app's persisted-read pipeline).
 *
 * We use an <iframe> with the symbol in the URL rather than the embed <script>: the
 * script approach does not reliably re-create the widget when the symbol changes (it
 * leaves the previous/default chart in place), whereas an iframe keyed by symbol+theme
 * is force-remounted by React on every change, so the chart always reflects the stock
 * the user is on. An explicit height keeps the chart from collapsing.
 */
import { Box, CircularProgress, Paper, Typography, useTheme } from '@mui/material';

interface TradingViewChartProps {
  /** TradingView symbol, e.g. "NSE:RELIANCE" / "NASDAQ:AAPL". */
  symbol: string;
  /** True while the instrument record is still resolving — shows a spinner, not the
   * "unavailable" message, so a slow lookup never reads as a genuinely unmappable symbol. */
  loading?: boolean;
  /** Chart height (px, CSS length, or responsive sx value). */
  height?: number | string | Record<string, number | string>;
}

function buildEmbedUrl(symbol: string, theme: 'light' | 'dark'): string {
  // Legacy widgetembed endpoint — accepts the symbol as a URL param and renders a full
  // advanced chart. Changing the URL (via the React key) reloads it with the new symbol.
  const params = new URLSearchParams({
    symbol,
    interval: 'D',
    theme,
    style: '1',
    timezone: 'Etc/UTC',
    withdateranges: '1',
    hideideas: '1',
    hidesidetoolbar: '0',
    symboledit: '1',
    saveimage: '1',
    locale: 'en',
  });
  return `https://s.tradingview.com/widgetembed/?${params.toString()}`;
}

export default function TradingViewChart({ symbol, loading = false, height = 620 }: TradingViewChartProps) {
  const theme = useTheme();
  const mode = theme.palette.mode; // 'light' | 'dark'

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
    <Paper sx={{ p: 0, overflow: 'hidden', height }}>
      <Box
        component="iframe"
        key={`${symbol}-${mode}`}
        src={buildEmbedUrl(symbol, mode)}
        title={`TradingView chart for ${symbol}`}
        loading="lazy"
        allow="fullscreen"
        sx={{ width: '100%', height: '100%', border: 0, display: 'block' }}
      />
    </Paper>
  );
}
