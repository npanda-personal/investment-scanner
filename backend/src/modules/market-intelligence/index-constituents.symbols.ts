/**
 * Curated static index constituent symbol lists.
 *
 * Sources:
 *  - NSE India official index composition pages (NIFTY_50, NIFTY_BANK).
 *  - Free public constituent lists for US indices (S&P 500: datasets/s-and-p-500-companies;
 *    NASDAQ-100: yfiua/index-constituents). NO paid index API.
 * As of: see MEMBERSHIP_AS_OF (update when an index reconstitutes).
 *
 * Symbols match the catalog `symbol` column for the relevant region. The US
 * catalog (NASDAQ Trader) stores PLAIN tickers only, so class-share tickers
 * such as BRK.B / BF.B will report as "not found in catalog" — that is honest
 * and expected, not an error.
 */

/** NSE Nifty 50 constituents — 50 large-cap liquid stocks. */
export const NIFTY_50_SYMBOLS: readonly string[] = [
  'ADANIENT', 'ADANIPORTS', 'APOLLOHOSP', 'ASIANPAINT', 'AXISBANK', 'BAJAJ-AUTO', 'BAJAJFINSV',
  'BAJFINANCE', 'BHARTIARTL', 'BEL', 'BPCL', 'BRITANNIA', 'CIPLA', 'COALINDIA', 'DIVISLAB',
  'DRREDDY', 'EICHERMOT', 'GRASIM', 'HCLTECH', 'HDFCBANK', 'HDFCLIFE', 'HEROMOTOCO', 'HINDALCO',
  'HINDUNILVR', 'ICICIBANK', 'INDUSINDBK', 'INFY', 'ITC', 'JSWSTEEL', 'KOTAKBANK', 'LT', 'M&M',
  'MARUTI', 'NESTLEIND', 'NTPC', 'ONGC', 'POWERGRID', 'RELIANCE', 'SBILIFE', 'SHRIRAMFIN', 'SBIN',
  'SUNPHARMA', 'TATACONSUM', 'TATAMOTORS', 'TATASTEEL', 'TCS', 'TECHM', 'TITAN', 'ULTRACEMCO', 'WIPRO',
] as const;

/** NSE Nifty Bank constituents — 12 large-cap banking stocks. */
export const NIFTY_BANK_SYMBOLS: readonly string[] = [
  'AUBANK', 'AXISBANK', 'BANDHANBNK', 'BANKBARODA', 'FEDERALBNK', 'HDFCBANK', 'ICICIBANK',
  'IDFCFIRSTB', 'INDUSINDBK', 'KOTAKBANK', 'PNB', 'SBIN',
] as const;

/**
 * S&P 500 constituents (US) — full membership.
 * Source: https://github.com/datasets/s-and-p-500-companies (free, community-maintained).
 */
