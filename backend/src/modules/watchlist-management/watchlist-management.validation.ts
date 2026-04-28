import type { AddWatchlistItemRequest, CreateWatchlistRequest, UpdateWatchlistItemRequest, UpdateWatchlistRequest, WatchlistSortOption } from './watchlist-management.types';

const SORT_OPTIONS: WatchlistSortOption[] = ['recentlyAdded', 'signalScoreDesc', 'dailyChangeDesc', 'dailyChangeAsc', 'symbolAsc'];
const MAX_NOTES_LENGTH = 1000;
const MAX_TAG_LENGTH = 40;
const MAX_TAGS = 12;

export function validateWatchlistInput(input: CreateWatchlistRequest | UpdateWatchlistRequest, partial = false): string[] {
  const errors: string[] = [];
  if (!partial || input.name !== undefined) {
    if (!input.name || input.name.trim().length === 0) errors.push('watchlist name is required');
  }
  if (input.description && input.description.length > MAX_NOTES_LENGTH) errors.push('description is too long');
  return errors;
}

export function validateWatchlistItemInput(input: AddWatchlistItemRequest | UpdateWatchlistItemRequest, partial = false): string[] {
  const errors: string[] = [];
  if (!partial || 'instrumentId' in input) {
    if (!('instrumentId' in input) || !input.instrumentId || input.instrumentId.trim().length === 0) errors.push('instrumentId is required');
  }
  if (input.notes && input.notes.length > MAX_NOTES_LENGTH) errors.push('notes are too long');
  if (input.tags !== undefined) {
    if (!Array.isArray(input.tags)) errors.push('tags must be an array');
    else if (input.tags.length > MAX_TAGS || input.tags.some((tag) => typeof tag !== 'string' || tag.length > MAX_TAG_LENGTH)) errors.push('tags are invalid');
  }
  return errors;
}

export function parseSortOption(value: unknown): WatchlistSortOption {
  const candidate = Array.isArray(value) ? value[0] : value;
  return SORT_OPTIONS.includes(candidate as WatchlistSortOption) ? candidate as WatchlistSortOption : 'recentlyAdded';
}

export function getParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] : value || '';
}

export function normalizeTags(tags?: string[]): string[] {
  return [...new Set((tags || []).map((tag) => tag.trim()).filter(Boolean))];
}
