import express from 'express';

const router = express.Router();

// Get sector performance data
router.get('/sector-performance', async (req, res) => {
  try {
    const { timeframe = 'weekly', limit = 20 } = req.query;
    
    // Mock data - in production, this would query actual financial data
    const sectorPerformance = [
      { sector: 'Technology', performance: 12.5, flow: 450, color: '#2196f3', marketCap: 12500 },
      { sector: 'Healthcare', performance: 8.2, flow: 320, color: '#4caf50', marketCap: 8900 },
      { sector: 'Financials', performance: 5.7, flow: 280, color: '#ff9800', marketCap: 7600 },
      { sector: 'Energy', performance: -3.2, flow: -120, color: '#f44336', marketCap: 4200 },
      { sector: 'Consumer Discretionary', performance: 7.8, flow: 190, color: '#9c27b0', marketCap: 6800 },
      { sector: 'Industrials', performance: 4.3, flow: 150, color: '#3f51b5', marketCap: 5400 },
      { sector: 'Utilities', performance: 2.1, flow: 80, color: '#00bcd4', marketCap: 3200 },
      { sector: 'Materials', performance: -1.5, flow: -60, color: '#795548', marketCap: 2800 },
      { sector: 'Real Estate', performance: 3.4, flow: 95, color: '#607d8b', marketCap: 2100 },
      { sector: 'Communication Services', performance: 6.7, flow: 210, color: '#e91e63', marketCap: 5800 },
    ];

    // Apply timeframe filter (mock implementation)
    const filteredData = sectorPerformance.slice(0, parseInt(limit as string));
    
    res.json({
      success: true,
      data: filteredData,
      timeframe,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching sector performance:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch sector performance data' 
    });
  }
});

// Get smart money indicators
router.get('/indicators', async (_req, res) => {
  try {
    const indicators = [
      { 
        indicator: 'Large Block Trades', 
        value: 42, 
        change: 15, 
        trend: 'up',
        description: 'Number of trades > $1M in past 24h'
      },
      { 
        indicator: 'Unusual Options Activity', 
        value: 28, 
        change: 8, 
        trend: 'up',
        description: 'Options volume > 10x average daily volume'
      },
      { 
        indicator: 'Institutional Net Flow', 
        value: 1250, 
        change: -3, 
        trend: 'down',
        unit: 'M',
        description: 'Net institutional flow in millions'
      },
      { 
        indicator: 'Insider Buying', 
        value: 18, 
        change: 22, 
        trend: 'up',
        description: 'Number of insider buy transactions'
      },
      { 
        indicator: 'ETF Creation/Redemption', 
        value: 45, 
        change: 12, 
        trend: 'up',
        description: 'ETF share creation activity'
      },
      { 
        indicator: 'Short Interest Change', 
        value: -2.3, 
        change: -8, 
        trend: 'down',
        description: 'Percentage change in short interest'
      },
    ];

    res.json({
      success: true,
      data: indicators,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching smart money indicators:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch smart money indicators' 
    });
  }
});

// Get economic cycle data
router.get('/economic-cycle', async (_req, res) => {
  try {
    const economicCyclePhases = [
      { 
        phase: 'Recovery', 
        description: 'Early economic rebound after contraction',
        leadingSectors: ['Financials', 'Consumer Discretionary', 'Technology'],
        color: '#4caf50',
        currentPhase: false,
        durationMonths: 6
      },
      { 
        phase: 'Expansion', 
        description: 'Strong growth period with rising corporate profits',
        leadingSectors: ['Technology', 'Industrials', 'Materials'],
        color: '#2196f3',
        currentPhase: true,
        durationMonths: 18
      },
      { 
        phase: 'Slowdown', 
        description: 'Growth deceleration, rising inflation concerns',
        leadingSectors: ['Healthcare', 'Consumer Staples', 'Utilities'],
        color: '#ff9800',
        currentPhase: false,
        durationMonths: 9
      },
      { 
        phase: 'Contraction', 
        description: 'Economic decline, falling corporate profits',
        leadingSectors: ['Utilities', 'Healthcare', 'Consumer Staples'],
        color: '#f44336',
        currentPhase: false,
        durationMonths: 12
      },
    ];

    res.json({
      success: true,
      data: economicCyclePhases,
      currentPhase: 'Expansion',
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching economic cycle data:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch economic cycle data' 
    });
  }
});

