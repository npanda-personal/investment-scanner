/// <reference types="@types/jest" />
import { createAlertsMonitoringRouter } from '../../../src/modules/alerts-monitoring';

describe('alerts monitoring routes', () => {
  it('registers MVP endpoints', () => {
    const router = createAlertsMonitoringRouter({
      listRules: jest.fn(),
      createRule: jest.fn(),
      getRule: jest.fn(),
      updateRule: jest.fn(),
      deleteRule: jest.fn(),
      evaluate: jest.fn(),
      listEvents: jest.fn(),
      markRead: jest.fn(),
      dismiss: jest.fn(),
      markAllRead: jest.fn(),
      summary: jest.fn(),
    } as any);
    const routes = router.stack.filter((layer: any) => layer.route).map((layer: any) => `${Object.keys(layer.route.methods)[0].toUpperCase()} ${layer.route.path}`);
    expect(routes).toEqual([
      'GET /alerts/rules',
      'POST /alerts/rules',
      'GET /alerts/rules/:id',
      'PATCH /alerts/rules/:id',
      'DELETE /alerts/rules/:id',
      'POST /alerts/evaluate',
      'GET /alerts/events',
      'PATCH /alerts/events/:id/read',
      'PATCH /alerts/events/:id/dismiss',
      'POST /alerts/events/mark-all-read',
      'GET /alerts/summary',
    ]);
  });
});
