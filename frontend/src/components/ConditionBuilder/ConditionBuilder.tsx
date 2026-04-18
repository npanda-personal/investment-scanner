import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Button,
  Typography,
  Paper,
  Grid,
  Divider,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { ConditionNode, PrimitiveCondition, LogicalCondition, isLogicalCondition, IndicatorCondition } from '../../types/scanner';

interface ConditionBuilderProps {
  value?: ConditionNode;
  onChange?: (node: ConditionNode) => void;
}

const indicatorOptions = [
  { value: 'RSI', label: 'RSI (Relative Strength Index)' },
  { value: 'MACD', label: 'MACD (Moving Average Convergence Divergence)' },
  { value: 'SMA', label: 'SMA (Simple Moving Average)' },
  { value: 'EMA', label: 'EMA (Exponential Moving Average)' },
  { value: 'BB', label: 'Bollinger Bands (Middle)' },
  { value: 'STOCH', label: 'Stochastic %K' },
  { value: 'ADX', label: 'ADX (Average Directional Index)' },
  { value: 'ATR', label: 'ATR (Average True Range)' },
  { value: 'OBV', label: 'OBV (On‑Balance Volume)' },
  { value: 'WILLR', label: 'Williams %R' },
  { value: 'CCI', label: 'CCI (Commodity Channel Index)' },
  { value: 'ROC', label: 'ROC (Rate of Change)' },
];

const operatorOptions = [
  { value: '>', label: 'greater than' },
  { value: '>=', label: 'greater than or equal' },
  { value: '<', label: 'less than' },
  { value: '<=', label: 'less than or equal' },
  { value: '==', label: 'equals' },
  { value: '!=', label: 'not equals' },
];

const defaultIndicatorCondition: PrimitiveCondition = {
  type: 'indicator',
  name: 'RSI',
  parameters: {},
  operator: '>',
  value: 70,
};

const ConditionBuilder: React.FC<ConditionBuilderProps> = ({ value, onChange }) => {
  const [condition, setCondition] = useState<ConditionNode>(value || defaultIndicatorCondition);

  useEffect(() => {
    if (value) {
      setCondition(value);
    }
  }, [value]);

  const handleChange = (newCondition: ConditionNode) => {
    setCondition(newCondition);
    onChange?.(newCondition);
  };

  const renderPrimitive = (prim: PrimitiveCondition, _index: number) => {
    if (prim.type === 'indicator') {
      return (
        <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Indicator</InputLabel>
                <Select
                  value={prim.name}
                  label="Indicator"
                  onChange={(e) => {
                    const newPrim: PrimitiveCondition = {
                      ...prim,
                      name: e.target.value as IndicatorCondition['name'],
                    };
                    handleChange(newPrim);
                  }}
                >
                  {indicatorOptions.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Operator</InputLabel>
                <Select
                  value={prim.operator}
                  label="Operator"
                  onChange={(e) => {
                    const newPrim: PrimitiveCondition = {
                      ...prim,
                      operator: e.target.value as PrimitiveCondition['operator'],
                    };
                    handleChange(newPrim);
                  }}
                >
                  {operatorOptions.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                size="small"
                label="Value"
                type="number"
                value={prim.value}
                onChange={(e) => {
                  const newPrim: PrimitiveCondition = {
                    ...prim,
                    value: parseFloat(e.target.value) || 0,
                  };
                  handleChange(newPrim);
                }}
              />
            </Grid>
            <Grid item xs={12} sm={2}>
              <TextField
                fullWidth
                size="small"
                label="Period"
                type="number"
                value={prim.parameters?.period || 14}
                onChange={(e) => {
                  const newPrim: PrimitiveCondition = {
                    ...prim,
                    parameters: { ...prim.parameters, period: parseInt(e.target.value) || 14 },
                  };
                  handleChange(newPrim);
                }}
                helperText="Indicator period"
              />
            </Grid>
            <Grid item xs={12} sm={1} display="flex" justifyContent="flex-end">
              <IconButton
                size="small"
                color="error"
                onClick={() => {
                  // In a real implementation, this would remove the condition from a list
                  // For now, we'll reset to default
                  handleChange(defaultIndicatorCondition);
                }}
              >
                <DeleteIcon />
              </IconButton>
            </Grid>
          </Grid>
        </Paper>
      );
    }
    // TODO: support price, change, fundamental
    return null;
  };

  const renderLogical = (logical: LogicalCondition) => {
    return (
      <Paper elevation={2} sx={{ p: 2, mb: 2, borderLeft: '4px solid', borderColor: 'primary.main' }}>
        <Typography variant="subtitle1" fontWeight="bold">
          {logical.operator.toUpperCase()} Group
        </Typography>
        <Divider sx={{ my: 1 }} />
        <Box>
          {logical.conditions.map((cond, idx) => (
            <Box key={idx}>
              {isLogicalCondition(cond) ? renderLogical(cond) : renderPrimitive(cond, idx)}
            </Box>
          ))}
        </Box>
        <Button startIcon={<AddIcon />} size="small" sx={{ mt: 1 }}>
          Add Condition to Group
        </Button>
      </Paper>
    );
  };

  return (
    <Box>
      {isLogicalCondition(condition) ? renderLogical(condition) : renderPrimitive(condition, 0)}
      <Box display="flex" gap={2} mt={2}>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => {
            // Add a new primitive condition (for now just replace)
            const newPrim: PrimitiveCondition = {
              type: 'indicator',
              name: 'RSI',
              parameters: {},
              operator: '>',
              value: 70,
            };
            handleChange(newPrim);
          }}
        >
          Add Condition
        </Button>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => {
            // Convert current condition into a logical AND group
            const newLogical: LogicalCondition = {
              operator: 'and',
              conditions: [condition],
            };
            handleChange(newLogical);
          }}
        >
          Add Group (AND/OR)
        </Button>
      </Box>
    </Box>
  );
};

export default ConditionBuilder;