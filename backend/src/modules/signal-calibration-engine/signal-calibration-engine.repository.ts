import type { Prisma } from '@prisma/client';
import prisma from '../../db/prisma';
import type { CalibrationQuery, SignalCalibrationResultDto } from './signal-calibration-engine.types';

export class SignalCalibrationEngineRepository {
  constructor(private readonly db = prisma) {}

  async create(result: SignalCalibrationResultDto): Promise<SignalCalibrationResultDto> {
    const created = await this.db.signalCalibrationResult.create({
      data: {
        signalResultId: result.signalResultId,
        instrumentId: result.instrumentId,
        symbol: result.symbol,
        companyName: result.companyName,
        sector: result.sector,
        country: result.country,
        rawScore: result.rawScore,
        calibratedScore: result.calibratedScore,
        scoreDelta: result.scoreDelta,
        rawDirection: result.rawDirection,
        calibratedDirection: result.calibratedDirection,
        rawConfidence: result.rawConfidence,
        calibratedConfidence: result.calibratedConfidence,
        boosts: result.boosts as unknown as Prisma.InputJsonValue,
        penalties: result.penalties as unknown as Prisma.InputJsonValue,
        calibrationReasons: result.calibrationReasons as unknown as Prisma.InputJsonValue,
        dataGaps: result.dataGaps as unknown as Prisma.InputJsonValue,
        calibrationModelVersion: result.calibrationModelVersion,
        rawSignalModelVersion: result.rawSignalModelVersion,
        generatedAt: new Date(result.generatedAt),
      },
    });
    return this.toDto(created);
  }

  async latestForInstrument(instrumentId: string): Promise<SignalCalibrationResultDto | null> {
    const result = await this.db.signalCalibrationResult.findFirst({
      where: { instrumentId },
      orderBy: { generatedAt: 'desc' },
    });
    return result ? this.toDto(result) : null;
  }

  async top(query: CalibrationQuery): Promise<SignalCalibrationResultDto[]> {
    const rows = await this.db.signalCalibrationResult.findMany({
      where: {
        calibratedDirection: query.direction,
        calibratedScore: query.minScore !== undefined ? { gte: query.minScore } : undefined,
        sector: query.sector ? { equals: query.sector, mode: 'insensitive' } : undefined,
        country: query.country ? { equals: query.country, mode: 'insensitive' } : undefined,
      },
      orderBy: [{ generatedAt: 'desc' }, { calibratedScore: 'desc' }],
      take: Math.max(query.limit * 5, query.limit),
    });
    const latest = new Map<string, SignalCalibrationResultDto>();
    for (const dto of rows.map((row) => this.toDto(row))) {
      if (!latest.has(dto.instrumentId)) latest.set(dto.instrumentId, dto);
      if (latest.size >= query.limit) break;
    }
    return [...latest.values()].sort((a, b) => b.calibratedScore - a.calibratedScore);
  }

  async count() {
    const [total, latest] = await Promise.all([
      this.db.signalCalibrationResult.count(),
      this.db.signalCalibrationResult.findFirst({ orderBy: { generatedAt: 'desc' } }),
    ]);
    return { total, latestGeneratedAt: latest?.generatedAt ?? null };
  }

  private toDto(row: any): SignalCalibrationResultDto {
    return {
      id: row.id,
      signalResultId: row.signalResultId,
      instrumentId: row.instrumentId,
      symbol: row.symbol,
      companyName: row.companyName,
      sector: row.sector,
      country: row.country,
      rawScore: row.rawScore,
      calibratedScore: row.calibratedScore,
      scoreDelta: row.scoreDelta,
      rawDirection: row.rawDirection,
      calibratedDirection: row.calibratedDirection,
      rawConfidence: row.rawConfidence,
      calibratedConfidence: row.calibratedConfidence,
      boosts: Array.isArray(row.boosts) ? row.boosts : [],
      penalties: Array.isArray(row.penalties) ? row.penalties : [],
      calibrationReasons: Array.isArray(row.calibrationReasons) ? row.calibrationReasons : [],
      dataGaps: Array.isArray(row.dataGaps) ? row.dataGaps : [],
      calibrationModelVersion: row.calibrationModelVersion,
      rawSignalModelVersion: row.rawSignalModelVersion,
      generatedAt: row.generatedAt.toISOString(),
      dataStatus: row.dataGaps?.length ? 'PARTIAL' : 'COMPLETE',
      researchUrl: `/research/stocks/${row.instrumentId}`,
    };
  }
}
