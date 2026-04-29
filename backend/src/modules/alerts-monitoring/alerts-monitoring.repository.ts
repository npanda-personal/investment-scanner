import { Prisma } from '@prisma/client';
import prisma from '../../db/prisma';
import type {
  AlertEvaluationCandidate,
  AlertEventDto,
  AlertRuleDto,
  CreateAlertRuleRequest,
  UpdateAlertRuleRequest,
} from './alerts-monitoring.types';

export class AlertsMonitoringRepository {
  constructor(private readonly db = prisma) {}

  async listRules(): Promise<AlertRuleDto[]> {
    const rules = await this.db.alertRule.findMany({ orderBy: { updatedAt: 'desc' } });
    return rules.map(this.toRuleDto);
  }

  async enabledRules(): Promise<AlertRuleDto[]> {
    const rules = await this.db.alertRule.findMany({ where: { enabled: true }, orderBy: { updatedAt: 'desc' } });
    return rules.map(this.toRuleDto);
  }

  async getRule(id: string): Promise<AlertRuleDto | null> {
    const rule = await this.db.alertRule.findUnique({ where: { id } });
    return rule ? this.toRuleDto(rule) : null;
  }

  async createRule(input: CreateAlertRuleRequest): Promise<AlertRuleDto> {
    const rule = await this.db.alertRule.create({
      data: {
        name: input.name.trim(),
        userId: 'default-user',
        type: input.type,
        scope: input.scope,
        instrumentId: input.instrumentId ?? null,
        portfolioId: input.portfolioId ?? null,
        watchlistId: input.watchlistId ?? null,
        condition: input.condition as unknown as Prisma.InputJsonValue,
        enabled: input.enabled ?? true,
      },
    });
    return this.toRuleDto(rule);
  }

  async updateRule(id: string, input: UpdateAlertRuleRequest): Promise<AlertRuleDto> {
    const rule = await this.db.alertRule.update({
      where: { id },
      data: {
        name: input.name?.trim(),
        type: input.type,
        scope: input.scope,
        instrumentId: input.instrumentId,
        portfolioId: input.portfolioId,
        watchlistId: input.watchlistId,
        condition: input.condition as unknown as Prisma.InputJsonValue | undefined,
        enabled: input.enabled,
      },
    });
    return this.toRuleDto(rule);
  }

  async deleteRule(id: string): Promise<void> {
    await this.db.alertRule.delete({ where: { id } });
  }

  async hasActiveDuplicate(ruleId: string, metadata: Record<string, unknown>): Promise<boolean> {
    const existing = await this.db.alertEvent.findFirst({
      where: { alertRuleId: ruleId, readAt: null, dismissedAt: null },
      orderBy: { triggeredAt: 'desc' },
    });
    return existing ? JSON.stringify(existing.metadata) === JSON.stringify(metadata) : false;
  }

  async createEvent(rule: AlertRuleDto, candidate: AlertEvaluationCandidate): Promise<AlertEventDto> {
    const event = await this.db.alertEvent.create({
      data: {
        alertRuleId: rule.id,
        type: candidate.type,
        severity: candidate.severity,
        title: candidate.title,
        message: candidate.message,
        instrumentId: candidate.instrumentId ?? rule.instrumentId,
        portfolioId: candidate.portfolioId ?? rule.portfolioId,
        watchlistId: candidate.watchlistId ?? rule.watchlistId,
        metadata: candidate.metadata as Prisma.InputJsonValue,
      },
    });
    return this.toEventDto(event);
  }

  async listEvents(): Promise<AlertEventDto[]> {
    const events = await this.db.alertEvent.findMany({ orderBy: { triggeredAt: 'desc' }, take: 200 });
    return events.map(this.toEventDto);
  }

  async markRead(id: string): Promise<AlertEventDto> {
    const event = await this.db.alertEvent.update({ where: { id }, data: { readAt: new Date() } });
    return this.toEventDto(event);
  }

  async dismiss(id: string): Promise<AlertEventDto> {
    const event = await this.db.alertEvent.update({ where: { id }, data: { dismissedAt: new Date(), readAt: new Date() } });
    return this.toEventDto(event);
  }

  async markAllRead(): Promise<{ updated: number }> {
    const result = await this.db.alertEvent.updateMany({ where: { readAt: null, dismissedAt: null }, data: { readAt: new Date() } });
    return { updated: result.count };
  }

  private toRuleDto(record: any): AlertRuleDto {
    return {
      id: record.id,
      name: record.name,
      type: record.type,
      scope: record.scope,
      instrumentId: record.instrumentId,
      portfolioId: record.portfolioId,
      watchlistId: record.watchlistId,
      condition: record.condition || {},
      enabled: record.enabled,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  private toEventDto(record: any): AlertEventDto {
    return {
      id: record.id,
      alertRuleId: record.alertRuleId,
      type: record.type,
      severity: record.severity,
      title: record.title,
      message: record.message,
      instrumentId: record.instrumentId,
      portfolioId: record.portfolioId,
      watchlistId: record.watchlistId,
      metadata: record.metadata || {},
      triggeredAt: record.triggeredAt.toISOString(),
      readAt: record.readAt ? record.readAt.toISOString() : null,
      dismissedAt: record.dismissedAt ? record.dismissedAt.toISOString() : null,
    };
  }
}
