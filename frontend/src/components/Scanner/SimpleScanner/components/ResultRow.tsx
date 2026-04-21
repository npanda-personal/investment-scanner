import React, { useState } from 'react';
import {
  TableRow,
  TableCell,
  IconButton,
  Collapse,
  Box,
  Typography,
  Button,
  Chip,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import AddIcon from '@mui/icons-material/Add';
import SignalBadge from './SignalBadge';
import { SimplifiedOpportunity } from '../../../../types/simple-scanner';

interface ResultRowProps {
  opportunity: SimplifiedOpportunity;
  onAddToWatchlist?: (symbol: string) => void;
  rank?: number;
  isTopInSection?: boolean;
}

const ResultRow: React.FC<ResultRowProps> = ({ opportunity, onAddToWatchlist, rank, isTopInSection }) => {
  const [expanded, setExpanded] = useState(false);

  // Format price with 2 decimal places
  const formatPrice = (price: number) => {
    return `$${price.toFixed(2)}`;
  };

  // Format percentage change with sign
  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
  };

  // Get color for change
  const getChangeColor = (change: number) => {
    return change >= 0 ? 'success.main' : 'error.main';
  };

  // Get conviction score (use conviction if available, otherwise score)
  const getConvictionScore = () => {
    return opportunity.conviction ?? opportunity.score;
  };

  // Get conviction badge color
  const getConvictionColor = (score: number) => {
    if (score >= 85) return 'success'; // VERY HIGH - green
    if (score >= 70) return 'success'; // HIGH - green
    if (score >= 50) return 'warning'; // MEDIUM - orange
    return 'error'; // LOW - red
  };

  // Get conviction badge text based on confidence level
  const getConvictionText = (score: number) => {
    if (score >= 85) return '🔥 VERY HIGH';
    if (score >= 70) return '🟢 HIGH';
    if (score >= 50) return '🟡 MEDIUM';
    return '🔴 LOW';
  };

  // Get color for confidence level
  const getConfidenceColor = (level?: string) => {
    switch(level) {
      case 'VERY_HIGH': return '#10b981'; // green
      case 'HIGH': return '#84cc16'; // lime
      case 'MEDIUM': return '#f59e0b'; // orange
      default: return '#ef4444'; // red
    }
  };

  // Get volume badge display properties with context-aware labels
  const getVolumeBadge = (
    visibility?: 'HIGH' | 'NORMAL' | 'LOW',
    alignment?: string,
    changePct?: number
  ) => {
    // Parse daily trend from alignment string (format: "DAILY/WEEKLY/MONTHLY")
    let dailyTrend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    if (alignment) {
      const parts = alignment.split('/');
      if (parts.length > 0) {
        const trend = parts[0];
        if (trend === 'BULLISH') dailyTrend = 'BULLISH';
        else if (trend === 'BEARISH') dailyTrend = 'BEARISH';
      }
    }
    
    // Determine price direction
    const isPriceUp = (changePct || 0) > 0;
    
    switch(visibility) {
      case 'HIGH':
        // Context-aware high volume labels
        if (dailyTrend === 'BULLISH' && isPriceUp) {
          return {
            label: '🟢 High Vol + Uptrend',
            color: 'success',
            bgColor: '#10b98120',
            title: 'Accumulation (bullish) - High volume confirming uptrend'
          };
        } else if (dailyTrend === 'BEARISH' && !isPriceUp) {
          return {
            label: '🔴 High Vol + Downtrend',
            color: 'error',
            bgColor: '#ef444420',
            title: 'Distribution (bearish) - High volume confirming downtrend'
          };
        } else {
          return {
            label: '⚠️ High Vol',
            color: 'warning',
            bgColor: '#f59e0b20',
            title: 'High volume with mixed signals'
          };
        }
      case 'LOW':
        return {
          label: '⚪ Low Vol',
          color: 'default',
          bgColor: '#6b728020',
          title: 'Low interest/participation'
        };
      case 'NORMAL':
      default:
        return {
          label: '🔵 Normal Vol',
          color: 'info',
          bgColor: '#3b82f620',
          title: 'Average market participation'
        };
    }
  };

  // Get risk badge display properties
  const getRiskBadge = (riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH') => {
    switch(riskLevel) {
      case 'LOW':
        return { label: '🟢 Low Risk', color: 'success', bgColor: '#10b98120' };
      case 'HIGH':
        return { label: '🔴 High Risk', color: 'error', bgColor: '#ef444420' };
      case 'MEDIUM':
      default:
        return { label: '🟡 Medium Risk', color: 'warning', bgColor: '#f59e0b20' };
    }
  };

  // Get setup type display properties
  const getSetupBadge = (setupType?: 'PULLBACK' | 'BREAKOUT' | 'REVERSAL' | 'RANGE') => {
    switch(setupType) {
      case 'PULLBACK':
        return { label: '↘️ Pullback', color: 'info', bgColor: '#3b82f620' };
      case 'BREAKOUT':
        return { label: '🚀 Breakout', color: 'success', bgColor: '#10b98120' };
      case 'REVERSAL':
        return { label: '🔄 Reversal', color: 'warning', bgColor: '#f59e0b20' };
      case 'RANGE':
        return { label: '↔️ Range', color: 'default', bgColor: '#6b728020' };
      default:
        return { label: 'N/A', color: 'default', bgColor: '#6b728020' };
    }
  };

  // Get entry quality badge properties
  const getEntryQualityBadge = (entryQuality?: 'IDEAL' | 'OK' | 'LATE') => {
    switch(entryQuality) {
      case 'IDEAL':
        return { label: '🎯 Ideal Entry', color: 'success', bgColor: '#10b98120', icon: '🎯' };
      case 'OK':
        return { label: '⚖️ OK Entry', color: 'warning', bgColor: '#f59e0b20', icon: '⚖️' };
      case 'LATE':
        return { label: '⏰ Late Entry', color: 'error', bgColor: '#ef444420', icon: '⏰' };
      default:
        return { label: 'N/A', color: 'default', bgColor: '#6b728020', icon: '❓' };
    }
  };

  // Distance to support badge - clearer decision labels
  const getDistanceToSupportBadge = (distance?: 'NEAR' | 'MID' | 'FAR') => {
    switch(distance) {
      case 'NEAR':
        return { label: '🟢 Near Support', color: 'success', bgColor: '#10b98120', icon: '🟢' };
      case 'MID':
        return { label: '🟡 Acceptable Entry', color: 'warning', bgColor: '#f59e0b20', icon: '🟡' };
      case 'FAR':
        return { label: '🔴 Extended / Far', color: 'error', bgColor: '#ef444420', icon: '🔴' };
      default:
        return { label: 'N/A', color: 'default', bgColor: '#6b728020', icon: '❓' };
    }
  };

  // Trend strength badge
  const getTrendStrengthBadge = (strength?: 'STRONG' | 'MODERATE' | 'WEAK') => {
    switch(strength) {
      case 'STRONG':
        return { label: '💪 Strong Trend', color: 'success', bgColor: '#10b98120', icon: '💪' };
      case 'MODERATE':
        return { label: '📈 Moderate Trend', color: 'warning', bgColor: '#f59e0b20', icon: '📈' };
      case 'WEAK':
        return { label: '📉 Weak Trend', color: 'error', bgColor: '#ef444420', icon: '📉' };
      default:
        return { label: 'N/A', color: 'default', bgColor: '#6b728020', icon: '❓' };
    }
  };

  // Portfolio relevance badge (position sizing guidance)
  const getPortfolioRelevanceBadge = (relevance?: 'CORE' | 'SATELLITE' | 'AVOID' | 'SMALL') => {
    switch(relevance) {
      case 'CORE':
        return { label: '🎯 Core Position (3-5%)', color: 'success', bgColor: '#10b98120', icon: '🎯' };
      case 'SATELLITE':
        return { label: '🛰️ Satellite (1-3%)', color: 'info', bgColor: '#3b82f620', icon: '🛰️' };
      case 'SMALL':
        return { label: '📊 Small (0.5-1%)', color: 'warning', bgColor: '#f59e0b20', icon: '📊' };
      case 'AVOID':
        return { label: '🚫 Avoid Position', color: 'error', bgColor: '#ef444420', icon: '🚫' };
      default:
        return { label: 'N/A', color: 'default', bgColor: '#6b728020', icon: '❓' };
    }
  };

  // Format alignment for display - create compact pills [D] [W] [M]
  const formatAlignment = (alignment?: string) => {
    if (!alignment) return null;
    
    // Split by slash to get daily, weekly, monthly trends
    const parts = alignment.split('/');
    if (parts.length < 3) return null;
    
    const [daily, weekly, monthly] = parts;
    
    // Helper to convert trend to color and emoji
    const getTrendConfig = (trend: string) => {
      const trendUpper = trend.trim().toUpperCase();
      switch(trendUpper) {
        case 'BULLISH': return { color: '#10b981', bgColor: '#10b98120', emoji: '🟢', label: 'Bullish' };
        case 'BEARISH': return { color: '#ef4444', bgColor: '#ef444420', emoji: '🔴', label: 'Bearish' };
        case 'NEUTRAL': return { color: '#6b7280', bgColor: '#6b728020', emoji: '⚪', label: 'Neutral' };
        default: return { color: '#6b7280', bgColor: '#6b728020', emoji: '❓', label: 'Unknown' };
      }
    };
    
    const dailyConfig = getTrendConfig(daily);
    const weeklyConfig = getTrendConfig(weekly);
    const monthlyConfig = getTrendConfig(monthly);
    
    return { daily: dailyConfig, weekly: weeklyConfig, monthly: monthlyConfig };
  };

  // Get decision display properties
  const getDecisionDisplay = (decision?: 'BUY' | 'WATCH' | 'AVOID') => {
    switch (decision) {
      case 'BUY':
        return {
          text: '✅ BUY',
          color: '#10b981', // green
          bgColor: '#10b98120',
          icon: '✅',
          reason: 'High conviction + aligned trend'
        };
      case 'WATCH':
        return {
          text: '⚠️ WATCH',
          color: '#f59e0b', // yellow/orange
          bgColor: '#f59e0b20',
          icon: '⚠️',
          reason: 'Trend not fully aligned'
        };
      case 'AVOID':
        return {
          text: '❌ AVOID',
          color: '#ef4444', // red
          bgColor: '#ef444420',
          icon: '❌',
          reason: 'Poor setup or risk'
        };
      default:
        return {
          text: 'N/A',
          color: '#6b7280', // gray
          bgColor: '#6b728020',
          icon: '',
          reason: 'No decision'
        };
    }
  };

  // Get decision reason based on opportunity data
  const getDecisionReason = (opportunity: SimplifiedOpportunity): string => {
    if (!opportunity.decision) return 'No decision';
    
    // Use insight if available
    if (opportunity.insight) {
      // Extract short reason from insight
      const insight = opportunity.insight.toLowerCase();
      if (insight.includes('bearish')) return 'Bearish trend';
      if (insight.includes('neutral') || insight.includes('range')) return 'Range-bound';
      if (insight.includes('mixed')) return 'Mixed signals';
      if (insight.includes('low conviction')) return 'Low conviction';
      if (insight.includes('poor alignment')) return 'Poor alignment';
    }
    
    // Fallback to alignment-based reason
    if (opportunity.alignment) {
      const parts = opportunity.alignment.split('/');
      if (parts.length >= 2) {
        const weeklyTrend = parts[1]?.trim();
        if (weeklyTrend === 'BEARISH') return 'Weekly bearish';
        if (weeklyTrend === 'NEUTRAL') return 'Weekly neutral';
      }
    }
    
    // Default reasons based on decision
    switch (opportunity.decision) {
      case 'BUY': return 'High conviction + aligned trend';
      case 'WATCH': return 'Trend not fully aligned';
      case 'AVOID': return 'Poor setup or risk';
      default: return 'No clear edge';
    }
  };

  return (
    <>
      <TableRow
        sx={{
          '& > *': { borderBottom: 'unset' },
          backgroundColor: expanded ? 'action.hover' : 'inherit',
          cursor: 'pointer',
          '&:hover': {
            backgroundColor: 'action.hover',
          },
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <TableCell>
          <IconButton
            aria-label="expand row"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
          >
            {expanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Rank badge for top positions */}
            {rank && rank <= 3 && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  backgroundColor: isTopInSection ?
                    (opportunity.decision === 'BUY' ? '#10b981' :
                     opportunity.decision === 'WATCH' ? '#f59e0b' : '#ef4444') :
                    'action.hover',
                  color: isTopInSection ? 'white' : 'text.secondary',
                  fontSize: '0.7rem',
                  fontWeight: 'bold',
                  border: isTopInSection ? '2px solid white' : '1px solid',
                  borderColor: 'divider',
                  boxShadow: isTopInSection ? '0 2px 4px rgba(0,0,0,0.2)' : 'none',
                }}
                title={`Rank #${rank} in ${opportunity.decision || 'section'}`}
              >
                {rank}
              </Box>
            )}
            <Box>
              <Typography variant="body1" fontWeight="bold">
                {opportunity.symbol}
              </Typography>
              {opportunity.companyName && (
                <Typography variant="caption" color="text.secondary">
                  {opportunity.companyName}
                </Typography>
              )}
            </Box>
          </Box>
        </TableCell>
        <TableCell>
          <Typography variant="body1" fontWeight="medium">
            {formatPrice(opportunity.price)}
          </Typography>
        </TableCell>
        <TableCell>
          <Typography
            variant="body1"
            color={getChangeColor(opportunity.changePct)}
            fontWeight="medium"
          >
            {formatChange(opportunity.changePct)}
          </Typography>
        </TableCell>
        <TableCell>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Chip
              label={`${getConvictionText(getConvictionScore())} (${getConvictionScore().toFixed(0)})`}
              color={getConvictionColor(getConvictionScore())}
              size="small"
              variant="outlined"
              title={`Conviction score: ${getConvictionScore().toFixed(0)}`}
            />
            {opportunity.confidenceLevel && (
              <Typography
                variant="caption"
                sx={{
                  color: getConfidenceColor(opportunity.confidenceLevel),
                  fontWeight: 'medium',
                  display: 'inline-block',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: `${getConfidenceColor(opportunity.confidenceLevel)}20`,
                }}
              >
                {opportunity.confidenceLevel.replace('_', ' ')}
              </Typography>
            )}
          </Box>
        </TableCell>
        <TableCell>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
            {opportunity.decision && (
              <>
                <Typography
                  variant="body2"
                  fontWeight="bold"
                  sx={{
                    color: getDecisionDisplay(opportunity.decision).color,
                    backgroundColor: getDecisionDisplay(opportunity.decision).bgColor,
                    padding: '4px 8px',
                    borderRadius: '4px',
                    display: 'inline-block',
                    textAlign: 'center',
                    minWidth: '80px',
                  }}
                  title={`Decision: ${opportunity.decision} - Based on conviction ${getConvictionScore()} and alignment`}
                >
                  {getDecisionDisplay(opportunity.decision).text}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: 'text.secondary',
                    fontSize: '0.7rem',
                    maxWidth: '100px',
                    textAlign: 'center',
                    lineHeight: 1,
                  }}
                  title={`Reason: ${getDecisionReason(opportunity)}`}
                >
                  {getDecisionReason(opportunity)}
                </Typography>
              </>
            )}
          </Box>
        </TableCell>
        <TableCell>
          {(() => {
            const alignmentData = formatAlignment(opportunity.alignment);
            if (!alignmentData) {
              return (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ fontFamily: 'monospace' }}
                >
                  N/A
                </Typography>
              );
            }
            
            const { daily, weekly, monthly } = alignmentData;
            const pillStyle = {
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '24px',
              height: '24px',
              borderRadius: '4px',
              border: '1px solid',
              fontSize: '0.7rem',
              fontWeight: 'bold',
              margin: '0 2px',
              fontFamily: 'monospace',
            };
            
            return (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box
                  title={`Daily: ${daily.label}`}
                  sx={{
                    ...pillStyle,
                    borderColor: daily.color,
                    backgroundColor: daily.bgColor,
                    color: daily.color,
                  }}
                >
                  D
                </Box>
                <Box
                  title={`Weekly: ${weekly.label}`}
                  sx={{
                    ...pillStyle,
                    borderColor: weekly.color,
                    backgroundColor: weekly.bgColor,
                    color: weekly.color,
                  }}
                >
                  W
                </Box>
                <Box
                  title={`Monthly: ${monthly.label}`}
                  sx={{
                    ...pillStyle,
                    borderColor: monthly.color,
                    backgroundColor: monthly.bgColor,
                    color: monthly.color,
                  }}
                >
                  M
                </Box>
              </Box>
            );
          })()}
          {opportunity.insight && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                display: 'block',
                maxWidth: '150px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                cursor: 'help',
              }}
              title={opportunity.insight}
            >
              {opportunity.insight}
            </Typography>
          )}
        </TableCell>
        <TableCell>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {/* Primary layer - Structure indicators */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {/* Volume context */}
              {opportunity.volumeVisibility && (
                <Chip
                  size="small"
                  label={getVolumeBadge(opportunity.volumeVisibility, opportunity.alignment, opportunity.changePct).label}
                  color={getVolumeBadge(opportunity.volumeVisibility, opportunity.alignment, opportunity.changePct).color as any}
                  variant="outlined"
                  sx={{
                    fontSize: '0.7rem',
                    backgroundColor: getVolumeBadge(opportunity.volumeVisibility, opportunity.alignment, opportunity.changePct).bgColor
                  }}
                  title={getVolumeBadge(opportunity.volumeVisibility, opportunity.alignment, opportunity.changePct).title || `Volume: ${opportunity.volumeVisibility}`}
                />
              )}
              
              {/* Trend strength */}
              {opportunity.trendStrength && (
                <Chip
                  size="small"
                  label={getTrendStrengthBadge(opportunity.trendStrength).label}
                  color={getTrendStrengthBadge(opportunity.trendStrength).color as any}
                  variant="outlined"
                  sx={{
                    fontSize: '0.7rem',
                    backgroundColor: getTrendStrengthBadge(opportunity.trendStrength).bgColor
                  }}
                  title={`Trend strength: ${opportunity.trendStrength}`}
                />
              )}
              
              {/* Entry quality / Distance to support */}
              {opportunity.distanceToSupport && (
                <Chip
                  size="small"
                  label={getDistanceToSupportBadge(opportunity.distanceToSupport).label}
                  color={getDistanceToSupportBadge(opportunity.distanceToSupport).color as any}
                  variant="outlined"
                  sx={{
                    fontSize: '0.7rem',
                    backgroundColor: getDistanceToSupportBadge(opportunity.distanceToSupport).bgColor
                  }}
                  title={`Entry position: ${opportunity.distanceToSupport}`}
                />
              )}
            </Box>
            
            {/* Secondary layer - Technical indicators (collapsed by default) */}
            {opportunity.signals.length > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                  Indicators:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.3 }}>
                  {opportunity.signals.slice(0, 3).map((signal, index) => (
                    <Chip
                      key={index}
                      size="small"
                      label={signal.name}
                      variant="outlined"
                      sx={{
                        fontSize: '0.6rem',
                        height: '20px',
                        backgroundColor: 'transparent',
                        borderColor: 'divider',
                        color: 'text.secondary'
                      }}
                      title={`${signal.name}: ${signal.description || 'Technical indicator'}`}
                    />
                  ))}
                  {opportunity.signals.length > 3 && (
                    <Chip
                      size="small"
                      label={`+${opportunity.signals.length - 3}`}
                      variant="outlined"
                      sx={{
                        fontSize: '0.6rem',
                        height: '20px',
                        backgroundColor: 'transparent',
                        borderColor: 'divider',
                        color: 'text.secondary'
                      }}
                      title={`${opportunity.signals.length} total indicators`}
                    />
                  )}
                </Box>
              </Box>
            )}
          </Box>
        </TableCell>
        <TableCell>
          {onAddToWatchlist && (
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onAddToWatchlist(opportunity.symbol);
              }}
              color="primary"
              title="Add to watchlist"
            >
              <AddIcon />
            </IconButton>
          )}
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 2 }}>
              <Typography variant="h6" gutterBottom>
                Market Insight
              </Typography>
              
              {opportunity.insight && (
                <Box sx={{ mb: 3, p: 2, backgroundColor: 'action.hover', borderRadius: 1 }}>
                  <Typography variant="body1" fontWeight="medium" color="primary.main">
                    {opportunity.insight}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    AI-generated market analysis based on multi-timeframe trends
                  </Typography>
                </Box>
              )}
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Trend Alignment
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  {(() => {
                    const alignmentData = formatAlignment(opportunity.alignment);
                    if (!alignmentData) {
                      return (
                        <Chip
                          label="N/A"
                          variant="outlined"
                          sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}
                        />
                      );
                    }
                    
                    const { daily, weekly, monthly } = alignmentData;
                    const pillStyle = {
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '24px',
                      height: '24px',
                      borderRadius: '4px',
                      border: '1px solid',
                      fontSize: '0.7rem',
                      fontWeight: 'bold',
                      margin: '0 2px',
                      fontFamily: 'monospace',
                    };
                    
                    return (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box
                          title={`Daily: ${daily.label}`}
                          sx={{
                            ...pillStyle,
                            borderColor: daily.color,
                            backgroundColor: daily.bgColor,
                            color: daily.color,
                          }}
                        >
                          D
                        </Box>
                        <Box
                          title={`Weekly: ${weekly.label}`}
                          sx={{
                            ...pillStyle,
                            borderColor: weekly.color,
                            backgroundColor: weekly.bgColor,
                            color: weekly.color,
                          }}
                        >
                          W
                        </Box>
                        <Box
                          title={`Monthly: ${monthly.label}`}
                          sx={{
                            ...pillStyle,
                            borderColor: monthly.color,
                            backgroundColor: monthly.bgColor,
                            color: monthly.color,
                          }}
                        >
                          M
                        </Box>
                      </Box>
                    );
                  })()}
                  <Typography variant="body2" color="text.secondary">
                    Daily / Weekly / Monthly
                  </Typography>
                </Box>
                
                {opportunity.setupType && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Typography variant="subtitle2">
                      Setup Type:
                    </Typography>
                    <Chip
                      size="small"
                      label={getSetupBadge(opportunity.setupType).label}
                      color={getSetupBadge(opportunity.setupType).color as any}
                      variant="outlined"
                      sx={{
                        fontSize: '0.75rem',
                        backgroundColor: getSetupBadge(opportunity.setupType).bgColor
                      }}
                    />
                  </Box>
                )}
                
                <Typography variant="subtitle2" gutterBottom>
                  Technical Signals ({opportunity.signals.length})
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Supporting technical indicators (downgraded importance):
                </Typography>
                
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  {opportunity.signals.map((signal, index) => (
                    <SignalBadge key={index} signal={signal} />
                  ))}
                </Box>
              </Box>
              
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Conviction Score
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {getConvictionScore().toFixed(0)}
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Confidence Level
                  </Typography>
                  <Typography
                    variant="body1"
                    fontWeight="medium"
                    sx={{ color: getConfidenceColor(opportunity.confidenceLevel) }}
                  >
                    {opportunity.confidenceLevel?.replace('_', ' ') || 'N/A'}
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Rank
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    #{opportunity.rank}
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Volume
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {(opportunity.volume / 1000000).toFixed(1)}M
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Risk Level
                  </Typography>
                  {opportunity.riskLevel ? (
                    <Chip
                      size="small"
                      label={getRiskBadge(opportunity.riskLevel).label}
                      color={getRiskBadge(opportunity.riskLevel).color as any}
                      variant="outlined"
                      sx={{
                        fontSize: '0.75rem',
                        backgroundColor: getRiskBadge(opportunity.riskLevel).bgColor
                      }}
                    />
                  ) : (
                    <Typography variant="body1" fontWeight="medium">
                      N/A
                    </Typography>
                  )}
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Entry Quality
                  </Typography>
                  {opportunity.entryQuality ? (
                    <Chip
                      size="small"
                      label={getEntryQualityBadge(opportunity.entryQuality).label}
                      color={getEntryQualityBadge(opportunity.entryQuality).color as any}
                      variant="outlined"
                      sx={{
                        fontSize: '0.75rem',
                        backgroundColor: getEntryQualityBadge(opportunity.entryQuality).bgColor
                      }}
                    />
                  ) : (
                    <Typography variant="body1" fontWeight="medium">
                      N/A
                    </Typography>
                  )}
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Distance to Support
                  </Typography>
                  {opportunity.distanceToSupport ? (
                    <Chip
                      size="small"
                      label={getDistanceToSupportBadge(opportunity.distanceToSupport).label}
                      color={getDistanceToSupportBadge(opportunity.distanceToSupport).color as any}
                      variant="outlined"
                      sx={{
                        fontSize: '0.75rem',
                        backgroundColor: getDistanceToSupportBadge(opportunity.distanceToSupport).bgColor
                      }}
                    />
                  ) : (
                    <Typography variant="body1" fontWeight="medium">
                      N/A
                    </Typography>
                  )}
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Trend Strength
                  </Typography>
                  {opportunity.trendStrength ? (
                    <Chip
                      size="small"
                      label={getTrendStrengthBadge(opportunity.trendStrength).label}
                      color={getTrendStrengthBadge(opportunity.trendStrength).color as any}
                      variant="outlined"
                      sx={{
                        fontSize: '0.75rem',
                        backgroundColor: getTrendStrengthBadge(opportunity.trendStrength).bgColor
                      }}
                    />
                  ) : (
                    <Typography variant="body1" fontWeight="medium">
                      N/A
                    </Typography>
                  )}
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Portfolio Relevance
                  </Typography>
                  {opportunity.portfolioRelevance ? (
                    <Chip
                      size="small"
                      label={getPortfolioRelevanceBadge(opportunity.portfolioRelevance).label}
                      color={getPortfolioRelevanceBadge(opportunity.portfolioRelevance).color as any}
                      variant="outlined"
                      sx={{
                        fontSize: '0.75rem',
                        backgroundColor: getPortfolioRelevanceBadge(opportunity.portfolioRelevance).bgColor
                      }}
                    />
                  ) : (
                    <Typography variant="body1" fontWeight="medium">
                      N/A
                    </Typography>
                  )}
                </Box>
                
                {opportunity.sector && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Sector
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {opportunity.sector}
                    </Typography>
                  </Box>
                )}
              </Box>
              
              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                {onAddToWatchlist && (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={() => onAddToWatchlist(opportunity.symbol)}
                  >
                    Add to Watchlist
                  </Button>
                )}
                <Button size="small" variant="text">
                  View Details
                </Button>
              </Box>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

export default ResultRow;