export const SP500_SYMBOLS: readonly string[] = [
  'MMM', 'AOS', 'ABT', 'ABBV', 'ACN', 'ADBE', 'AMD', 'AES', 'AFL', 'A', 'APD', 'ABNB', 'AKAM',
  'ALB', 'ARE', 'ALGN', 'ALLE', 'LNT', 'ALL', 'GOOGL', 'GOOG', 'MO', 'AMZN', 'AMCR', 'AEE', 'AEP',
  'AXP', 'AIG', 'AMT', 'AWK', 'AMP', 'AME', 'AMGN', 'APH', 'ADI', 'AON', 'APA', 'APO', 'AAPL',
  'AMAT', 'APP', 'APTV', 'ACGL', 'ADM', 'ARES', 'ANET', 'AJG', 'AIZ', 'T', 'ATO', 'ADSK', 'ADP',
  'AZO', 'AVB', 'AVY', 'AXON', 'BKR', 'BALL', 'BAC', 'BAX', 'BDX', 'BRK.B', 'BBY', 'TECH', 'BIIB',
  'BLK', 'BX', 'XYZ', 'BNY', 'BA', 'BKNG', 'BSX', 'BMY', 'AVGO', 'BR', 'BRO', 'BF.B', 'BLDR', 'BG',
  'BXP', 'CHRW', 'CDNS', 'CPT', 'CPB', 'COF', 'CAH', 'CCL', 'CARR', 'CVNA', 'CASY', 'CAT', 'CBOE',
  'CBRE', 'CDW', 'COR', 'CNC', 'CNP', 'CF', 'CRL', 'SCHW', 'CHTR', 'CVX', 'CMG', 'CB', 'CHD', 'CIEN',
  'CI', 'CINF', 'CTAS', 'CSCO', 'C', 'CFG', 'CLX', 'CME', 'CMS', 'KO', 'CTSH', 'COHR', 'COIN', 'CL',
  'CMCSA', 'FIX', 'CAG', 'COP', 'ED', 'STZ', 'CEG', 'COO', 'CPRT', 'GLW', 'CPAY', 'CTVA', 'CSGP',
  'COST', 'CRH', 'CRWD', 'CCI', 'CSX', 'CMI', 'CVS', 'DHR', 'DRI', 'DDOG', 'DVA', 'DECK', 'DE',
  'DELL', 'DAL', 'DVN', 'DXCM', 'FANG', 'DLR', 'DG', 'DLTR', 'D', 'DPZ', 'DASH', 'DOV', 'DOW', 'DHI',
  'DTE', 'DUK', 'DD', 'ETN', 'EBAY', 'SATS', 'ECL', 'EIX', 'EW', 'EA', 'ELV', 'EME', 'EMR', 'ETR',
  'EOG', 'EQT', 'EFX', 'EQIX', 'EQR', 'ERIE', 'ESS', 'EL', 'EG', 'EVRG', 'ES', 'EXC', 'EXE', 'EXPE',
  'EXPD', 'EXR', 'XOM', 'FFIV', 'FDS', 'FICO', 'FAST', 'FRT', 'FDX', 'FDXF', 'FIS', 'FITB', 'FSLR',
  'FE', 'FISV', 'F', 'FTNT', 'FTV', 'FOXA', 'FOX', 'BEN', 'FCX', 'GRMN', 'IT', 'GE', 'GEHC', 'GEV',
  'GEN', 'GNRC', 'GD', 'GIS', 'GM', 'GPC', 'GILD', 'GPN', 'GL', 'GDDY', 'GS', 'HAL', 'HIG', 'HAS',
  'HCA', 'DOC', 'HSIC', 'HSY', 'HPE', 'HLT', 'HD', 'HON', 'HRL', 'HST', 'HWM', 'HPQ', 'HUBB', 'HUM',
  'HBAN', 'HII', 'IBM', 'IEX', 'IDXX', 'ITW', 'INCY', 'IR', 'PODD', 'INTC', 'IBKR', 'ICE', 'IFF',
  'IP', 'INTU', 'ISRG', 'IVZ', 'INVH', 'IQV', 'IRM', 'JBHT', 'JBL', 'JKHY', 'J', 'JNJ', 'JCI', 'JPM',
  'KVUE', 'KDP', 'KEY', 'KEYS', 'KMB', 'KIM', 'KMI', 'KKR', 'KLAC', 'KHC', 'KR', 'LHX', 'LH', 'LRCX',
  'LVS', 'LDOS', 'LEN', 'LII', 'LLY', 'LIN', 'LYV', 'LMT', 'L', 'LOW', 'LULU', 'LITE', 'LYB', 'MTB',
  'MPC', 'MAR', 'MRSH', 'MLM', 'MAS', 'MA', 'MKC', 'MCD', 'MCK', 'MDT', 'MRK', 'META', 'MET', 'MTD',
  'MGM', 'MCHP', 'MU', 'MSFT', 'MAA', 'MRNA', 'TAP', 'MDLZ', 'MPWR', 'MNST', 'MCO', 'MS', 'MOS',
  'MSI', 'MSCI', 'NDAQ', 'NTAP', 'NFLX', 'NEM', 'NWSA', 'NWS', 'NEE', 'NKE', 'NI', 'NDSN', 'NSC',
  'NTRS', 'NOC', 'NCLH', 'NRG', 'NUE', 'NVDA', 'NVR', 'NXPI', 'ORLY', 'OXY', 'ODFL', 'OMC', 'ON',
  'OKE', 'ORCL', 'OTIS', 'PCAR', 'PKG', 'PLTR', 'PANW', 'PSKY', 'PH', 'PAYX', 'PYPL', 'PNR', 'PEP',
  'PFE', 'PCG', 'PM', 'PSX', 'PNW', 'PNC', 'POOL', 'PPG', 'PPL', 'PFG', 'PG', 'PGR', 'PLD', 'PRU',
  'PEG', 'PTC', 'PSA', 'PHM', 'PWR', 'QCOM', 'DGX', 'Q', 'RL', 'RJF', 'RTX', 'O', 'REG', 'REGN', 'RF',
  'RSG', 'RMD', 'RVTY', 'HOOD', 'ROK', 'ROL', 'ROP', 'ROST', 'RCL', 'SPGI', 'CRM', 'SNDK', 'SBAC',
  'SLB', 'STX', 'SRE', 'NOW', 'SHW', 'SPG', 'SWKS', 'SJM', 'SW', 'SNA', 'SOLV', 'SO', 'LUV', 'SWK',
  'SBUX', 'STT', 'STLD', 'STE', 'SYK', 'SMCI', 'SYF', 'SNPS', 'SYY', 'TMUS', 'TROW', 'TTWO', 'TPR',
  'TRGP', 'TGT', 'TEL', 'TDY', 'TER', 'TSLA', 'TXN', 'TPL', 'TXT', 'TMO', 'TJX', 'TKO', 'TTD', 'TSCO',
  'TT', 'TDG', 'TRV', 'TRMB', 'TFC', 'TYL', 'TSN', 'USB', 'UBER', 'UDR', 'ULTA', 'UNP', 'UAL', 'UPS',
  'URI', 'UNH', 'UHS', 'VLO', 'VEEV', 'VTR', 'VLTO', 'VRSN', 'VRSK', 'VZ', 'VRTX', 'VRT', 'VTRS',
  'VICI', 'V', 'VST', 'VMC', 'WRB', 'GWW', 'WAB', 'WMT', 'DIS', 'WBD', 'WM', 'WAT', 'WEC', 'WFC',
  'WELL', 'WST', 'WDC', 'WY', 'WSM', 'WMB', 'WTW', 'WDAY', 'WYNN', 'XEL', 'XYL', 'YUM', 'ZBRA', 'ZBH',
  'ZTS',
] as const;

