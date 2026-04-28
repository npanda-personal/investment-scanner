import { AlertsMonitoringController } from './alerts-monitoring.controller';
import { AlertsMonitoringRepository } from './alerts-monitoring.repository';
import { alertsMonitoringRouter } from './alerts-monitoring.router';
import { AlertsMonitoringService } from './alerts-monitoring.service';

export const alertsMonitoringModule = {
  name: 'alerts-monitoring',
  router: alertsMonitoringRouter,
  controller: AlertsMonitoringController,
  service: AlertsMonitoringService,
  repository: AlertsMonitoringRepository,
};
