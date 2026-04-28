/// <reference types="@types/jest" />
import {
  parseSortOption,
  validateWatchlistInput,
  validateWatchlistItemInput,
} from '../../../src/modules/watchlist-management';

describe('watchlist management validation', () => {
  it('requires watchlist name', () => {
    expect(validateWatchlistInput({ name: '' })).toEqual(['watchlist name is required']);
  });

  it('requires instrument when adding item', () => {
    expect(validateWatchlistItemInput({ instrumentId: '', tags: ['core'] })).toEqual(['instrumentId is required']);
  });

  it('normalizes invalid sort to recently added', () => {
    expect(parseSortOption('signalScoreDesc')).toBe('signalScoreDesc');
    expect(parseSortOption('unknown')).toBe('recentlyAdded');
  });
});
