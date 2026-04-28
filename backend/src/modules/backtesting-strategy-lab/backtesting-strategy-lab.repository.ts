import { Prisma } from '@prisma/client';
import prisma from '../../db/prisma';
import type {
  BacktestRunDto,
  BacktestStrategyDto,
  CreateBacktestStrategyRequest,
  UpdateBacktestStrategyRequest,
} from './backtesting-strategy-lab.types';

export class BacktestingStrategyLabRepository {
  constructor(private readonly db = prisma) {}

  async listStrategies(): Promise<BacktestStrategyDto[]> {
    const rows = await this.db.backtestStrategy.findMany({ orderBy: { updatedAt: 'desc' } });
    return rows.map(this.toStrategyDto);
  }

  async createStrategy(input: CreateBacktestStrategyRequest): Promise<BacktestStrategyDto> {
    const row = await this.db.backtestStrategy.create({
      data: { name: input.name.trim(), description: input.description ?? null, config: input.config as unknown as Prisma.InputJsonValue },
    });
    return this.toStrategyDto(row);
  }

  async getStrategy(id: string): Promise<BacktestStrategyDto | null> {
    const row = await this.db.backtestStrategy.findUnique({ where: { id } });
    return row ? this.toStrategyDto(row) : null;
  }

  async updateStrategy(id: string, input: UpdateBacktestStrategyRequest): Promise<BacktestStrategyDto> {
    const row = await this.db.backtestStrategy.update({
      where: { id },
      data: {
        name: input.name?.trim(),
        description: input.description,
        config: input.config as unknown as Prisma.InputJsonValue | undefined,
      },
    });
    return this.toStrategyDto(row);
  }

  async deleteStrategy(id: string): Promise<void> {
    await this.db.backtestStrategy.delete({ where: { id } });
  }

  async createRun(data: Omit<BacktestRunDto, 'id' | 'startedAt'>): Promise<BacktestRunDto> {
    const row = await this.db.backtestRun.create({
      data: {
        strategyId: data.strategyId,
        config: data.config as unknown as Prisma.InputJsonValue,
        status: data.status,
        completedAt: data.completedAt ? new Date(data.completedAt) : null,
        metrics: data.metrics as unknown as Prisma.InputJsonValue,
        equityCurve: data.equityCurve as unknown as Prisma.InputJsonValue,
        trades: data.trades as unknown as Prisma.InputJsonValue,
        error: data.error,
      },
    });
    return this.toRunDto(row);
  }

  async listRuns(): Promise<BacktestRunDto[]> {
    const rows = await this.db.backtestRun.findMany({ orderBy: { startedAt: 'desc' }, take: 100 });
    return rows.map(this.toRunDto);
  }

  async getRun(id: string): Promise<BacktestRunDto | null> {
    const row = await this.db.backtestRun.findUnique({ where: { id } });
    return row ? this.toRunDto(row) : null;
  }

  async deleteRun(id: string): Promise<void> {
    await this.db.backtestRun.delete({ where: { id } });
  }

  private toStrategyDto(row: any): BacktestStrategyDto {
    return { id: row.id, name: row.name, description: row.description, config: row.config, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
  }

  private toRunDto(row: any): BacktestRunDto {
    return {
      id: row.id,
      strategyId: row.strategyId,
      config: row.config,
      status: row.status,
      startedAt: row.startedAt.toISOString(),
      completedAt: row.completedAt ? row.completedAt.toISOString() : null,
      metrics: row.metrics,
      equityCurve: Array.isArray(row.equityCurve) ? row.equityCurve : [],
      trades: Array.isArray(row.trades) ? row.trades : [],
      error: row.error,
    };
  }
}
