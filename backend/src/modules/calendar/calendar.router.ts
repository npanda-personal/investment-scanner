import { Router } from 'express';
import { CalendarController } from './calendar.controller';

export function createCalendarRouter(controller = new CalendarController()) {
  const router = Router();
  router.get('/calendar', controller.latest);
  router.post('/calendar/refresh', controller.refresh);
  return router;
}

export const calendarRouter = createCalendarRouter();
export default calendarRouter;
