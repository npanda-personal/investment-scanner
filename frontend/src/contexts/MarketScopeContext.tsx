import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type MarketRegion = 'IN' | 'US' | 'EU' | 'GLOBAL';

export type AssetType = 'STOCK' | 'ETF' | 'CRYPTO' | 'COMMODITY' | 'FOREX' | 'INDEX' | 'FUND';

export interface MarketScope {
  region: MarketRegion;
  assetType: AssetType;
}

interface MarketScopeContextType {
  scope: MarketScope;
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

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(scope));
  }, [scope]);

  const setRegion = useCallback((region: MarketRegion) => {
    setScope(prev => ({ ...prev, region }));
  }, []);

  const setAssetType = useCallback((assetType: AssetType) => {
    setScope(prev => ({ ...prev, assetType }));
  }, []);

  const resetMarketScope = useCallback(() => {
    setScope(DEFAULT_SCOPE);
  }, []);

  return (
    <MarketScopeContext.Provider value={{ scope, setRegion, setAssetType, resetMarketScope }}>
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
