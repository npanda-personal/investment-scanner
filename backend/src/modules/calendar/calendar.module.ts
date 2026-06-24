import { CalendarService } from './calendar.service';
import { createCalendarRouter } from './calendar.router';

export const calendarModule = {
  service: new CalendarService(),
  router: createCalendarRouter(),
};
