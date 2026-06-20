import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type {
  CreateTradeJournalInput,
  OutcomeStatus,
  TradeDecision,
  TradeDirection,
  TradeJournalEntry,
  UpdateTradeJournalInput,
} from '../types';

interface TradeEntryDialogProps {
  open: boolean;
  entry: TradeJournalEntry | null;
  onClose: () => void;
  onSave: (input: CreateTradeJournalInput | UpdateTradeJournalInput, id?: string) => Promise<void>;
}

const DIRECTIONS: TradeDirection[] = ['LONG', 'SHORT'];
const DECISIONS: TradeDecision[] = ['ACTED', 'SKIPPED', 'WATCHING'];
const OUTCOMES: OutcomeStatus[] = ['OPEN', 'CLOSED', 'INVALIDATED'];

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const toLocalIso = (dateStr: string) => new Date(dateStr + 'T00:00:00').toISOString();

interface FormState {
  symbol: string;
  direction: TradeDirection;
  decision: TradeDecision;
  reviewedAt: string;
  entryPrice: string;
  stopPrice: string;
  targetPrice: string;
  conviction: string;
  thesis: string;
  outcomeStatus: string;
  exitPrice: string;
  exitAt: string;
  notes: string;
  tagInput: string;
  tags: string[];
}

const emptyForm = (): FormState => ({
  symbol: '',
  direction: 'LONG',
  decision: 'ACTED',
  reviewedAt: today(),
  entryPrice: '',
  stopPrice: '',
  targetPrice: '',
  conviction: '',
  thesis: '',
  outcomeStatus: '',
  exitPrice: '',
  exitAt: '',
  notes: '',
  tagInput: '',
  tags: [],
});

function entryToForm(entry: TradeJournalEntry): FormState {
  return {
    symbol: entry.symbol,
    direction: entry.direction,
    decision: entry.decision,
    reviewedAt: entry.reviewedAt.slice(0, 10),
    entryPrice: entry.entryPrice != null ? String(entry.entryPrice) : '',
    stopPrice: entry.stopPrice != null ? String(entry.stopPrice) : '',
    targetPrice: entry.targetPrice != null ? String(entry.targetPrice) : '',
    conviction: entry.conviction != null ? String(entry.conviction) : '',
    thesis: entry.thesis ?? '',
    outcomeStatus: entry.outcomeStatus ?? '',
    exitPrice: entry.exitPrice != null ? String(entry.exitPrice) : '',
    exitAt: entry.exitAt ? entry.exitAt.slice(0, 10) : '',
    notes: entry.notes ?? '',
    tagInput: '',
    tags: [...entry.tags],
  };
}

function formToCreate(form: FormState): CreateTradeJournalInput {
  const input: CreateTradeJournalInput = {
    symbol: form.symbol.trim().toUpperCase(),
    direction: form.direction,
    decision: form.decision,
    reviewedAt: toLocalIso(form.reviewedAt),
  };
  if (form.entryPrice) input.entryPrice = Number(form.entryPrice);
  if (form.stopPrice) input.stopPrice = Number(form.stopPrice);
  if (form.targetPrice) input.targetPrice = Number(form.targetPrice);
  if (form.conviction) input.conviction = Number(form.conviction);
  if (form.thesis.trim()) input.thesis = form.thesis.trim();
  if (form.outcomeStatus) input.outcomeStatus = form.outcomeStatus as OutcomeStatus;
  if (form.exitPrice) input.exitPrice = Number(form.exitPrice);
  if (form.exitAt) input.exitAt = toLocalIso(form.exitAt);
  if (form.notes.trim()) input.notes = form.notes.trim();
  if (form.tags.length > 0) input.tags = form.tags;
  return input;
}

function formToUpdate(form: FormState): UpdateTradeJournalInput {
  return {
    symbol: form.symbol.trim().toUpperCase(),
    direction: form.direction,
    decision: form.decision,
    reviewedAt: toLocalIso(form.reviewedAt),
    entryPrice: form.entryPrice ? Number(form.entryPrice) : null,
    stopPrice: form.stopPrice ? Number(form.stopPrice) : null,
    targetPrice: form.targetPrice ? Number(form.targetPrice) : null,
    conviction: form.conviction ? Number(form.conviction) : null,
    thesis: form.thesis.trim() || null,
    outcomeStatus: form.outcomeStatus ? (form.outcomeStatus as OutcomeStatus) : null,
    exitPrice: form.exitPrice ? Number(form.exitPrice) : null,
    exitAt: form.exitAt ? toLocalIso(form.exitAt) : null,
    notes: form.notes.trim() || null,
    tags: form.tags,
  };
}

