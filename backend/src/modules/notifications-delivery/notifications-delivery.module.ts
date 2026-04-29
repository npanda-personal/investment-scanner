import { NotificationsDeliveryController } from './notifications-delivery.controller';
import { createNotificationsDeliveryRouter } from './notifications-delivery.router';
import { NotificationsDeliveryService } from './notifications-delivery.service';

const service = new NotificationsDeliveryService();
const controller = new NotificationsDeliveryController(service);

export const notificationsDeliveryModule = {
  service,
  controller,
  router: createNotificationsDeliveryRouter(controller),
};