/**
 * NASDAQ-100 constituents (US) — full membership.
 * Source: https://github.com/yfiua/index-constituents (free, community-maintained).
 */
export const NDX100_SYMBOLS: readonly string[] = [
  'NVDA', 'AAPL', 'MSFT', 'AMZN', 'GOOGL', 'GOOG', 'AVGO', 'META', 'TSLA', 'WMT', 'ASML', 'COST',
  'NFLX', 'MU', 'PLTR', 'AMD', 'CSCO', 'AMAT', 'LRCX', 'TMUS', 'LIN', 'INTC', 'PEP', 'KLAC', 'AMGN',
  'TXN', 'GILD', 'ISRG', 'ARM', 'SHOP', 'ADI', 'PDD', 'HON', 'QCOM', 'APP', 'BKNG', 'PANW', 'INTU',
  'VRTX', 'SBUX', 'CMCSA', 'CEG', 'CRWD', 'ADBE', 'WDC', 'STX', 'MRVL', 'MELI', 'MAR', 'ADP', 'REGN',
  'CDNS', 'SNPS', 'CSX', 'ORLY', 'ABNB', 'MDLZ', 'MNST', 'AEP', 'ROST', 'WBD', 'CTAS', 'DASH', 'PCAR',
  'FTNT', 'BKR', 'MPWR', 'FANG', 'FAST', 'EA', 'ADSK', 'EXC', 'NXPI', 'XEL', 'FER', 'IDXX', 'ALNY',
  'MSTR', 'DDOG', 'PYPL', 'ODFL', 'CCEP', 'TRI', 'TTWO', 'ROP', 'KDP', 'INSM', 'MCHP', 'AXON', 'WDAY',
  'PAYX', 'GEHC', 'CPRT', 'CTSH', 'CHTR', 'KHC', 'VRSK', 'DXCM', 'ZS', 'TEAM', 'CSGP',
] as const;

export const INDEX_SYMBOL_LISTS: Record<string, readonly string[]> = {
  NIFTY_50: NIFTY_50_SYMBOLS,
  NIFTY_BANK: NIFTY_BANK_SYMBOLS,
  SP500: SP500_SYMBOLS,
  NDX100: NDX100_SYMBOLS,
};

export const INDEX_DISPLAY_LABELS: Record<string, string> = {
  NIFTY_50: 'Nifty 50',
  NIFTY_BANK: 'Nifty Bank',
  SP500: 'S&P 500',
  NDX100: 'NASDAQ-100',
};

export const MEMBERSHIP_AS_OF = '2026-06';