export default function TradeEntryDialog({ open, entry, onClose, onSave }: TradeEntryDialogProps) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = !!entry;

  useEffect(() => {
    if (open) {
      setForm(entry ? entryToForm(entry) : emptyForm());
      setError(null);
    }
  }, [open, entry]);

  const update = (field: keyof FormState, value: any) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'outcomeStatus' && value !== 'CLOSED') {
        next.exitPrice = '';
        next.exitAt = '';
      }
      return next;
    });
  };

  const addTag = () => {
    const tag = form.tagInput.trim();
    if (tag && !form.tags.includes(tag) && form.tags.length < 20) {
      setForm((prev) => ({ ...prev, tags: [...prev.tags, tag], tagInput: '' }));
    }
  };

  const removeTag = (tag: string) => setForm((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));

  const handleSave = async () => {
    if (!form.symbol.trim()) {
      setError('Symbol is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (isEdit) {
        await onSave(formToUpdate(form), entry.id);
      } else {
        await onSave(formToCreate(form));
      }
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? 'Edit Journal Entry' : 'New Journal Entry'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Typography color="error" variant="body2">{error}</Typography>}

          <Stack direction="row" spacing={2}>
            <TextField label="Symbol" value={form.symbol} onChange={(e) => update('symbol', e.target.value)} required fullWidth size="small" />
            <TextField label="Date" type="date" value={form.reviewedAt} onChange={(e) => update('reviewedAt', e.target.value)} required size="small" slotProps={{ inputLabel: { shrink: true } }} sx={{ minWidth: 160 }} />
          </Stack>

          <Stack direction="row" spacing={2}>
            <TextField select label="Direction" value={form.direction} onChange={(e) => update('direction', e.target.value)} size="small" fullWidth>
              {DIRECTIONS.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
            </TextField>
            <TextField select label="Decision" value={form.decision} onChange={(e) => update('decision', e.target.value)} size="small" fullWidth>
              {DECISIONS.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
            </TextField>
          </Stack>

          <Stack direction="row" spacing={2}>
            <TextField label="Entry Price" type="number" value={form.entryPrice} onChange={(e) => update('entryPrice', e.target.value)} size="small" fullWidth />
            <TextField label="Stop Price" type="number" value={form.stopPrice} onChange={(e) => update('stopPrice', e.target.value)} size="small" fullWidth />
            <TextField label="Target Price" type="number" value={form.targetPrice} onChange={(e) => update('targetPrice', e.target.value)} size="small" fullWidth />
          </Stack>

          <TextField label="Conviction (1–10)" type="number" value={form.conviction} onChange={(e) => update('conviction', e.target.value)} size="small" slotProps={{ htmlInput: { min: 1, max: 10 } }} sx={{ maxWidth: 200 }} />

          <TextField label="Thesis" value={form.thesis} onChange={(e) => update('thesis', e.target.value)} multiline minRows={2} maxRows={4} size="small" placeholder="What is the rationale for this trade idea?" />

          <Stack direction="row" spacing={2}>
            <TextField select label="Outcome" value={form.outcomeStatus} onChange={(e) => update('outcomeStatus', e.target.value)} size="small" fullWidth>
              <MenuItem value="">None</MenuItem>
              {OUTCOMES.map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
            </TextField>
            {form.outcomeStatus === 'CLOSED' && (
              <>
                <TextField label="Exit Price" type="number" value={form.exitPrice} onChange={(e) => update('exitPrice', e.target.value)} size="small" fullWidth />
                <TextField label="Exit Date" type="date" value={form.exitAt} onChange={(e) => update('exitAt', e.target.value)} size="small" slotProps={{ inputLabel: { shrink: true } }} sx={{ minWidth: 160 }} />
              </>
            )}
          </Stack>

          <TextField label="Notes" value={form.notes} onChange={(e) => update('notes', e.target.value)} multiline minRows={2} maxRows={4} size="small" />

          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField label="Add tag" value={form.tagInput} onChange={(e) => update('tagInput', e.target.value)} size="small" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} sx={{ maxWidth: 200 }} />
              <Button size="small" onClick={addTag} disabled={!form.tagInput.trim()}>Add</Button>
            </Stack>
            {form.tags.length > 0 && (
              <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 1, gap: 0.5 }}>
                {form.tags.map((tag) => <Chip key={tag} label={tag} size="small" onDelete={() => removeTag(tag)} />)}
              </Stack>
            )}
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving}>{saving ? 'Saving…' : isEdit ? 'Update' : 'Create'}</Button>
      </DialogActions>
    </Dialog>
  );
}