// Get actionable insights
router.get('/insights', async (_req, res) => {
  try {
    const insights = [
      {
        id: 1,
        title: 'Strong Institutional Inflow',
        description: 'Technology sector shows +$450M institutional inflow over past week, suggesting smart money accumulation.',
        type: 'positive',
        confidence: 0.85,
        sectors: ['Technology'],
        timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      },
      {
        id: 2,
        title: 'Sector Rotation Signal',
        description: 'Early signs of rotation from Energy to Healthcare detected, consistent with late-cycle behavior.',
        type: 'neutral',
        confidence: 0.72,
        sectors: ['Energy', 'Healthcare'],
        timestamp: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
      },
      {
        id: 3,
        title: 'Unusual Options Activity',
        description: 'Large call option volume in Financials sector suggests institutional positioning for upcoming earnings season.',
        type: 'warning',
        confidence: 0.68,
        sectors: ['Financials'],
        timestamp: new Date(Date.now() - 43200000).toISOString(), // 12 hours ago
      },
      {
        id: 4,
        title: 'Warning: Energy Outflows',
        description: 'Energy sector shows -$120M outflow, largest weekly decline in 3 months.',
        type: 'negative',
        confidence: 0.91,
        sectors: ['Energy'],
        timestamp: new Date(Date.now() - 21600000).toISOString(), // 6 hours ago
      },
    ];

    res.json({
      success: true,
      data: insights,
      count: insights.length,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching insights:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch insights' 
    });
  }
});

// Get relative strength data for sectors
router.get('/relative-strength', async (req, res) => {
  try {
    const { sectors } = req.query;
    const requestedSectors = sectors ? (sectors as string).split(',') : ['Technology', 'Healthcare', 'Financials'];
    
    // Mock relative strength data
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
    const strengthData = requestedSectors.map(sector => ({
      sector,
      values: months.map((month, index) => ({
        month,
        value: Math.floor(Math.random() * 30) + 60 + index * 5, // Mock trending data
      })),
      currentStrength: Math.floor(Math.random() * 30) + 70,
      trend: Math.random() > 0.5 ? 'up' : 'down',
    }));

    res.json({
      success: true,
      data: strengthData,
      benchmark: 'S&P 500',
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching relative strength data:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch relative strength data' 
    });
  }
});

// Get macroeconomic indicators
router.get('/macro-indicators', async (_req, res) => {
  try {
    const indicators = [
      {
        name: 'GDP Growth Forecast',
        value: 2.8,
        unit: '%',
        change: 0.2,
        trend: 'up',
        targetRange: { min: 2.0, max: 3.5 },
        description: 'Annualized GDP growth projection',
      },
      {
        name: 'Inflation Rate (CPI)',
        value: 3.2,
        unit: '%',
        change: -0.1,
        trend: 'down',
        targetRange: { min: 2.0, max: 2.5 },
        description: 'Consumer Price Index year-over-year',
      },
      {
        name: 'Unemployment Rate',
        value: 3.9,
        unit: '%',
        change: 0.1,
        trend: 'up',
        targetRange: { min: 3.5, max: 4.5 },
        description: 'Seasonally adjusted unemployment rate',
      },
      {
        name: 'Fed Funds Rate',
        value: 5.25,
        unit: '%',
        change: 0,
        trend: 'stable',
        targetRange: { min: 5.0, max: 5.5 },
        description: 'Federal Reserve target rate',
      },
      {
        name: '10-Year Treasury Yield',
        value: 4.35,
        unit: '%',
        change: 0.05,
        trend: 'up',
        targetRange: { min: 4.0, max: 4.5 },
        description: 'US Treasury 10-year bond yield',
      },
      {
        name: 'VIX Index',
        value: 15.2,
        unit: '',
        change: -0.8,
        trend: 'down',
        targetRange: { min: 12, max: 20 },
        description: 'Market volatility index',
      },
    ];

    res.json({
      success: true,
      data: indicators,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching macroeconomic indicators:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch macroeconomic indicators' 
    });
  }
});

export default router;