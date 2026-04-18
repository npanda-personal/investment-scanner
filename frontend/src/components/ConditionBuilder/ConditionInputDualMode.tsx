import React, { useState, useEffect, useRef } from 'react';
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
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import CodeIcon from '@mui/icons-material/Code';
import DesignServicesIcon from '@mui/icons-material/DesignServices';
import { ConditionNode, PrimitiveCondition, isLogicalCondition } from '../../types/scanner';

interface ConditionInputDualModeProps {
  value?: ConditionNode;
  onChange?: (node: ConditionNode) => void;
}

interface Row {
  id: number;
  field: string;
  operator: string;
  value: string;
}

interface Group {
  id: number;
  logicalOperator: 'and' | 'or';
  rows: Row[];
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

// Generate a unique ID for each row
let nextId = 1;
// Generate a unique ID for each group
let nextGroupId = 1;

const ConditionInputDualMode: React.FC<ConditionInputDualModeProps> = ({ value, onChange }) => {
  // Mode: 'visual' or 'json'
  const [mode, setMode] = useState<'visual' | 'json'>('visual');
  // Visual groups state
  const [groups, setGroups] = useState<Group[]>([{ id: nextGroupId++, logicalOperator: 'and', rows: [] }]);
  // JSON raw string
  const [jsonString, setJsonString] = useState('');
  // JSON validation error
  const [jsonError, setJsonError] = useState<string | null>(null);

  const prevValueRef = useRef<ConditionNode | undefined>(undefined);
  const prevGroupsRef = useRef<Group[]>([]);
  // Initialize from prop value
  useEffect(() => {
    // Skip if value hasn't changed
    if (value === prevValueRef.current) {
      return;
    }
    prevValueRef.current = value;
    if (value) {
      // Convert ConditionNode to groups
      try {
        const newGroups = conditionNodeToGroups(value);
        setGroups(newGroups);
        setJsonString(JSON.stringify(value, null, 2));
        setJsonError(null);
      } catch (err) {
        console.error('Failed to parse condition node', err);
        // Fallback: set default empty group
        setGroups([{ id: nextGroupId++, logicalOperator: 'and', rows: [] }]);
        setJsonString(JSON.stringify(value, null, 2));
      }
    } else {
      // Default empty state
      setGroups([{ id: nextGroupId++, logicalOperator: 'and', rows: [] }]);
      setJsonString('');
      setJsonError(null);
    }
  }, [value]);

  // When visual groups change, update condition node and JSON
  useEffect(() => {
    if (mode === 'visual') {
      // Check if groups actually changed
      if (JSON.stringify(groups) === JSON.stringify(prevGroupsRef.current)) {
        // No change, skip
        return;
      }
      prevGroupsRef.current = groups;

      const node = groupsToConditionNode(groups);
      if (node) {
        // Only call onChange if the node is different from the current value
        if (!value || JSON.stringify(node) !== JSON.stringify(value)) {
          onChange?.(node);
        }
        setJsonString(JSON.stringify(node, null, 2));
        setJsonError(null);
      } else {
        const dummy: PrimitiveCondition = { type: 'indicator', name: 'RSI', parameters: {}, operator: '>', value: 70 };
        if (!value || JSON.stringify(dummy) !== JSON.stringify(value)) {
          onChange?.(dummy);
        }
      }
    }
  }, [groups, mode, value, onChange]);

  // Handle JSON input change
  const handleJsonChange = (newJson: string) => {
    setJsonString(newJson);
    try {
      JSON.parse(newJson);
      // Validate it's a ConditionNode (simplified)
      setJsonError(null);
      // Optionally update visual rows if mode is json? Not automatically
    } catch (err: any) {
      setJsonError(err.message);
    }
  };

  // Switch mode
  const handleModeChange = (newMode: 'visual' | 'json') => {
    if (newMode === 'visual' && mode === 'json') {
      // Try to parse JSON and convert to groups
      try {
        const parsed = JSON.parse(jsonString);
        const newGroups = conditionNodeToGroups(parsed);
        setGroups(newGroups);
        setJsonError(null);
      } catch (err: any) {
        setJsonError(err.message);
        // Keep in JSON mode? We'll still switch but show error
      }
    }
    setMode(newMode);
  };

  // Group management
  const addGroup = () => {
    const newGroup: Group = {
      id: nextGroupId++,
      logicalOperator: 'and',
      rows: [],
    };
    setGroups([...groups, newGroup]);
  };

  const removeGroup = (groupId: number) => {
    setGroups(groups.filter(g => g.id !== groupId));
  };

  const updateGroupOperator = (groupId: number, operator: 'and' | 'or') => {
    setGroups(groups.map(g => g.id === groupId ? { ...g, logicalOperator: operator } : g));
  };

  // Row management within a group
  const addRowToGroup = (groupId: number) => {
    const newRow: Row = {
      id: nextId++,
      field: 'RSI',
      operator: '>',
      value: '70',
    };
    setGroups(groups.map(g => g.id === groupId ? { ...g, rows: [...g.rows, newRow] } : g));
  };

  const updateRowInGroup = (groupId: number, rowId: number, field: keyof Row, newValue: string) => {
    setGroups(groups.map(g => {
      if (g.id === groupId) {
        return {
          ...g,
          rows: g.rows.map(row => row.id === rowId ? { ...row, [field]: newValue } : row)
        };
      }
      return g;
    }));
  };

  const removeRowFromGroup = (groupId: number, rowId: number) => {
    setGroups(groups.map(g => {
      if (g.id === groupId) {
        return {
          ...g,
          rows: g.rows.filter(row => row.id !== rowId)
        };
      }
      return g;
    }));
  };

  // Render visual builder
  const renderVisualBuilder = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="subtitle1">Condition Groups</Typography>
        <Button startIcon={<AddIcon />} variant="contained" onClick={addGroup}>
          Add Group
        </Button>
      </Box>
      {groups.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 2 }}>
          No groups added. Click "Add Group" to start.
        </Typography>
      ) : (
        groups.map((group) => (
          <Paper key={group.id} elevation={2} sx={{ p: 2, mb: 3, borderLeft: '4px solid', borderColor: 'primary.main' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="subtitle1" fontWeight="bold">
                Group ({group.rows.length} condition{group.rows.length !== 1 ? 's' : ''})
              </Typography>
              <Box display="flex" alignItems="center" gap={2}>
                <Tooltip title="Choose how conditions within this group are combined">
                  <ToggleButtonGroup
                    value={group.logicalOperator}
                    exclusive
                    onChange={(_, val) => val && updateGroupOperator(group.id, val)}
                    size="small"
                  >
                    <ToggleButton value="and">AND</ToggleButton>
                    <ToggleButton value="or">OR</ToggleButton>
                  </ToggleButtonGroup>
                </Tooltip>
                <IconButton size="small" color="error" onClick={() => removeGroup(group.id)}>
                  <DeleteIcon />
                </IconButton>
              </Box>
            </Box>
            {group.rows.length === 0 ? (
              <Typography color="text.secondary" sx={{ py: 2 }}>
                No conditions in this group. Click "Add Condition" below.
              </Typography>
            ) : (
              group.rows.map((row) => (
                <Paper key={row.id} elevation={1} sx={{ p: 2, mb: 2 }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={4}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Indicator</InputLabel>
                        <Select
                          value={row.field}
                          label="Indicator"
                          onChange={(e) => updateRowInGroup(group.id, row.id, 'field', e.target.value)}
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
                          value={row.operator}
                          label="Operator"
                          onChange={(e) => updateRowInGroup(group.id, row.id, 'operator', e.target.value)}
                        >
                          {operatorOptions.map((opt) => (
                            <MenuItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Value"
                        value={row.value}
                        onChange={(e) => updateRowInGroup(group.id, row.id, 'value', e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={2} display="flex" justifyContent="flex-end">
                      <IconButton size="small" color="error" onClick={() => removeRowFromGroup(group.id, row.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </Grid>
                  </Grid>
                </Paper>
              ))
            )}
            <Button startIcon={<AddIcon />} variant="outlined" onClick={() => addRowToGroup(group.id)} sx={{ mt: 1 }}>
              Add Condition to Group
            </Button>
          </Paper>
        ))
      )}
    </Box>
  );

  // Render JSON editor
  const renderJsonEditor = () => (
    <Box>
      <TextField
        fullWidth
        multiline
        rows={8}
        value={jsonString}
        onChange={(e) => handleJsonChange(e.target.value)}
        variant="outlined"
        placeholder='{"type":"indicator","name":"RSI","operator":">","value":70}'
        error={!!jsonError}
        helperText={jsonError || 'Enter a valid JSON condition object.'}
      />
    </Box>
  );

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="subtitle1">Condition Input Mode</Typography>
        <ToggleButtonGroup
          value={mode}
          exclusive
          onChange={(_, val) => val && handleModeChange(val)}
          aria-label="input mode"
        >
          <ToggleButton value="visual" aria-label="visual builder">
            <DesignServicesIcon sx={{ mr: 1 }} /> Visual Builder
          </ToggleButton>
          <ToggleButton value="json" aria-label="json editor">
            <CodeIcon sx={{ mr: 1 }} /> JSON
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>
      {mode === 'visual' ? renderVisualBuilder() : renderJsonEditor()}
    </Box>
  );
};

// Helper functions
function rowsToConditionNode(rows: Row[], logicalOp: 'and' | 'or'): ConditionNode | null {
  if (rows.length === 0) return null;
  const primitives: PrimitiveCondition[] = rows.map(row => ({
    type: 'indicator',
    name: row.field as any,
    parameters: {},
    operator: row.operator as any,
    value: parseFloat(row.value) || 0,
  }));
  if (primitives.length === 1) return primitives[0];
  return {
    operator: logicalOp,
    conditions: primitives,
  };
}

function conditionNodeToRows(node: ConditionNode): {
  rows: Row[];
  logicalOp: 'and' | 'or';
} {
  const rows: Row[] = [];
  let logicalOp: 'and' | 'or' = 'and';
  if (isLogicalCondition(node)) {
    logicalOp = node.operator === 'not' ? 'and' : node.operator; // map 'not' to 'and' for UI
    node.conditions.forEach((cond) => {
      if (!isLogicalCondition(cond) && cond.type === 'indicator') {
        rows.push({
          id: nextId++,
          field: cond.name,
          operator: cond.operator,
          value: cond.value.toString(),
        });
      }
    });
  } else if (node.type === 'indicator') {
    rows.push({
      id: nextId++,
      field: node.name,
      operator: node.operator,
      value: node.value.toString(),
    });
  }
  return { rows, logicalOp };
}

function groupsToConditionNode(groups: Group[]): ConditionNode | null {
  if (groups.length === 0) return null;
  // Filter out empty groups
  const nonEmptyGroups = groups.filter(g => g.rows.length > 0);
  if (nonEmptyGroups.length === 0) return null;

  // If there's only one group, return a logical condition (even if single row)
  if (nonEmptyGroups.length === 1) {
    const group = nonEmptyGroups[0];
    const primitives: PrimitiveCondition[] = group.rows.map(row => ({
      type: 'indicator',
      name: row.field as any,
      parameters: {},
      operator: row.operator as any,
      value: parseFloat(row.value) || 0,
    }));
    return {
      operator: group.logicalOperator,
      conditions: primitives,
    };
  }

  // Multiple groups: create a top-level AND group containing each group as a logical condition
  const topLevelConditions: ConditionNode[] = nonEmptyGroups.map(group => {
    const primitives: PrimitiveCondition[] = group.rows.map(row => ({
      type: 'indicator',
      name: row.field as any,
      parameters: {},
      operator: row.operator as any,
      value: parseFloat(row.value) || 0,
    }));
    return {
      operator: group.logicalOperator,
      conditions: primitives,
    };
  });
  return {
    operator: 'and', // default top-level operator
    conditions: topLevelConditions,
  };
}

function conditionNodeToGroups(node: ConditionNode): Group[] {
  const groups: Group[] = [];
  if (isLogicalCondition(node)) {
    // Check if node's children are all logical conditions (i.e., nested groups)
    const allChildrenAreLogical = node.conditions.every(isLogicalCondition);
    if (allChildrenAreLogical) {
      // Each child logical condition is a group
      node.conditions.forEach(child => {
        if (isLogicalCondition(child)) {
          const rows: Row[] = [];
          child.conditions.forEach(cond => {
            if (!isLogicalCondition(cond) && cond.type === 'indicator') {
              rows.push({
                id: nextId++,
                field: cond.name,
                operator: cond.operator,
                value: cond.value.toString(),
              });
            }
          });
          groups.push({
            id: nextGroupId++,
            logicalOperator: child.operator === 'not' ? 'and' : child.operator,
            rows,
          });
        }
      });
    } else {
      // Single group: node is a logical condition with primitive children
      const rows: Row[] = [];
      node.conditions.forEach(cond => {
        if (!isLogicalCondition(cond) && cond.type === 'indicator') {
          rows.push({
            id: nextId++,
            field: cond.name,
            operator: cond.operator,
            value: cond.value.toString(),
          });
        }
      });
      groups.push({
        id: nextGroupId++,
        logicalOperator: node.operator === 'not' ? 'and' : node.operator,
        rows,
      });
    }
  } else if (node.type === 'indicator') {
    // Single primitive condition -> single group with one row
    groups.push({
      id: nextGroupId++,
      logicalOperator: 'and',
      rows: [{
        id: nextId++,
        field: node.name,
        operator: node.operator,
        value: node.value.toString(),
      }],
    });
  }
  // If no groups, return at least one empty group?
  if (groups.length === 0) {
    groups.push({ id: nextGroupId++, logicalOperator: 'and', rows: [] });
  }
  return groups;
}

export default ConditionInputDualMode;