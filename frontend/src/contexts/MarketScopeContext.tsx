import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { resolveUiMarketProfile, type UiMarketProfile } from '../shared/marketProfile';

export type MarketRegion = 'IN' | 'US' | 'EU' | 'GLOBAL';

export type AssetType = 'STOCK' | 'ETF' | 'CRYPTO' | 'COMMODITY' | 'FOREX' | 'INDEX' | 'FUND';

export interface MarketScope {
  region: MarketRegion;
  assetType: AssetType;
}

interface MarketScopeContextType {
  scope: MarketScope;
  /** Derived per-asset-class capability profile for graceful degradation. */
  profile: UiMarketProfile;
  setRegion: (region: MarketRegion) => void;
  setAssetType: (assetType: AssetType) => void;
  resetMarketScope: () => void;
}

const DEFAULT_SCOPE: MarketScope = {
  region: 'IN',
  assetType: 'STOCK',
};

const MarketScopeContext = createContext<MarketScopeContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'market_scope';

export const MarketScopeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [scope, setScope] = useState<MarketScope>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse market scope from localStorage', e);
      }
    }
    return DEFAULT_SCOPE;
  });

  // Persist SYNCHRONOUSLY inside the state updater (not a useEffect) so that
  // localStorage is current BEFORE any child component's data-fetch effect fires.
  // The global axios interceptor reads localStorage at request time; without this,
  // the first refetch after a market switch would race the effect and query the
  // previous region (causing wrong-context / empty data on the first load).
  const persist = (next: MarketScope): MarketScope => {
    try { localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
    return next;
  };

  // Keep localStorage in sync on mount (init reads it; this is a harmless no-op resync).
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(scope));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setRegion = useCallback((region: MarketRegion) => {
    setScope(prev => persist({ ...prev, region }));
  }, []);

  const setAssetType = useCallback((assetType: AssetType) => {
    setScope(prev => {
      // Crypto is a single GLOBAL plane — force region to GLOBAL when switching to crypto,
      // and restore IN when switching back to a regional asset class from crypto.
      if (assetType === 'CRYPTO') return persist({ region: 'GLOBAL', assetType });
      if (prev.assetType === 'CRYPTO' && prev.region === 'GLOBAL') return persist({ region: 'IN', assetType });
      return persist({ ...prev, assetType });
    });
  }, []);

  const resetMarketScope = useCallback(() => {
    setScope(persist(DEFAULT_SCOPE));
  }, []);

  const profile = useMemo(() => resolveUiMarketProfile(scope), [scope]);

  return (
    <MarketScopeContext.Provider value={{ scope, profile, setRegion, setAssetType, resetMarketScope }}>
      {children}
    </MarketScopeContext.Provider>
  );
};

export const useMarketScope = () => {
  const context = useContext(MarketScopeContext);
  if (context === undefined) {
    throw new Error('useMarketScope must be used within a MarketScopeProvider');
  }
  return context;
};
