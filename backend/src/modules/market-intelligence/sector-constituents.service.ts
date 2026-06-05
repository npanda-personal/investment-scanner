import { SectorConstituentsRepository, type SectorConstituentRow } from './sector-constituents.repository';

export interface SectorConstituentsEnvelope {
  availability: 'READY' | 'EMPTY' | 'INVALID_PARAMS' | 'ERROR';
  sector: string;
  region: string;
  assetType: string;
  constituents: SectorConstituentRow[];
  count: number;
  message: string;
  warnings: string[];
}

export class SectorConstituentsService {
  constructor(private readonly repository = new SectorConstituentsRepository()) {}

  async constituentsForSector(query: {
    sector?: string | null;
    region?: string | null;
    assetType?: string | null;
  }): Promise<SectorConstituentsEnvelope> {
    const sector = typeof query.sector === 'string' ? query.sector.trim() : '';
    const region = typeof query.region === 'string' ? query.region.trim().toUpperCase() : 'IN';
    const assetType = typeof query.assetType === 'string' ? query.assetType.trim().toUpperCase() : 'STOCK';

    if (!sector) {
      return {
        availability: 'INVALID_PARAMS',
        sector,
        region,
        assetType,
        constituents: [],
        count: 0,
        message: 'sector query parameter is required.',
        warnings: ['Provide ?sector=<sector-name> to load constituents.'],
      };
    }

    const constituents = await this.repository.constituentsForSector({ sector, region, assetType });

    if (constituents.length === 0) {
      return {
        availability: 'EMPTY',
        sector,
        region,
        assetType,
        constituents: [],
        count: 0,
        message: `No active mainboard instruments found for sector "${sector}" in ${region}/${assetType}.`,
        warnings: ['Sector may not match catalog values. Try the exact sector name as stored in the instruments catalog.'],
      };
    }

    const warnings: string[] = [];
    const missingPrice = constituents.filter((c) => c.latestPrice === null).length;
    if (missingPrice > 0) {
      warnings.push(`${missingPrice} of ${constituents.length} constituents have no latest price in catalog.`);
    }
    const missingReturn = constituents.filter((c) => c.return1M === null).length;
    if (missingReturn > 0) {
      warnings.push(`${missingReturn} of ${constituents.length} constituents have insufficient price history for 1M return.`);
    }

    return {
      availability: 'READY',
      sector,
      region,
      assetType,
      constituents,
      count: constituents.length,
      message: `Loaded ${constituents.length} constituent stocks for sector "${sector}" (top by market cap, max 30).`,
      warnings,
    };
  }
}
