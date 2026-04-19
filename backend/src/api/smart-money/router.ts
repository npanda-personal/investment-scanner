import express from 'express';
import { SmartMoneyCalculationService } from './service';
import { SectorDataCalculationService } from './sector.service';

const router = express.Router();

// Get sector performance data (now using real ETF-based data)
router.get('/sector-performance', async (req, res) => {
  try {
    const { timeframe = 'weekly', limit = 20 } = req.query;
    
    const sectorService = new SectorDataCalculationService();
    const sectorPerformance = await sectorService.calculateSectorPerformance(timeframe as 'daily' | 'weekly' | 'monthly');
    
    // Apply limit filter
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

// Get smart money indicators (realistic price + volume based signals)
router.get('/indicators', async (_req, res) => {
  try {
    const calculationService = new SmartMoneyCalculationService();
    const indicators = await calculationService.calculateSignals();

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

// Get smart money signals with explanations
router.get('/signals', async (_req, res) => {
  try {
    const signals = [
      {
        id: 1,
        name: 'Volume Spike Detected',
        type: 'positive',
        strength: 0.8,
        description: 'Unusually high volume in Technology sector suggests institutional interest',
        explanation: 'Volume > 2.5x 20-day average with price increase indicates accumulation',
        stocks: ['AAPL', 'MSFT', 'NVDA'],
        timestamp: new Date().toISOString()
      },
      {
        id: 2,
        name: 'Accumulation Pattern',
        type: 'positive',
        strength: 0.7,
        description: 'Price up + volume up pattern across multiple sectors',
        explanation: 'Consistent buying pressure with above-average volume suggests smart money accumulation',
        stocks: ['XLK', 'XLV', 'XLF'],
        timestamp: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: 3,
        name: 'Distribution Warning',
        type: 'warning',
        strength: 0.6,
        description: 'Price down with high volume in Energy sector',
        explanation: 'Selling pressure with elevated volume may indicate distribution',
        stocks: ['XLE', 'CVX', 'XOM'],
        timestamp: new Date(Date.now() - 172800000).toISOString()
      },
      {
        id: 4,
        name: 'Momentum Shift',
        type: 'neutral',
        strength: 0.5,
        description: 'Rotation from Growth to Value sectors detected',
        explanation: 'Relative strength analysis shows early signs of sector rotation',
        stocks: ['XLK', 'XLV', 'XLF'],
        timestamp: new Date(Date.now() - 43200000).toISOString()
      }
    ];

    res.json({
      success: true,
      data: signals,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching smart money signals:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch smart money signals'
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