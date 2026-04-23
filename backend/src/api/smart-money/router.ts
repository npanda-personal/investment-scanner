import express from 'express';
import { SmartMoneyCalculationService } from './service';
import { SectorDataCalculationService } from './sector.service';
import { MacroDataCalculationService } from './macro.service';

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

// Get smart money signals with explanations (database-driven)
router.get('/signals', async (_req, res) => {
  try {
    const calculationService = new SmartMoneyCalculationService();
    const indicators = await calculationService.calculateSignals();

    // Build signals from computed indicators
    const signals: any[] = [];
    let id = 1;

    // Signal 1: Volume Spike
    const volumeSpike = indicators.find(i => i.indicator === 'Volume Spikes');
    if (volumeSpike && volumeSpike.value > 0) {
      signals.push({
        id: id++,
        name: 'Volume Spike Detected',
        type: volumeSpike.value > 10 ? 'positive' : 'neutral',
        strength: Math.min(0.9, volumeSpike.value / 20),
        description: `${volumeSpike.value} stocks showing volume > 2x 20-day average, suggesting institutional interest`,
        explanation: 'Volume spikes with price increases often indicate accumulation by institutional investors',
        stocks: [],
        timestamp: new Date().toISOString()
      });
    }

    // Signal 2: Accumulation
    const accumulation = indicators.find(i => i.indicator === 'Accumulation Signal');
    if (accumulation) {
      signals.push({
        id: id++,
        name: 'Accumulation Pattern',
        type: accumulation.value > 40 ? 'positive' : 'neutral',
        strength: Math.min(0.9, accumulation.value / 60),
        description: `${accumulation.value}% of stocks showing price up + volume up pattern`,
        explanation: 'Consistent buying pressure with above-average volume suggests smart money accumulation',
        stocks: [],
        timestamp: new Date().toISOString()
      });
    }

    // Signal 3: Distribution Warning
    const distribution = indicators.find(i => i.indicator === 'Distribution Signal');
    if (distribution) {
      signals.push({
        id: id++,
        name: 'Distribution Warning',
        type: distribution.value > 25 ? 'warning' : 'neutral',
        strength: Math.min(0.8, distribution.value / 40),
        description: `${distribution.value}% of stocks showing price down with high volume`,
        explanation: 'Selling pressure with elevated volume may indicate distribution by institutional investors',
        stocks: [],
        timestamp: new Date().toISOString()
      });
    }

    // Signal 4: Market Momentum
    const momentum = indicators.find(i => i.indicator === 'Market Momentum');
    if (momentum) {
      signals.push({
        id: id++,
        name: 'Market Momentum',
        type: momentum.value > 60 ? 'positive' : momentum.value < 40 ? 'warning' : 'neutral',
        strength: Math.abs(momentum.value - 50) / 50,
        description: `${momentum.value}% of top US stocks showing positive 5-day momentum`,
        explanation: 'Momentum analysis based on individual stock price changes across the market',
        stocks: [],
        timestamp: new Date().toISOString()
      });
    }

    // Signal 5: Relative Strength
    const relStrength = indicators.find(i => i.indicator.startsWith('Relative Strength'));
    if (relStrength) {
      signals.push({
        id: id++,
        name: 'Tech vs Market Relative Strength',
        type: relStrength.value > 1.05 ? 'positive' : relStrength.value < 0.95 ? 'warning' : 'neutral',
        strength: Math.min(0.9, Math.abs(relStrength.value - 1) * 10),
        description: `Tech stocks ${relStrength.value > 1 ? 'outperforming' : 'underperforming'} broad market (ratio: ${relStrength.value.toFixed(2)})`,
        explanation: 'Relative strength calculated by comparing average returns of top tech stocks vs broad market stocks',
        stocks: [],
        timestamp: new Date().toISOString()
      });
    }

    // Signal 6: Volume Activity
    const volActivity = indicators.find(i => i.indicator === 'Volume Activity');
    if (volActivity) {
      signals.push({
        id: id++,
        name: 'Volume Activity Level',
        type: volActivity.value > 1.5 ? 'positive' : volActivity.value < 0.8 ? 'warning' : 'neutral',
        strength: Math.min(0.8, (volActivity.value - 1) * 2),
        description: `Average volume ratio of ${volActivity.value.toFixed(2)}x across top stocks`,
        explanation: 'Higher volume activity suggests increased market participation and liquidity',
        stocks: [],
        timestamp: new Date().toISOString()
      });
    }

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
    const macroService = new MacroDataCalculationService();
    const economicCycle = await macroService.determineEconomicCycle();
    
    // Create economic cycle phases for visualization
    const economicCyclePhases = [
      {
        phase: 'Recovery',
        description: 'Early economic rebound after contraction',
        leadingSectors: ['Financials', 'Consumer Discretionary', 'Technology'],
        color: '#4caf50',
        currentPhase: economicCycle.phase === 'Recovery',
        durationMonths: 6
      },
      {
        phase: 'Expansion',
        description: 'Strong growth period with rising corporate profits',
        leadingSectors: ['Technology', 'Industrials', 'Materials'],
        color: '#2196f3',
        currentPhase: economicCycle.phase === 'Expansion',
        durationMonths: 18
      },
      {
        phase: 'Slowdown',
        description: 'Growth deceleration, rising inflation concerns',
        leadingSectors: ['Healthcare', 'Consumer Staples', 'Utilities'],
        color: '#ff9800',
        currentPhase: economicCycle.phase === 'Slowdown',
        durationMonths: 9
      },
      {
        phase: 'Contraction',
        description: 'Economic decline, falling corporate profits',
        leadingSectors: ['Utilities', 'Healthcare', 'Consumer Staples'],
        color: '#f44336',
        currentPhase: economicCycle.phase === 'Contraction',
        durationMonths: 12
      },
    ];

    res.json({
      success: true,
      data: economicCyclePhases,
      currentPhase: economicCycle.phase,
      cycleAnalysis: economicCycle,
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

// Get actionable insights (database-driven)
router.get('/insights', async (_req, res) => {
  try {
    const calculationService = new SmartMoneyCalculationService();
    const sectorService = new SectorDataCalculationService();
    const indicators = await calculationService.calculateSignals();
    const sectorPerformance = await sectorService.calculateSectorPerformance('weekly');

    const insights: any[] = [];
    let id = 1;

    // Insight 1: Accumulation / Distribution balance
    const accumulation = indicators.find(i => i.indicator === 'Accumulation Signal');
    const distribution = indicators.find(i => i.indicator === 'Distribution Signal');
    if (accumulation && distribution) {
      const netPressure = accumulation.value - distribution.value;
      if (netPressure > 10) {
        insights.push({
          id: id++,
          title: 'Net Accumulation Detected',
          description: `${netPressure.toFixed(0)}% more stocks showing accumulation than distribution patterns, suggesting broad institutional buying interest.`,
          type: 'positive',
          confidence: Math.min(0.9, 0.5 + netPressure / 100),
          sectors: [],
          timestamp: new Date().toISOString(),
        });
      } else if (netPressure < -10) {
        insights.push({
          id: id++,
          title: 'Net Distribution Warning',
          description: `${Math.abs(netPressure).toFixed(0)}% more stocks showing distribution than accumulation patterns, suggesting broad institutional selling.`,
          type: 'negative',
          confidence: Math.min(0.9, 0.5 + Math.abs(netPressure) / 100),
          sectors: [],
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Insight 2: Volume spike insight
    const volumeSpike = indicators.find(i => i.indicator === 'Volume Spikes');
    if (volumeSpike && volumeSpike.value > 5) {
      insights.push({
        id: id++,
        title: 'Elevated Volume Activity',
        description: `${volumeSpike.value} stocks showing volume > 2x their 20-day average, indicating heightened market participation.`,
        type: 'neutral',
        confidence: Math.min(0.85, 0.5 + volumeSpike.value / 30),
        sectors: [],
        timestamp: new Date().toISOString(),
      });
    }

    // Insight 3: Sector rotation from top/bottom performers
    const sortedSectors = [...sectorPerformance].sort((a, b) => b.performance - a.performance);
    if (sortedSectors.length >= 2) {
      const topSector = sortedSectors[0];
      const bottomSector = sortedSectors[sortedSectors.length - 1];
      const spread = topSector.performance - bottomSector.performance;
      if (spread > 5) {
        insights.push({
          id: id++,
          title: 'Sector Rotation Signal',
          description: `${topSector.sector} (${topSector.performance.toFixed(1)}%) leading while ${bottomSector.sector} (${bottomSector.performance.toFixed(1)}%) lagging — ${spread.toFixed(1)}% spread suggests rotation.`,
          type: 'neutral',
          confidence: Math.min(0.8, 0.4 + spread / 20),
          sectors: [topSector.sector, bottomSector.sector],
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Insight 4: Momentum insight
    const momentum = indicators.find(i => i.indicator === 'Market Momentum');
    if (momentum) {
      if (momentum.value > 65) {
        insights.push({
          id: id++,
          title: 'Broad Market Strength',
          description: `${momentum.value}% of top US stocks showing positive momentum — broad market participation suggests sustained uptrend.`,
          type: 'positive',
          confidence: Math.min(0.85, 0.4 + momentum.value / 100),
          sectors: [],
          timestamp: new Date().toISOString(),
        });
      } else if (momentum.value < 40) {
        insights.push({
          id: id++,
          title: 'Broad Market Weakness',
          description: `Only ${momentum.value}% of top US stocks showing positive momentum — lack of broad participation suggests caution.`,
          type: 'negative',
          confidence: Math.min(0.85, 0.4 + (100 - momentum.value) / 100),
          sectors: [],
          timestamp: new Date().toISOString(),
        });
      }
    }

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
    
    const sectorService = new SectorDataCalculationService();
    const strengthData = await sectorService.calculateRelativeStrength(requestedSectors);

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
    const macroService = new MacroDataCalculationService();
    const indicators = await macroService.fetchMacroIndicators();

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