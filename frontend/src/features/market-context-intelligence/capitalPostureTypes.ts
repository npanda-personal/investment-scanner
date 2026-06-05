export type PostureLabel = 'RISK_ON' | 'NEUTRAL' | 'RISK_OFF';
export type PostureAction = 'DEPLOY' | 'HOLD' | 'RAISE_CASH' | 'STAY_OUT';

export interface CapitalPostureDto {
  availability: 'READY' | 'UNAVAILABLE';
  scope: { region: string };
  postureLabel: PostureLabel | null;
  suggestedExposureBand: { minPct: number; maxPct: number } | null;
  action: PostureAction | null;
  evidence: unknown;
  regimeGate: unknown | null;
  assembledAt: string;
  message: string;
}
